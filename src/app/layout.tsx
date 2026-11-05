import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Controle Financeiro",
  description: "Controle financeiro pessoal",
  applicationName: "Finanças",
  // iPhone: ao adicionar à Tela de Início, abre em tela cheia como um app
  appleWebApp: { capable: true, title: "Finanças", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/favicon-32.png",
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // libera env(safe-area-inset-*) para a barra inferior e o indicador de início
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14171e" },
  ],
};

// Aplica o tema salvo antes da primeira pintura para evitar flash claro/escuro
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${dmSans.variable} bg-bg text-apptext font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
