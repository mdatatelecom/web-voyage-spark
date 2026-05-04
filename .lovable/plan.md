## Versionar OG image + validar prévia

### 1. Versionar a imagem OG (busting de cache)
- Copiar `public/og-image.png` → `public/og-image-v2.png` (já feito).
- Atualizar `index.html` trocando as duas referências de `og-image.png` para `og-image-v2.png` nas tags `og:image` e `twitter:image`.
- Sempre que a arte mudar no futuro, incrementar o sufixo (`-v3`, `-v4`...) — WhatsApp, Facebook e Telegram só refazem fetch quando a URL muda.

### 2. Validação manual após o deploy
Não posso executar essas validações automaticamente (são serviços externos com login/captcha). Após publicar na Vercel, faça:

**Facebook / WhatsApp** → https://developers.facebook.com/tools/debug/
- Cole `https://rede.iwtelecomeservicos.com.br`
- Clique em **"Depurar"** → **"Coletar Novamente"** (Scrape Again).
- Confirme que `og:image` aponta para `og-image-v2.png` e que a prévia mostra a arte da IW Telecom.
- WhatsApp usa o mesmo cache do Facebook na maioria dos casos — após o scrape, o preview no chat já vem atualizado.

**Twitter / X** → https://cards-dev.twitter.com/validator
- (Atualmente requer login dev.) Alternativa: postar/preview em rascunho no X e verificar o card.
- Confirme `summary_large_image` com a nova imagem.

**LinkedIn** (bônus) → https://www.linkedin.com/post-inspector/
- Cole a URL e clique em "Inspect" para forçar re-fetch.

### 3. Checklist pós-deploy
- [ ] `https://rede.iwtelecomeservicos.com.br/og-image-v2.png` retorna 200 e abre a imagem correta.
- [ ] `view-source` da home mostra as meta tags `-v2`.
- [ ] Facebook Debugger não reporta warnings (tamanho mínimo, formato).
- [ ] Compartilhamento no WhatsApp em chat de teste mostra a nova arte.