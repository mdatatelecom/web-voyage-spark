## Usar imagem da IW Telecom como preview OG

1. **Copiar imagem** `user-uploads://iw-2.png` para `public/og-image.png`.

2. **Atualizar `index.html`** — substituir as duas tags que apontam para `lovable.dev`:
   ```html
   <meta property="og:image" content="https://rede.iwtelecomeservicos.com.br/og-image.png" />
   <meta property="og:image:width" content="1200" />
   <meta property="og:image:height" content="630" />
   <meta name="twitter:image" content="https://rede.iwtelecomeservicos.com.br/og-image.png" />
   ```
   (Também ajustar `twitter:card` para `summary_large_image` — já está.)

3. **Após deploy na Vercel**, limpar cache do WhatsApp:
   - WhatsApp cacheia ~7 dias por URL. Use o [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) → cole a URL → "Scrape Again".
   - Ou compartilhe com query string nova (`?v=2`) para forçar refetch imediato.

### Observação
A imagem enviada é horizontal (~2:1), próxima do formato OG ideal (1200x630). Vai renderizar bem no WhatsApp/Facebook/Twitter sem corte significativo.