# Fysi CRM Bridge — Extensão Chrome

Lê o WhatsApp Web direto no seu navegador e empurra as conversas/mensagens
pro `wa-server` do Fysi CRM. Mais confiável que o Baileys porque herda a
confiabilidade do próprio cliente oficial do WhatsApp.

## Como funciona

1. Você abre `web.whatsapp.com` no Chrome e escaneia o QR como sempre.
2. A extensão injeta o `wppconnect-wa.js` na página, expondo `window.WPP`.
3. O `inject.js` escuta eventos (`chat.new_message`, `chat.change`) e
   faz POST em `/ingest/*` no nosso wa-server.
4. A cada 1 min faz um sync de snapshot completo (`/ingest/chats`)
   pra cobrir o que escapou dos eventos.
5. O CRM (web app) já mostra tudo isso via SSE.

## Instalação

1. Abra `chrome://extensions` no Chrome.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta `extension/`
   deste repo.
4. Clique no ícone da extensão (canto direito da barra) → preencha:
   - **URL:** `https://wa-fysi.177-73-235-85.nip.io`
   - **Token:** o mesmo `WA_AUTH_TOKEN` (peça pro admin)
5. Clique **Salvar** — deve aparecer "Conectado ao wa-server. Estado: open".
6. Abra/recarregue `web.whatsapp.com`. Aguarde o QR (se necessário).
7. Pronto! Logo após o WPP ficar pronto, vai começar a empurrar tudo.

## Verificar se está funcionando

- Console da página do `web.whatsapp.com` (F12) → deve mostrar:
  `[Fysi Bridge] WPP pronto — começando sync` e `full sync — N conversas`.
- Logs do wa-server: `🔌  ingest/chats: N conversas`.
- O CRM em `pro.fysilabdigital.com.br/admin/inbox` recebe via SSE
  imediatamente (sem F5).

## Limites conhecidos

- Precisa do **Chrome aberto** com a aba do WhatsApp Web ativa.
  Se fechar a aba, o sync via extensão para (mas o Baileys continua
  como backup).
- `chrome.runtime.sendMessage` não funciona entre páginas — toda
  comunicação é via `chrome.storage.local`.
- WhatsApp Web atualiza com frequência; se um dia o `WPP` quebrar,
  precisamos atualizar o `vendor/wppconnect-wa.js` (vem do
  [wppconnect-team/wa-js](https://github.com/wppconnect-team/wa-js)).
