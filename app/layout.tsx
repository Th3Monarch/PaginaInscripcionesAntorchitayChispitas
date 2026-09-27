import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AvisoExtension } from "@/components/ui/AvisoExtension";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Inscripción Chispita y Antorchita",
  description:
    "Formulario de inscripción y autorización para los grupos infantiles Chispita y Antorchita. Genera la ficha en PDF para imprimir y firmar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AvisoExtension />
        {children}
      </body>
    </html>
  );
}
