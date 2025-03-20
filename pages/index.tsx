import { useState, FormEvent } from "react";
import axios from "axios";
import { FaSearch, FaVideo, FaFileAlt, FaBrain, FaClock, FaSpinner, FaUser, FaUserTie } from "react-icons/fa";

interface SearchResult {
  videoCount: number;
  transcriptCount: number;
  analysisCount: number;
  patientStoriesCount: number;
  kolInterviewsCount: number;
  llmModel: string;
  lastUpdated: string;
}

export default function Dashboard() {
  const [disease, setDisease] = useState("");
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!disease.trim()) {
      setError("Please enter a disease name");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post("/api/search", {
        disease: disease.trim(),
        keywords: keywords.trim(),
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Video Analysis Dashboard</h1>
          <p className="mt-2 text-secondary">Analyze YouTube videos for disease-related insights</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="disease" className="block text-sm font-medium text-text mb-1">
                Disease Name
              </label>
              <input
                type="text"
                id="disease"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                placeholder="e.g., Friedreich's ataxia"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="keywords" className="block text-sm font-medium text-text mb-1">
                Keywords (Optional)
              </label>
              <input
                type="text"
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., patient stories"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <FaSearch />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-error text-white rounded-lg flex items-center gap-2">
            <FaVideo className="text-lg" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Video Count Card */}
            <div className="bg-card p-6 rounded-lg shadow-md flex items-center gap-4">
              <FaVideo className="text-4xl text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-text">Videos Found</h3>
                <p className="text-2xl font-bold text-success">{result.videoCount}</p>
              </div>
            </div>

            {/* Transcript Count Card */}
            <div className="bg-card p-6 rounded-lg shadow-md flex items-center gap-4">
              <FaFileAlt className="text-4xl text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-text">Transcripts Available</h3>
                <p className="text-2xl font-bold text-success">{result.transcriptCount}</p>
              </div>
            </div>

            {/* Analysis Count Card */}
            <div className="bg-card p-6 rounded-lg shadow-md flex items-center gap-4">
              <FaBrain className="text-4xl text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-text">Videos Analyzed by LLM</h3>
                <p className="text-2xl font-bold text-success">{result.analysisCount}</p>
                <p className="text-sm text-text mt-1">
                  Model: <span className="font-medium">{result.llmModel}</span>
                </p>
              </div>
            </div>

            {/* Patient Stories Card */}
            <div className="bg-card p-6 rounded-lg shadow-md flex items-center gap-4">
              <FaUser className="text-4xl text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-text">Patient Stories</h3>
                <p className="text-2xl font-bold text-success">{result.patientStoriesCount}</p>
              </div>
            </div>

            {/* KOL Interviews Card */}
            <div className="bg-card p-6 rounded-lg shadow-md flex items-center gap-4">
              <FaUserTie className="text-4xl text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-text">KOL Interviews</h3>
                <p className="text-2xl font-bold text-success">{result.kolInterviewsCount}</p>
              </div>
            </div>

            {/* Last Updated Card */}
            <div className="bg-card p-6 rounded-lg shadow-md flex items-center gap-4">
              <FaClock className="text-4xl text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-text">Last Updated</h3>
                <p className="text-lg font-medium text-text">
                  {new Date(result.lastUpdated).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white py-4 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 Video Analysis Pipeline. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}