# LEIA-ME — Guia do Fysi (em português, sem enrolação)

Guia rápido pra você entender seu próprio sistema e não ficar perdida.
Se algo aqui ficar desatualizado, me peça pra atualizar este arquivo.

---

## 🧩 As 4 peças do sistema

Seu "app" na verdade são 4 coisas que conversam entre si:

| Peça | O que é | Onde roda | Pasta |
|------|---------|-----------|-------|
| **Site** | As propostas + o painel admin (inbox, leads, relatórios) | **Vercel** (deploy da raiz) | `app/`, `components/`, `lib/` |
| **wa-server** | O "motor" que conecta no WhatsApp (envia/recebe mensagens) | **VPS** (Docker + EasyPanel) | `wa-server/` |
| **Banco + Login** | Guarda dados e o login do admin (Supabase) | Nuvem Supabase | `supabase/` (scripts SQL) |
| **Extensão** | A extensão do Chrome (ícone verde) | No navegador | `extension/` |

> ⚠️ **Importante:** o site (Vercel) e o wa-server (VPS) são publicados de
> lugares diferentes. Por isso **não** movemos essas pastas de lugar —
> mexer nelas quebraria os deploys.

---

## ▶️ Como rodar o site no seu computador

```bash
npm run dev
```

Depois abra **http://localhost:3000**. Enquanto esse comando estiver rodando,
o site local funciona. Feche o terminal e ele para.

---

## 🔐 Login do admin (painel `/admin`)

- O login usa o **Supabase** (email + senha). A senha **não** fica no código.
- Email da conta: **fysilabdigital@gmail.com**
- **Esqueceu a senha?** Na tela `/login`, clique em **"Esqueci minha senha"**,
  confira o email e clique no link → vai abrir a tela **"Defina sua nova senha"**.
- Esse fluxo de redefinição foi consertado em julho/2026 (antes o link do
  email não funcionava). Peças envolvidas: `app/auth/callback/route.ts` e
  `app/nova-senha/page.tsx`.

---

## 🗂️ Mapa da pasta `components/`

| Pasta | O que tem |
|-------|-----------|
| `ui/` | Peças genéricas e reaproveitáveis (botão, card, hero…) |
| `proposta/` | Seções da proposta comercial (planos, fases, CTA, marquee…) |
| `cliente/` | Seções da página do cliente (hero, FAQ, depoimentos, experts…) |
| `admin/` | Painel interno: inbox, leads, dashboard, relatórios, formulários |

`ProposalPage.tsx` monta a página pública da proposta juntando as seções.

---

## 🧠 Coisas importantes pra lembrar / decidir

- **Existem 2 projetos Supabase** na sua conta:
  - O que o **app usa hoje** (está no `.env.local`): projeto `ookpbnwhylacrstteiah`
  - Outro projeto chamado **"Dashboard"** (`cidsqtuzvtwuibmxodwf`) — precisa
    decidir se é usado pra algo ou se pode ser encerrado.
- Os acessos sensíveis (chaves, tokens, URL do WhatsApp) ficam em `.env.local`
  (que **não** vai pro Git, por segurança).
- O painel da VPS (EasyPanel) e o passo a passo de deploy do wa-server estão
  documentados em `wa-server/README.md`.

---

## 🧹 Faxina feita em julho/2026

- Removidos **18 arquivos de código morto** (nunca eram usados), incluindo a
  pasta `jack/` inteira — só o `JackMarqueeSection` era usado e foi movido pra
  `components/proposta/`.
- Removido o endpoint público de debug `api/debug-supabase` que **expunha**
  dados do Supabase pra qualquer um (risco de segurança).
- Consertado o fluxo de "esqueci minha senha" (estava quebrado).
