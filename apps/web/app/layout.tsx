import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ancora",
  description: "Local Python programming practice",
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
