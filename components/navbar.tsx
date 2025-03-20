"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react"; // Ensure lucide-react is installed for icons

export default function Navbar() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle dark mode and persist in localStorage
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;
      if (newTheme) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return newTheme;
    });
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleLogoClick = () => {
    window.location.href = "/"; // Redirect to landing page
  };

  return (
    <nav className="w-full bg-transparent p-4 shadow-md">
      <div className="container max-w-4xl mx-auto flex justify-between items-center">
        {/* Logo on the left */}
        <button
          onClick={handleLogoClick}
          className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-colors duration-300"
        >
          VideoAnalyzer
        </button>

        {/* Theme Toggle on the right */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </nav>
  );
}