"use client";

import { ReactNode } from "react";
import '@/app/globals.css'; // Ensure Tailwind styles and animations are applied
import Navbar from "@/components/navbar.tsx";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : ""}>
      <body className="min-h-screen bg-gradient-to-b from-sky-100 to-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        {children}
      </body>
    </html>
  );
}