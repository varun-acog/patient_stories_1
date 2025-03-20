// lib/transcript-service.ts
import { YoutubeTranscript } from "youtube-transcript";
import { safeLog } from "./logger";

export class TranscriptService {
  async getTranscript(videoId: string): Promise<string[]> {
    try {
      const { segments } = await this.fetchTranscript(videoId);
      return segments.map((segment) => segment.text);
    } catch (error) {
      safeLog("error", `Error fetching transcript for video ${videoId}: ${error.message}`);
      return [];
    }
  }

  async getTranscriptWithTimestamps(
    videoId: string
  ): Promise<{ segments: YoutubeTranscript.Transcript[], language: string }> {
    try {
      return await this.fetchTranscript(videoId);
    } catch (error) {
      safeLog("error", `Error fetching transcript with timestamps for video ${videoId}: ${error.message}`);
      return { segments: [], language: "none" };
    }
  }

  async getBatchTranscripts(
    videoIds: string[]
  ): Promise<Map<string, string[]>> {
    const transcripts = new Map<string, string[]>();
    for (const videoId of videoIds) {
      try {
        const transcript = await this.getTranscript(videoId);
        transcripts.set(videoId, transcript);
      } catch (error) {
        transcripts.set(videoId, []);
      }
    }
    return transcripts;
  }

  private async fetchTranscript(videoId: string): Promise<{ segments: YoutubeTranscript.Transcript[], language: string }> {
    try {
      // First try English
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
        customUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      if (transcript.length > 0) {
        return { segments: transcript, language: "en" };
      }

      // Fallback to auto-detection
      const autoTranscript = await YoutubeTranscript.fetchTranscript(videoId, {
        customUserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      if (autoTranscript.length > 0) {
        return { segments: autoTranscript, language: "auto" };
      }

      return { segments: [], language: "none" };
    } catch (error) {
      throw new Error(`No transcript available for video ${videoId}: ${error.message}`);
    }
  }
}