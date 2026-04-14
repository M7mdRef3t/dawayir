import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "دواير — منصة ذكاء العلاقات",
  description: "اكتشف من يشكل عالمك الخاص. ارسم خريطة علاقاتك، افهم الأنماط المخفية، وعزز صحتك العاطفية.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}
