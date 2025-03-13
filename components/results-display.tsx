"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoMetadata } from "@/lib/youtube";
import { AnalysisResult } from "@/lib/ollama";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import '@/app/globals.css'; // Ensure Tailwind styles and animations are applied

interface Analysis {
  video: VideoMetadata;
  analysis: AnalysisResult;
}

export function ResultsDisplay() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const [results, setResults] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxResults] = useState(50); // Per-page limit
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const fetchResults = async (pageToken: string | null = null) => {
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults, pageToken }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const data = await response.json();
      console.log("✅ API Data:", JSON.stringify(data, null, 2));

      if (Array.isArray(data.analyses) && data.analyses.length > 0) {
        setResults((prev) => [...prev, ...data.analyses]); // Append new results
        setNextPageToken(data.nextPageToken || null);
        sessionStorage.setItem("analysisResults", JSON.stringify([...results, ...data.analyses]));
      } else {
        console.warn("⚠️ No analyses found for query:", query);
      }
    } catch (error) {
      console.error("❌ Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!query) return;

    const storedResults = sessionStorage.getItem("analysisResults");
    let parsedResults: Analysis[] | null = null;

    try {
      if (storedResults) {
        parsedResults = JSON.parse(storedResults);
        if (!Array.isArray(parsedResults) || parsedResults.length === 0) {
          console.warn("⚠️ Invalid sessionStorage data. Fetching fresh data...");
          parsedResults = null;
        }
      }
    } catch (error) {
      console.error("❌ Error parsing sessionStorage data:", error);
      parsedResults = null;
    }

    if (parsedResults) {
      console.log("🟢 Using cached sessionStorage data:", parsedResults);
      setResults(parsedResults);
      return;
    }

    fetchResults();
  }, [query]);

  if (!query) return null;

  if (loading && results.length === 0) {
    return (
      <div className="mt-8 grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="container max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center drop-shadow-md animate-fadeIn">
          Analysis Results for "{query}"
        </h1>

        <div className="grid gap-6">
          {results.length === 0 ? (
            <p className="text-center text-gray-500 text-lg">No results found.</p>
          ) : (
            results.map((result) => {
              const { analysis, video } = result;
              return (
                <Card key={video.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
                  <CardHeader className="bg-white dark:bg-gray-800 rounded-t-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200">{video.title}</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                          Relevance Score:{" "}
                          {typeof analysis?.relevanceScore === "number"
                            ? `${analysis.relevanceScore}%`
                            : "0%"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                        {analysis?.diseaseName || "Unknown"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="bg-gray-50 dark:bg-gray-700 rounded-b-xl p-4">
                    <Tabs defaultValue="symptoms" className="w-full">
                      <TabsList className="grid grid-cols-3 w-full mb-4 rounded-full">
                        <TabsTrigger value="symptoms" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-full dark:data-[state=active]:bg-blue-700 dark:data-[state=active]:text-gray-100">
                          Symptoms
                        </TabsTrigger>
                        <TabsTrigger value="treatments" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-full dark:data-[state=active]:bg-blue-700 dark:data-[state=active]:text-gray-100">
                          Treatments
                        </TabsTrigger>
                        <TabsTrigger value="takeaways" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-full dark:data-[state=active]:bg-blue-700 dark:data-[state=active]:text-gray-100">
                          Key Takeaways
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="symptoms">
                        <ScrollArea className="h-[200px] rounded-md border border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800 shadow-inner">
                          <ul className="list-disc pl-4 space-y-2 text-gray-700 dark:text-gray-300">
                            {Array.isArray(analysis?.symptoms) && analysis.symptoms.length > 0 ? (
                              analysis.symptoms.map((symptom, i) => <li key={i} className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">{symptom}</li>)
                            ) : (
                              <p className="text-gray-500 dark:text-gray-400">No symptoms available.</p>
                            )}
                          </ul>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="treatments">
                        <ScrollArea className="h-[200px] rounded-md border border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800 shadow-inner">
                          <ul className="list-disc pl-4 space-y-2 text-gray-700 dark:text-gray-300">
                            {Array.isArray(analysis?.treatments) && analysis.treatments.length > 0 ? (
                              analysis.treatments.map((treatment, i) => <li key={i} className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">{treatment}</li>)
                            ) : (
                              <p className="text-gray-500 dark:text-gray-400">No treatments available.</p>
                            )}
                          </ul>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="takeaways">
                        <ScrollArea className="h-[200px] rounded-md border border-gray-200 dark:border-gray-600 p-4 bg-white dark:bg-gray-800 shadow-inner">
                          <ul className="list-disc pl-4 space-y-2 text-gray-700 dark:text-gray-300">
                            {Array.isArray(analysis?.keyTakeaways) && analysis.keyTakeaways.length > 0 ? (
                              analysis.keyTakeaways.map((takeaway, i) => <li key={i} className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">{takeaway}</li>)
                            ) : (
                              <p className="text-gray-500 dark:text-gray-400">No key takeaways available.</p>
                            )}
                          </ul>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })
          )}
          {nextPageToken && (
            <Button
              onClick={() => fetchResults(nextPageToken)}
              disabled={loading}
              className="mt-6 w-full max-w-xs mx-auto bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 rounded-full dark:bg-blue-700 dark:hover:bg-blue-800 dark:text-gray-100"
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}