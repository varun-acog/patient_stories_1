"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchFormProps {
  initialQuery?: string; // Optional prop for pre-filling
  onAnalysisUpdate?: (status: { isLoading: boolean; query: string; error: string | null }) => void; // Callback for status updates
}

export function SearchForm({ initialQuery = "", onAnalysisUpdate }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Update query when initialQuery changes (e.g., from disease click)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Please enter a disease name or medical condition.");
      if (onAnalysisUpdate) onAnalysisUpdate({ isLoading: false, query: "", error: error });
      toast({
        title: "Invalid Input",
        description: "Please enter a disease name or medical condition.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    if (onAnalysisUpdate) onAnalysisUpdate({ isLoading: true, query: query.trim(), error: null });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), maxResults: 50 }),
        cache: "force-cache", // Uses server-side cached data if available
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched Data (cached or fresh):", data.analyses);

      if (data.analyses && data.analyses.length > 0) {
        sessionStorage.setItem("analysisResults", JSON.stringify(data.analyses));
        router.push(`/results?q=${encodeURIComponent(query)}`);
        router.refresh();
      } else {
        throw new Error("No relevant videos found for your query.");
      }
    } catch (error: any) {
      console.error("Error in SearchForm:", error);
      setError(error.message);
      if (onAnalysisUpdate) onAnalysisUpdate({ isLoading: false, query: query.trim(), error: error.message });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (onAnalysisUpdate) onAnalysisUpdate({ isLoading: false, query: query.trim(), error: error });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter a disease name or medical condition..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-gray-300 dark:border-gray-600"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Analyze
        </Button>
      </div>
      {error && <p className="text-red-500 mt-2 text-sm dark:text-red-400">{error}</p>}
    </form>
  );
}