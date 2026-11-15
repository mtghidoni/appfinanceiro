This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Conexão com bancos (Pluggy / Open Finance)

O app busca contas, saldos e transações direto do banco usando a [Pluggy](https://pluggy.ai).

1. **Banco de dados** — no SQL Editor do Supabase, rode `supabase/fase2_pluggy.sql` (depois do `fase1_familia_contas.sql`).
2. **Credenciais** — no painel da Pluggy (Applications), copie o *Client ID* e o *Client Secret* e defina:
   - `PLUGGY_CLIENT_ID`
   - `PLUGGY_CLIENT_SECRET`
   - `NEXT_PUBLIC_PLUGGY_SANDBOX=true` (opcional, para testar com o banco fictício "Pluggy Bank")

   No `.env.local` para rodar localmente e em *Vercel → Settings → Environment Variables* para produção (depois, faça um novo deploy).
   O Client Secret fica só no servidor: nunca use o prefixo `NEXT_PUBLIC_` nele.
3. **Usar** — em *Contas*, toque em **Conectar banco**, escolha o banco e autorize. As contas aparecem como "automática" e
   são sincronizadas ao abrir a tela (se a última vez foi há mais de 6 h) ou pelo botão de sincronizar.

4. **Webhook (opcional, recomendado)** — para os dados chegarem sem abrir o app, cadastre no painel da Pluggy
   o webhook `https://SEU-DOMINIO/api/webhooks/pluggy` (evento `all`) e defina na Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API Keys → service_role)
   - `PLUGGY_WEBHOOK_SECRET` (opcional): um valor aleatório; no cadastro do webhook, adicione o header
     `x-webhook-secret` com o mesmo valor.

   O webhook só diz qual conexão mudou; o app busca os dados na API da Pluggy e só para conexões já cadastradas.

Como funciona: o navegador nunca vê o Client Secret; ele pede um *connect token* de curta duração para
`/api/pluggy/connect-token` e abre o widget da Pluggy. Ao terminar, `/api/pluggy/itens` registra a conexão
(conferindo que ela foi criada pelo usuário logado) e importa os dados com as mesmas regras de categorização
da importação de extratos. Desconectar mantém as contas e o histórico, como contas manuais.
