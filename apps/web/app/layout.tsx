import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ancora",
  description: "Grounded study workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
