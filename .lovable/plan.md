## Objetivo
Adicionar `vercel.json` na raiz do projeto para permitir deploy correto na Vercel, cobrindo SPA routing (React Router) e cabeçalhos básicos de segurança/cache.

## Arquivo a criar: `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Por que esta config

- **rewrites**: redireciona qualquer rota (exceto `/assets/*`) para `index.html`, permitindo que o React Router resolva `/auth`, `/dashboard`, etc. sem 404 em refresh/deep link.
- **headers de cache**: assets do Vite têm hash no nome → cache imutável de 1 ano. HTML continua sem cache (default).
- **headers de segurança**: equivalentes aos já configurados no `nginx.conf` do projeto, mantendo paridade entre self-host e Vercel.
- **framework + build/install/output**: explicitados para evitar autodetecção incorreta.

## Lembretes pós-deploy (não envolvem código)

1. Configurar variáveis na Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
2. No Supabase externo → Auth → URL Configuration: adicionar a URL `*.vercel.app` em Site URL e Redirect URLs.

## Fora de escopo

- Não alterar `nginx.conf`, Dockerfiles ou backend Node (continuam disponíveis para self-host paralelo).
- Não criar serverless functions na Vercel — o backend Node permanece em outro host (o `vercel.json` só cobre o frontend Vite/React).
