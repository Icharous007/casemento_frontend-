# Deploy — Frontend Casamento na LocalWeb

**Projeto:** casemento_frontend- (React + Vite + TypeScript)  
**Tipo de deploy:** SPA (Single Page Application) — arquivos estáticos  
**Data:** 2026-07-13

---

## 1. Resumo da Arquitetura (Single-VM)

```
┌────────────────────┐         HTTPS         ┌──────────────────────────────────────┐
│  Browser (Guest)   │ ◄───────────────────► │  VPS LocalWeb (Ubuntu + Nginx)       │
└────────────────────┘                        │                                      │
                                              │  :443 ─► Nginx                       │
                                              │    ├── /           → dist/ (SPA)     │
                                              │    ├── /api/       → proxy :8080     │
                                              │    └── /assets/    → cache imutável  │
                                              │                                      │
                                              │  :8080 ─► Java/Quarkus (backend)     │
                                              │              └── PostgreSQL :5432     │
                                              └──────────────────────────────────────┘
```

Tudo roda numa **única VPS**: Nginx serve o SPA e faz proxy reverso para a API Java na mesma máquina. O PostgreSQL também fica local. A porta 8080 nunca é exposta externamente.

---

## 2. Opções de Hospedagem na LocalWeb

| Plano | Indicado para | Observação |
|-------|---------------|------------|
| **Hospedagem de Sites (shared)** | MVP / tráfego baixo | Apache + `.htaccess` é suficiente |
| **VPS Linux** | Produção com controle total | Nginx + SSL + proxy reverso para API |
| **Cloud Server** | Alta disponibilidade | Mesmo que VPS com auto-scaling |

**Recomendação:** Uma única **VPS Linux** com **2 vCPU / 4 GB RAM / 50 GB SSD** hospedando frontend (Nginx) + backend (Java/Quarkus) na mesma máquina. Isso elimina latência de rede entre front e API, simplifica o deploy e o custo é ~R$70-100/mês.

> **Por que não separar?** Para um evento com ~500 convidados e picos concentrados (envio de convites, dia do evento), uma única VM é mais que suficiente. O backend Java consome ~512 MB–1 GB de heap; o Nginx serve estáticos com <50 MB. Separar só se justifica para plataforma multi-evento com milhares de usuários simultâneos.

---

## 3. Pré-requisitos de Build

### 3.1 Variáveis de ambiente (`.env.production`)

Como frontend e backend estão no mesmo domínio (proxy reverso), usar caminho relativo:

```env
VITE_API_BASE_URL=/api/v1
```

> Isso faz as chamadas irem para `https://seudominio.com.br/api/v1/...` automaticamente — sem CORS, sem configuração extra.

### 3.2 Gerar o build

```bash
pnpm install --frozen-lockfile
pnpm build
```

Saída: pasta `dist/` com `index.html` + assets estáticos.

### 3.3 Testar localmente

```bash
pnpm preview
```

---

## 4. Configuração — Hospedagem Compartilhada (Apache)

### 4.1 Upload

1. Acesse o painel cPanel da LocalWeb.
2. No **Gerenciador de Arquivos**, navegue até `public_html/` (ou subdomínio).
3. Faça upload de **todo o conteúdo** da pasta `dist/` para a raiz do domínio.

### 4.2 `.htaccess` (SPA fallback + cache)

Criar o arquivo `public_html/.htaccess`:

```apache
# ─── SPA: redirecionar todas as rotas para index.html ─────────────────────────
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Não reescrever arquivos e diretórios existentes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Redirecionar tudo para index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# ─── Cache de assets (JS, CSS, imagens) ───────────────────────────────────────
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# ─── Compressão gzip ──────────────────────────────────────────────────────────
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

# ─── Segurança básica ─────────────────────────────────────────────────────────
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>
```

### 4.3 Proxy reverso para API (se mesmo domínio)

Se a API backend estiver em outra máquina e o plano compartilhado suportar `ProxyPass` (geralmente não), use subdomínio separado para a API. Caso contrário, configure `VITE_API_BASE_URL` apontando para o domínio da API diretamente.

---

## 5. Configuração — VPS Linux (Nginx + Backend) [Recomendado]

### 5.1 Instalar dependências no servidor

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx \
  openjdk-21-jre-headless postgresql-16 ufw
```

### 5.2 Configurar o backend Java

#### Criar usuário de serviço

```bash
sudo useradd -r -s /bin/false casamento
sudo mkdir -p /opt/casamento
sudo chown casamento:casamento /opt/casamento
```

#### Upload do JAR

```bash
# Na máquina local (após build do backend):
scp target/quarkus-app/ usuario@ip-localweb:/opt/casamento/app/
```

#### Variáveis de ambiente — `/opt/casamento/.env`

```env
QUARKUS_HTTP_PORT=8080
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/casamento
QUARKUS_DATASOURCE_USERNAME=casamento
QUARKUS_DATASOURCE_PASSWORD=<senha-segura>
APP_FRONTEND_URL=https://seudominio.com.br
APP_WHATSAPP_ENABLED=true
APP_WHATSAPP_TOKEN=<meta-token>
APP_WHATSAPP_PHONE_ID=<phone-number-id>
```

#### Systemd service — `/etc/systemd/system/casamento-api.service`

```ini
[Unit]
Description=Casamento Backend API
After=network.target postgresql.service

[Service]
User=casamento
Group=casamento
WorkingDirectory=/opt/casamento
EnvironmentFile=/opt/casamento/.env
ExecStart=/usr/bin/java -Xms256m -Xmx1024m -jar /opt/casamento/app/quarkus-run.jar
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now casamento-api
sudo journalctl -u casamento-api -f   # verificar logs
```

### 5.3 Configurar PostgreSQL

```bash
sudo -u postgres psql <<SQL
CREATE USER casamento WITH PASSWORD '<senha-segura>';
CREATE DATABASE casamento OWNER casamento;
SQL
```

### 5.4 Upload do frontend

```bash
# Na máquina local:
rsync -avz --delete dist/ usuario@ip-localweb:/var/www/casamento/

# Ou via SCP:
scp -r dist/* usuario@ip-localweb:/var/www/casamento/
```

### 5.5 Configuração Nginx (frontend + proxy para API)

Criar `/etc/nginx/sites-available/casamento`:

```nginx
# Rate limiting para proteger OTP
limit_req_zone $binary_remote_addr zone=otp:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    root /var/www/casamento;
    index index.html;

    # ─── SPA fallback ──────────────────────────────────────────────────────
    location / {
        try_files $uri $uri/ /index.html;
        limit_req zone=general burst=50 nodelay;
    }

    # ─── Cache imutável para assets com hash (Vite gera nomes únicos) ─────
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ─── Proxy reverso para API (localhost:8080) ──────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_buffering on;

        # Rate limit mais restrito nas rotas de OTP
        limit_req zone=general burst=20 nodelay;
    }

    # Rate limit específico para endpoints OTP
    location /api/v1/guest-access/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        limit_req zone=otp burst=5 nodelay;
    }

    # ─── Headers de segurança ──────────────────────────────────────────────
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # ─── Gzip ─────────────────────────────────────────────────────────────
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;
    gzip_min_length 256;
    gzip_vary on;

    # ─── Limitar upload (import CSV, fotos galeria) ───────────────────────
    client_max_body_size 20M;
}
```

Ativar e testar:

```bash
sudo ln -sf /etc/nginx/sites-available/casamento /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5.6 Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

> A porta 8080 do backend NÃO é exposta externamente — o acesso é apenas via proxy do Nginx.

### 5.7 SSL com Let's Encrypt

```bash
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

Renovação automática via systemd timer (já configurada pelo certbot).

---

## 6. CI/CD — Deploy Automatizado (GitHub Actions)

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}

      - name: Deploy via SSH
        uses: easingthemes/ssh-deploy@v5
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          REMOTE_HOST: ${{ secrets.HOST }}
          REMOTE_USER: ${{ secrets.USER }}
          SOURCE: dist/
          TARGET: /var/www/casamento/
          ARGS: "--delete"
```

### Secrets necessários no repositório GitHub:

| Secret | Valor |
|--------|-------|
| `VITE_API_BASE_URL` | `https://api.seudominio.com.br/api/v1` ou `/api/v1` |
| `SSH_KEY` | Chave privada SSH (conteúdo do arquivo `casamento-gc`) |
| `HOST` | IP ou hostname da VPS LocalWeb |
| `USER` | Usuário SSH (ex: `deploy` ou `root`) |

---

## 7. DNS — Configuração no Painel LocalWeb

Como frontend e backend estão na **mesma VPS**, só precisa de 2 registros:

| Registro | Tipo | Valor | TTL |
|----------|------|-------|-----|
| `@` | A | `<IP da VPS>` | 3600 |
| `www` | CNAME | `seudominio.com.br` | 3600 |

A API é acessada em `https://seudominio.com.br/api/v1/...` — o Nginx roteia internamente para `localhost:8080`. Não é necessário subdomínio `api.` separado.

---

## 8. Checklist Pré-Deploy

- [ ] Domínio registrado e DNS apontando para o servidor
- [ ] `.env.production` com `VITE_API_BASE_URL` correto
- [ ] Build local (`pnpm build`) sem erros nos módulos alterados
- [ ] SSL/TLS configurado (Let's Encrypt ou certificado LocalWeb)
- [ ] `.htaccess` ou Nginx configurado com SPA fallback
- [ ] CORS no backend permite o domínio do frontend
- [ ] Testar fluxo completo: `/acesso?event=<slug>` → OTP → home
- [ ] Testar painel admin: login → convidados → WhatsApp invite
- [ ] Headers de segurança ativos (verificar em securityheaders.com)
- [ ] Gzip/Brotli ativo (verificar tamanho da resposta no DevTools)
- [ ] Cache de assets imutáveis funcionando (verificar header `Cache-Control`)
- [ ] Backup do servidor configurado (snapshot semanal na LocalWeb)

---

## 9. Configuração CORS no Backend

Como frontend e API estão no **mesmo domínio** (proxy reverso), CORS **não é necessário em produção** — as requisições são same-origin.

Manter no `application.properties` apenas para ambiente de desenvolvimento local:

```properties
# application.properties
%dev.quarkus.http.cors=true
%dev.quarkus.http.cors.origins=http://localhost:5173
%dev.quarkus.http.cors.headers=Content-Type,X-Guest-Access-Token,Authorization
%dev.quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS

# Produção: desabilitado (same-origin via Nginx proxy)
quarkus.http.cors=false
```

> **Vantagem da mesma VPS:** elimina problemas de CORS, cookies cross-origin, e mixed-content.

---

## 10. Monitoramento e Manutenção

| Item | Ferramenta sugerida | Frequência |
|------|---------------------|------------|
| Uptime | UptimeRobot (free) ou LocalWeb monitoring | Contínuo |
| SSL expiração | certbot auto-renew | Automático |
| Erros JS em produção | Sentry (free tier) | Contínuo |
| Performance | Lighthouse CI no GitHub Actions | A cada deploy |
| Backup | Snapshot VPS LocalWeb | Semanal |

---

## 11. Estimativa de Recursos (Frontend + Backend na mesma VPS)

| Componente | CPU | RAM | Disco |
|------------|-----|-----|-------|
| Nginx (frontend estático) | desprezível | ~50 MB | ~3 MB (dist/) |
| Java/Quarkus (backend) | 1 vCPU pico | 512 MB–1 GB heap | ~100 MB (app + deps) |
| PostgreSQL | compartilhado | ~200 MB | ~500 MB (dados) |
| SO + logs | — | ~300 MB | ~2 GB |
| **Total** | **2 vCPU** | **~2 GB uso / 4 GB alocado** | **~5 GB usado / 50 GB disponível** |

| Métrica de tráfego | Valor estimado |
|--------------------|----------------|
| Convidados simultâneos (pico) | ~100–200 |
| Requisições/s no pico (OTP + RSVP) | ~20–50 |
| Banda mensal | < 10 GB |
| WhatsApp mensagens/dia (pico convites) | ~500 |

### Plano recomendado na LocalWeb

| Plano | Specs | Preço aprox. | Suficiente? |
|-------|-------|--------------|-------------|
| VPS Linux 2 | 2 vCPU / 2 GB / 50 GB SSD | ~R$60/mês | Mínimo viável |
| **VPS Linux 4** | **2 vCPU / 4 GB / 80 GB SSD** | **~R$90/mês** | **Recomendado** |
| VPS Linux 8 | 4 vCPU / 8 GB / 160 GB SSD | ~R$160/mês | Excesso para este caso |

> Com 4 GB: JVM fica confortável com 1 GB heap + PostgreSQL + Nginx + margem para picos no dia do evento.

---

## 12. Rollback

Em caso de problema após deploy:

### Frontend

```bash
# Backup automático antes de cada deploy (adicionar no CI/CD):
ssh usuario@ip-localweb "cp -r /var/www/casamento /var/www/casamento.bak"

# Para reverter:
ssh usuario@ip-localweb "rm -rf /var/www/casamento && mv /var/www/casamento.bak /var/www/casamento"
```

### Backend

```bash
# Manter versão anterior do JAR:
ssh usuario@ip-localweb "cp -r /opt/casamento/app /opt/casamento/app.bak"

# Para reverter:
ssh usuario@ip-localweb "rm -rf /opt/casamento/app && mv /opt/casamento/app.bak /opt/casamento/app && sudo systemctl restart casamento-api"
```

### Database

```bash
# Backup diário automático via cron:
# /etc/cron.d/casamento-db-backup
0 3 * * * casamento pg_dump casamento | gzip > /opt/casamento/backups/db-$(date +\%Y\%m\%d).sql.gz

# Reter últimos 14 dias:
0 4 * * * casamento find /opt/casamento/backups/ -mtime +14 -delete
```

Com CI/CD: reverter o commit no GitHub e o pipeline refaz o deploy automaticamente.

---

## 13. Segurança da VPS

| Item | Configuração |
|------|--------------|
| SSH | Desabilitar login root, usar chave SSH apenas (`PasswordAuthentication no`) |
| Porta SSH | Mover para porta não-padrão (ex: 2222) |
| Fail2ban | Instalar para bloquear brute-force SSH |
| Updates | `unattended-upgrades` para patches de segurança |
| Backup | Snapshot semanal no painel LocalWeb + dump diário do PG |
| Secrets | Permissões `600` no `/opt/casamento/.env`, dono `casamento:casamento` |
| Logs | Rotação via logrotate, retenção de 30 dias |

```bash
# Configuração rápida de segurança:
sudo apt install -y fail2ban unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Restringir .env
sudo chmod 600 /opt/casamento/.env
sudo chown casamento:casamento /opt/casamento/.env
```

---

## 14. Resumo do Plano de Deploy

```
1. Contratar VPS Linux 4 GB na LocalWeb
2. Apontar DNS (A record → IP da VPS)
3. Configurar servidor:
   a. Instalar Nginx + Java 21 + PostgreSQL 16
   b. Criar banco e usuário
   c. Configurar firewall (UFW)
   d. Criar serviço systemd para o backend
   e. Configurar Nginx (SPA + proxy + rate limit)
   f. Emitir certificado SSL (certbot)
   g. Aplicar segurança (fail2ban, SSH keys, etc.)
4. Deploy inicial:
   a. Upload JAR do backend → /opt/casamento/app/
   b. Upload dist/ do frontend → /var/www/casamento/
   c. Iniciar serviço backend
   d. Testar fluxo completo
5. Configurar CI/CD (GitHub Actions)
6. Configurar backups (snapshot + pg_dump)
7. Monitorar (UptimeRobot + journalctl)
```
