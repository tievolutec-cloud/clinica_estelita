import type { Metadata } from "next";
import "./globals.css";
import "./modern.css";

export const metadata: Metadata = {
  title: "Clínica Estelita",
  description: "Gestão odontológica simples, segura e organizada.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
