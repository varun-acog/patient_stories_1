"use client";

import { SearchForm } from "@/components/search-form";
import '@/app/globals.css'; // Ensure Tailwind styles and animations are applied
import { useState } from "react";
import { Input, Button } from "@/components/ui/button"; // Added imports for Input and Button (assuming ShadCN/UI)
import { Search, Sparkles, AlertCircle } from "lucide-react"; // Ensure lucide-react is installed for icons

export default function Home() {
  const [initialQuery, setInitialQuery] = useState(""); // State to pre-fill search input
  const [analysisStatus, setAnalysisStatus] = useState({ isLoading: false, query: "", error: null as string | null }); // Track analysis state

  // Popular and rare diseases (keeping original content)
  const popularDiseases = [
    "Cancer",
    "Diabetes",
    "Asthma",
    "Hypertension",
    "Heart Disease",
  ];
  const rareDiseases = [
    "Cystic Fibrosis",
    "Huntington’s Disease",
    "Marfan Syndrome",
    "Amyotrophic Lateral Sclerosis (ALS)",
    "Ehlers-Danlos Syndrome",
  ];

  const handleDiseaseClick = (disease: string) => {
    setInitialQuery(disease); // Set the clicked disease as the initial query
  };

  const handleAnalysisUpdate = (status: { isLoading: boolean; query: string; error: string | null }) => {
    setAnalysisStatus(status);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-sky-100 to-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800 pattern-dots pattern-sky-50 pattern-opacity-20 dark:pattern-gray-900 dark:pattern-opacity-10">
      <div className="w-full max-w-4xl">
        {/* Hero Section */}
        <div className="w-full max-w-4xl text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 drop-shadow-sm dark:from-blue-400 dark:to-purple-400">
            VideoAnalyzer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto dark:text-gray-300">
            Discover information about various diseases and medical conditions with our advanced search tool
          </p>
        </div>

        {/* Analysis Status */}
        {analysisStatus.isLoading && (
          <div className="w-full max-w-4xl bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-center space-x-3 shadow-md dark:bg-blue-900 dark:border-blue-800 dark:text-blue-200">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="text-blue-700 dark:text-blue-200">
              Analyzing "<span className="font-semibold">{analysisStatus.query}</span>"... Please wait, this may take a moment.
            </p>
          </div>
        )}
        {analysisStatus.error && (
          <div className="w-full max-w-4xl bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-center space-x-3 shadow-md dark:bg-red-900 dark:border-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-200">Error: {analysisStatus.error}</p>
          </div>
        )}

        {/* Search Form (Quick Search Card, styled like reference) */}
        <div className="w-full max-w-4xl mb-12">
          <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center dark:text-gray-200">
              <Search className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              Search for Medical Information
            </h2>
            <SearchForm initialQuery={initialQuery} onAnalysisUpdate={handleAnalysisUpdate} />
          </div>
        </div>

        {/* Disease Suggestions */}
        <div className="w-full max-w-4xl grid gap-8">
          {/* Popular Diseases */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-blue-100 dark:from-gray-800 dark:to-blue-900 dark:border-blue-800">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center dark:text-gray-200">
              <Sparkles className="mr-2 h-5 w-5 text-blue-500 dark:text-blue-400" />
              Popular Diseases
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {popularDiseases.map((disease) => (
                <button
                  key={disease}
                  onClick={() => handleDiseaseClick(disease)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl 
                           hover:from-blue-600 hover:to-blue-700 transition-all duration-300 
                           transform hover:scale-105 shadow-md hover:shadow-lg 
                           font-medium text-sm active:scale-95 border border-blue-300 dark:border-blue-700 dark:bg-gradient-to-r dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-900"
                >
                  {disease}
                </button>
              ))}
            </div>
          </div>

          {/* Rare Diseases */}
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-purple-100 dark:from-gray-800 dark:to-purple-900 dark:border-purple-800">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center dark:text-gray-200">
              <Sparkles className="mr-2 h-5 w-5 text-purple-500 dark:text-purple-400" />
              Rare Diseases
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {rareDiseases.map((disease) => (
                <button
                  key={disease}
                  onClick={() => handleDiseaseClick(disease)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl 
                           hover:from-purple-600 hover:to-purple-700 transition-all duration-300 
                           transform hover:scale-105 shadow-md hover:shadow-lg 
                           font-medium text-sm active:scale-95 border border-purple-300 dark:border-purple-700 dark:bg-gradient-to-r dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-900"
                >
                  {disease}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer (optional, inspired by reference) */}
        <div className="w-full max-w-4xl mt-12 text-center text-gray-500 text-sm dark:text-gray-400">
          <p>© 2025 VideoAnalyzer. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}