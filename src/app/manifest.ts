import type { MetadataRoute } from "next";

// Manifesto do app: permite "Adicionar à Tela de Início" abrindo em tela cheia, sem a barra do navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Controle Financeiro",
    short_name: "Finanças",
    description: "Controle financeiro pessoal",
    lang: "pt-BR",
    start_url: "/lancamento",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7fa",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
