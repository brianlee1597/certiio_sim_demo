import "@mantine/core/styles.css";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Certiio · Work simulations",
  description:
    "From customer conversation to working solution. An AI FDE hiring simulation.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
