import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dawayir — Map Your Relationships. Understand Your World.",
  description: "The world's first intelligent relationship mapping platform. See who drains you, who lifts you, and who you've been ignoring.",
  keywords: ["relationships", "relationship mapping", "emotional intelligence", "dawayir", "circles"],
  openGraph: {
    title: "Dawayir — Your Relationships, Visualized.",
    description: "See the hidden patterns in your personal relationships. Powered by AI.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
