# Frontend Tests Guide

## Setup

```bash
cd /home/wsl/sistemas/casemento_frontend-

# Instalar dependências de teste (uma única vez)
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Ou, se houver problemas de peer dependencies:
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom --legacy-peer-deps
```

## Rodar Testes

```bash
# Executar todos os testes uma vez
npm run test

# Modo watch (reexecuta ao salvar arquivos)
npm run test:watch

# Com coverage report
npm run test:coverage
```

## Testes Inclusos

### 1. Utilitários: `src/__tests__/utils/phoneMask.test.ts`

Testa a máscara de telefone brasileira:
- ✅ `maskPhone('11987654321')` → `'(11) 98765-4321'`
- ✅ `unmaskPhone('(11) 98765-4321')` → `'11987654321'`
- ✅ `isPhoneLengthValid('11987654321')` → `true`
- ✅ Validação de comprimento (11 dígitos exatamente)

### 2. API Client: `src/__tests__/api/partyApi.test.ts`

Testa chamadas HTTP para endpoints de party management:
- ✅ `listPartyMembers()` - GET /api/v1/me/party
- ✅ `addPartyMember(request)` - POST /api/v1/me/party
- ✅ `confirmPartyMemberRsvp(guestId, status)` - PUT /api/v1/me/party/{guestId}/rsvp
- ✅ `removePartyMember(guestId)` - DELETE /api/v1/me/party/{guestId}
- ✅ Error handling (validação, conflitos)

**Obs:** Testes mockam axios - não requerem backend rodando.

### 3. Componentes: `src/__tests__/pages/PartyPage.test.tsx` (OPCIONAL)

Testa a interface principal PartyPage:
- ✅ Renderização da página
- ✅ Formulários (adicionar criança/adulto)
- ✅ Máscara telefônica em tempo real
- ✅ Validações de nome e telefone
- ✅ Confirmação de RSVP
- ✅ Remoção de membros
- ✅ Estados de loading e erro

**Nota:** Componente testing requer setup mais complexo com mocks de React Query, rotas, etc.

## Testes Manuais (Recomendado para desenvolvimento)

```bash
# Terminal 1: Backend
cd /home/wsl/sistemas/casamento_backend
./mvnw quarkus:dev
# Aguarde: "Listening on: http://0.0.0.0:8080"

# Terminal 2: Frontend
cd /home/wsl/sistemas/casemento_frontend-
npm run dev
# Acesse http://localhost:5173

# Browser:
# 1. Ir a /save-the-date
# 2. Registrar com telefone: 11987654321
# 3. Ir a /minha-familia
# 4. Testar adicionar criança/adulto/confirmar RSVP/remover
```

## Estrutura de Testes

```
src/
├── __tests__/
│   ├── api/
│   │   └── partyApi.test.ts
│   ├── utils/
│   │   └── phoneMask.test.ts
│   └── pages/
│       └── PartyPage.test.tsx (opcional)
├── api/
│   └── partyApi.ts
├── utils/
│   └── phoneMask.ts
└── pages/
    └── guest/
        └── PartyPage.tsx
```

## Debugging de Testes

```bash
# Ver saída detalhada
npm run test -- --reporter=verbose

# Rodar um teste específico
npm run test -- phoneMask.test.ts

# Rodar testes que match a pattern
npm run test -- --grep="should add child"

# Com debugger (Node inspector)
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

## CI/CD Integration

### GitHub Actions

Criar `.github/workflows/frontend-test.yml`:

```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd /home/wsl/sistemas/casemento_frontend- && npm ci && npm run test
      - run: npm run build
```

## Próximos Passos

1. ✅ Setup vitest + dependencies
2. ✅ Criar testes de utils e API
3. ⏳ Criar testes de componentes (PartyPage)
4. ⏳ Integrar coverage no CI/CD
5. ⏳ Target 80%+ coverage

## Troubleshooting

### npm install falha

```bash
# Usar --legacy-peer-deps
npm install --legacy-peer-deps

# Ou limpar cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Testes timeoutam

Aumentar timeout (padrão 10s):

```bash
npm run test -- --testTimeout=30000
```

### Imports com alias (@/) não funcionam

Verificar `vitest.config.ts` tem resolve.alias configurado.

## Referências

- [Vitest Docs](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest-DOM Matchers](https://github.com/testing-library/jest-dom)
