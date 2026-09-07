# Media Upload & Gallery Update — Upload Direto R2 + Galeria Thumb-First

**Data:** 2026-09-06
**Impacto:** Upload de fotos/vídeos do convidado (`MediaComposer`/`MediaCaptureBar`), tipos de `MediaItem`, grid e fullscreen da galeria (`GalleryPage`)

---

## Estado atual: upload direto e privado

O fluxo multipart `POST /api/v1/media/upload` foi substituído no frontend pelo fluxo abaixo. O endpoint antigo fica apenas como compatibilidade temporária e não deve ser usado por novas telas.

1. `POST /api/v1/media/upload-intents`, com `Idempotency-Key`, nome, MIME e tamanho do arquivo.
2. O backend retorna uma URL `PUT` temporária do R2.
3. O navegador envia o arquivo diretamente ao R2 e mostra o percentual de progresso.
4. `POST /api/v1/media/upload-intents/{mediaId}/complete` verifica tamanho, MIME e assinatura do arquivo antes de publicar a mídia.

O R2 deve estar privado. A URL devolvida na galeria é assinada pelo backend e entregue pelo Worker em `deploy/cloudflare/media-worker/`; consulte `R2_SETUP.md` no backend antes de publicar.

### Formatos atuais

- Fotos: JPEG, PNG, HEIC e HEIF, até 10 MB.
- Vídeos: somente MP4, até 200 MB e 60 segundos.

MOV e WebM deixaram de ser aceitos porque não há mais transcodificação na VPS de 2 vCPU/2 GB. Um MP4 com codec incompatível ainda pode falhar na reprodução: o formato recomendado é H.264 para vídeo e AAC para áudio.

Variantes de foto e pôsteres de vídeo são gerados por uma fila persistente e serial depois da publicação. Enquanto o pôster de um vídeo está pendente, a grade mostra o cartão com ícone de reprodução sem baixar o MP4 completo.

---

## Resumo

O upload de mídia dos convidados parou de funcionar por **dois bugs independentes no frontend** (o backend estava e continua correto, validado nesta sessão com testes automatizados e manuais). Além disso, a galeria carregava o arquivo original (foto ou vídeo completo) tanto no grid quanto no fullscreen, o que é o oposto de uma experiência rápida estilo Instagram/TikTok. Ambos os problemas foram corrigidos.

## 1. Bugs corrigidos no upload

### 1.1 `crypto.randomUUID` chamado sem o `this` correto (bloqueava o seletor de arquivo)

Em `src/utils/mediaTelemetry.ts`, `createId()` desestruturava `crypto.randomUUID` e o chamava solto:

```ts
const randomUuid = globalThis.crypto?.randomUUID;
randomUuid(); // TypeError: Illegal invocation
```

Isso lançava uma exceção **antes** de `input.click()` em `MediaCaptureBar.openPicker()`, ou seja, o seletor de arquivo nunca chegava a abrir ao tocar em "Fotografar", "Gravar vídeo" ou "Galeria". Esse era o sintoma relatado ("parou de transferir para upload").

**Correção:** chamar o método diretamente no objeto `crypto`, preservando o `this`:

```ts
const cryptoObj = globalThis.crypto;
const id = cryptoObj?.randomUUID
  ? cryptoObj.randomUUID()
  : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
```

### 1.2 `Content-Type` incorreto na requisição multipart (upload rejeitado com `415`)

Em `src/api/mediaApi.ts`, `uploadMedia()` enviava `FormData` através do `guestClient`, cuja instância Axios define `Content-Type: application/json` como header padrão. Como o Axios só define automaticamente o `Content-Type` multipart (com `boundary`) quando **nenhum** header de Content-Type já está presente, o header padrão da instância "vazava" para a requisição de upload, fazendo o backend rejeitar com `415 Unsupported Media Type` ("The content-type header value did not match the value in @Consumes").

**Correção:** anular explicitamente o header nesta chamada, para que o navegador defina `multipart/form-data; boundary=...` automaticamente:

```ts
const { data } = await guestClient.post<MediaItem>('/media/upload', form, {
  headers: { 'Content-Type': undefined },
  timeout: 600_000,
});
```

### Validação realizada

- Testes diretos no backend (`curl` multipart) confirmaram que o endpoint `POST /api/v1/media/upload` sempre funcionou corretamente.
- Reprodução do bug real no navegador (Playwright): antes da correção, o clique em "Galeria" lançava `Illegal invocation` e nada acontecia; após corrigir `mediaTelemetry.ts`, o seletor abria mas o upload retornava `415`; após corrigir o `Content-Type`, o upload retornou sucesso e o item apareceu na galeria e foi confirmado via `GET /api/v1/media`.
- `tsc -b && vite build` e `eslint` passaram sem erros após as mudanças.

---

## 2. Galeria thumb-first (grid leve, mídia real só em foco/fullscreen)

O backend já gera variantes leves para **fotos e vídeos**:

| Campo | Descrição | Geração |
|---|---|---|
| `thumbnailUrl` | JPEG ~400px, qualidade 0.75 | `MediaVariantService.generatePhotoVariants()` (fotos) / `generateVideoPoster()` (pôster do vídeo via ffmpeg embarcado) |
| `displayUrl` | JPEG ~1600px, qualidade 0.82 | mesma geração acima |
| `url` | Arquivo original (foto ou vídeo completo) | upload direto |

O frontend ignorava `displayUrl` e usava `item.url` (arquivo completo) tanto no grid de vídeo quanto no fullscreen de foto/vídeo — baixando o arquivo bruto onde um thumbnail já bastava.

### Mudança de estratégia (`src/pages/guest/GalleryPage.tsx`)

| Local | Antes | Depois |
|---|---|---|
| Grid — foto | `thumbnailUrl \|\| url` | `thumbnailUrl \|\| displayUrl \|\| url` (fallback extra) |
| Grid — vídeo | `<video src={item.url}>` (baixava o vídeo inteiro) | `<img src={thumbnailUrl \|\| displayUrl \|\| url}>` (pôster leve, mesmo padrão da foto) |
| Fullscreen — foto | `src={item.url}` (original bruto) | `src={item.displayUrl \|\| item.url}` (~1600px, muito mais leve) |
| Fullscreen — vídeo | `src={item.url}` sem poster | `src={item.url}` + `poster={item.thumbnailUrl \|\| item.displayUrl}` (pôster instantâneo enquanto o vídeo carrega) |

O carregamento "só a mídia real quando em foco" já era parcialmente resolvido pela lógica existente de `shouldMountMedia`/`visibleReelIds` no viewer (só monta `<img>`/`<video>` dos itens próximos ao ativo). A mudança acima remove o único ponto que ainda forçava o download do arquivo original no grid.

### Decisão de produto

Fullscreen de foto usa `displayUrl` (boa qualidade, ~1600px) como a "mídia real" — não o arquivo bruto original (que pode ser HEIC ou várias MB). Uma ação futura de "ver/baixar original" pode ser adicionada separadamente, se necessário; não foi implementada agora.

Vídeo sempre precisa do arquivo real para reprodução em fullscreen — o ganho de performance vem do `poster` leve e, principalmente, de não carregar mais o vídeo inteiro apenas para exibir uma miniatura no grid.

---

## 3. Alinhamento de tipos `MediaItem` com o backend (`src/api/mediaApi.ts`)

| Campo | Antes | Depois |
|---|---|---|
| `displayUrl` | Inexistente | Adicionado: `string \| null` |
| `displayName` | Existia, mas o backend nunca envia esse campo | Removido; nome do autor usa `guestName` |
| `status`, `contentType`, `fileSizeBytes`, `guestId`, `guestName` | Opcionais (`?`) | Obrigatórios, pois o backend sempre os retorna |

`mediaGuestName()` em `GalleryPage.tsx` foi ajustado para não depender mais de `item.displayName` (campo inexistente na resposta real da API).

---

## 4. Observação para follow-up (fora de escopo desta correção)

Ao validar em produção, foi observado que pelo menos um item de mídia já existente tem `thumbnailUrl`/`displayUrl` nulos apesar de ter mais de 2 MB — provavelmente um upload anterior a este bugfix, ou um caso em que a geração de variante falhou silenciosamente (comportamento de degradação graciosa já existente no backend). O endpoint `POST /api/v1/admin/media/backfill-variants` (se existente) ou equivalente pode ser usado para gerar variantes retroativamente; não foi acionado nesta sessão por estar fora do escopo pedido.

---

## Arquivos alterados

- `src/utils/mediaTelemetry.ts` — correção do `crypto.randomUUID`.
- `src/api/mediaApi.ts` — correção do `Content-Type` do upload; tipos de `MediaItem`.
- `src/pages/guest/GalleryPage.tsx` — grid e fullscreen thumb-first; `mediaGuestName()`.

Nenhuma mudança foi feita no backend (`casamento_backend`) — a geração de variantes, o endpoint de upload e o formato de resposta já estavam corretos.
