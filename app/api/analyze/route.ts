import { NextResponse } from "next/server";
import { searchDiseaseVideos } from "@/lib/youtube";
import { analyzeTranscript } from "@/lib/ollama";

export async function POST(request: Request) {
  try {
    const { query, maxResults = 10, pageToken } = await request.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "A valid query string is required" },
        { status: 400 }
      );
    }

    const maxResultsNum = Math.min(Math.max(parseInt(maxResults) || 10, 1), 50);
    const result = await searchDiseaseVideos(
      query,
      maxResultsNum,
      3,
      pageToken
    );

    const videos = Array.isArray(result) ? result : result.videos;
    const nextPageTokenResponse = Array.isArray(result)
      ? undefined
      : result.nextPageToken;

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: "No videos found for the given query" },
        { status: 404 }
      );
    }

    const analyses = await Promise.all(
      videos.map(async (video) => {
        if (!video.transcript) {
          return { video, error: "Transcript unavailable" };
        }
        try {
          const analysis = await analyzeTranscript(video);
          return { video, analysis };
        } catch (error: any) {
          console.error(
            `Analysis failed for video ${video.id}:`,
            error.message
          );
          return {
            video,
            error: `Transcript analysis error: ${error.message}`,
          };
        }
      })
    );

    analyses.sort(
      (a, b) =>
        (b.analysis?.relevanceScore || 0) - (a.analysis?.relevanceScore || 0)
    );

    return NextResponse.json(
      nextPageTokenResponse !== undefined
        ? { analyses, nextPageToken: nextPageTokenResponse }
        : { analyses }
    );
  } catch (error: any) {
    console.error("API error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    );
  }
}
