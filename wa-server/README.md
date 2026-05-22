# Fysi WA Server — PoC

Servidor de teste para a conexão com o WhatsApp do CRM Fysi.
Prova de conceito: **conectar via QR Code** e **enviar texto + áudio**.

> Se este teste funcionar, o caminho da arquitetura está provado e
> seguimos para o servidor de verdade (inbox, leads, equipe).

## Como rodar

```bash
cd wa-server
npm install
npm start
```

Depois abra **http://localhost:3100** no navegador.

## Como testar

1. Abra o WhatsApp **Business** no celular que terá o número do CRM.
2. Vá em **Aparelhos conectados → Conectar um aparelho**.
3. Escaneie o QR que aparece na página (ou no terminal).
4. Quando o status virar **conectado**, use os formulários para:
   - enviar uma **mensagem de texto**;
   - enviar um **áudio** (vai como mensagem de voz / PTT).
5. Mensagens recebidas aparecem no terminal — prova de que a leitura também funciona.

> Dica: use um número de teste primeiro. Áudios `.ogg/opus` saem como
> mensagem de voz nativa; outros formatos também funcionam, mas o ideal
> para voz é o opus (conversão automática entra na próxima fase).

## API

| Rota | Método | O que faz |
|------|--------|-----------|
| `/status` | GET | Estado da conexão (`starting` / `qr` / `open` / `close`) |
| `/qr` | GET | QR atual como imagem (data URL) |
| `/send-text` | POST | `{ to, text }` — envia texto |
| `/send-audio` | POST | multipart `to` + `audio` — envia mensagem de voz |
| `/logout` | POST | Encerra a sessão e gera novo QR |

## Importante

- A pasta **`auth/`** guarda as credenciais da sessão do WhatsApp.
  Está no `.gitignore` — **nunca** versionar nem compartilhar.
- Esta é uma conexão **não-oficial** (mesma base do app antigo).
  Funciona bem para uso comercial próprio; evite disparo em massa.
- A porta padrão é `3100` (`PORT=xxxx npm start` para mudar).
