// lib/youtube-service.ts
import { google } from "googleapis";
import { VideoMetadata, SearchOptions } from "./types";
import { DateTime } from "luxon";
import { TranscriptService } from "./transcript-service";
import { safeLog } from "./logger";

export class YouTubeService {
  private youtube;
  private quotaExceeded = false;
  private transcriptService: TranscriptService;

  constructor(apiKey: string) {
    safeLog("error", "[DEBUG] Initializing YouTube service with API key:", apiKey ? "Key provided" : "No key provided");
    this.youtube = google.youtube({
      version: "v3",
      auth: apiKey,
    });
    this.transcriptService = new TranscriptService();
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.youtube.channels.list({
        part: ["snippet"],
        id: ["UC_x5XG1OV2P6uZZ5FSM9Ttw"],
        maxResults: 1
      });
      return response.status === 200;
    } catch (error) {
      safeLog("error", "[DEBUG] API key validation failed:", error.message);
      return false;
    }
  }

  async searchVideos(
    query: string,
    options: SearchOptions & { yearsBack?: number } = {}
  ): Promise<VideoMetadata[]> {
    try {
      const maxResultsPerRequest = 50;
      const totalResults = options.maxResults || 1000; // Default to 1000; adjust based on quota
      let allVideos: VideoMetadata[] = [];

      const yearsBack = options.yearsBack || 5;
      const endDate = DateTime.now().toISO();
      const startDate = DateTime.now().minus({ years: yearsBack }).toISO();

      safeLog("error", `[DEBUG] Date range: ${startDate} to ${endDate}`);

      let nextPageToken: string | null = null;
      let resultsFetched = 0;

      safeLog(
        "error",
        `🔍 Starting to fetch videos for "${query}" (last ${yearsBack} years, query used: "${query}", max: ${totalResults})`
      );

      do {
        if (this.quotaExceeded) {
          safeLog("error", "❗ Quota exceeded, pausing until reset (next day)...");
          const now = DateTime.now();
          const resetTime = now.plus({ days: 1 }).startOf("day");
          const waitMs = resetTime.diff(now).as("milliseconds");
          safeLog("error", `[DEBUG] Waiting for ${waitMs / 1000 / 60} minutes until ${resetTime.toISO()}`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          this.quotaExceeded = false;
        }

        safeLog("error", `[DEBUG] Fetching page ${nextPageToken ? `with token ${nextPageToken}` : '1 (no token)'}`);

        const requestParams: any = {
          part: ["snippet"],
          q: query,
          type: ["video"],
          maxResults: maxResultsPerRequest,
          order: options.order || "relevance",
          regionCode: "US",
          relevanceLanguage: options.language || "en",
          publishedAfter: startDate,
          publishedBefore: endDate,
          videoDuration: "any"
        };

        if (nextPageToken) {
          requestParams.pageToken = nextPageToken;
        }

        safeLog("error", "[DEBUG] Request params:", JSON.stringify(requestParams, null, 2));

        try {
          const response = await this.youtube.search.list(requestParams);
          safeLog("error", `[DEBUG] Response status: ${response.status}`);
          safeLog("error", `[DEBUG] Items received: ${response.data.items?.length || 0}`);

          if (!response.data.items || response.data.items.length === 0) {
            safeLog("error", "[DEBUG] No items in response, breaking loop");
            break;
          }

          const videos = response.data.items;
          const videoIds = videos.map((item) => item.id?.videoId).filter((id): id is string => id !== undefined);

          safeLog("error", `[DEBUG] Video IDs found: ${videoIds.join(', ')}`);

          if (!videoIds.length) {
            safeLog("error", "[DEBUG] No valid video IDs in this batch");
            break;
          }

          const detailsResponse = await this.youtube.videos.list({
            part: ["snippet", "contentDetails", "statistics"],
            id: videoIds.join(",")
          });

          safeLog("error", `[DEBUG] Details received for ${detailsResponse.data.items?.length || 0} videos`);

          const videoDetails = detailsResponse.data.items || [];
          const videoMetadata = videoDetails.map((video) => {
            const videoId = video.id;
            if (!videoId) return null;

            const durationInSeconds = this.parseDuration(video.contentDetails?.duration || "PT0S");

            return {
              id: videoId,
              title: video.snippet?.title || "",
              description: video.snippet?.description || "",
              publishedDate: video.snippet?.publishedAt || "",
              durationInSeconds,
              viewCount: parseInt(video.statistics?.viewCount || "0", 10),
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail: video.snippet?.thumbnails?.high?.url || "",
              channel_name: video.snippet?.channelTitle || "",
            };
          }).filter((result): result is VideoMetadata => result !== null);

          allVideos = allVideos.concat(videoMetadata);
          resultsFetched += videoMetadata.length;

          nextPageToken = response.data.nextPageToken || null;
          safeLog("error", `[DEBUG] Next page token: ${nextPageToken || 'None (end of results)'}`);

          safeLog("error", `✅ Fetched ${resultsFetched} videos so far for "${query}"`);

          if (resultsFetched >= totalResults) {
            safeLog("error", `[DEBUG] Reached maxResults limit of ${totalResults}`);
            break;
          }

        } catch (error) {
          safeLog("error", "❗ Error fetching videos batch:", error);

          if (error.response) {
            safeLog("error", `[DEBUG] Error status: ${error.response.status}`);
            safeLog("error", `[DEBUG] Error data: ${JSON.stringify(error.response.data, null, 2)}`);
            if (error.response.status === 403 && error.response.data?.error?.errors?.some((e: any) => e.reason === "quotaExceeded")) {
              this.quotaExceeded = true;
              continue;
            }
          }

          break;
        }
      } while (nextPageToken !== null);

      safeLog("error", `[DEBUG] Fetched videos: ${JSON.stringify(allVideos.map(v => v.title), null, 2)}`);
      safeLog("error", `✅ Fetched ${allVideos.length} videos for "${query}"`);

      if (allVideos.length === 0) {
        safeLog("error", "❗ No videos found. Check query, API limits, or date range.");
      }

      return allVideos;
    } catch (error) {
      safeLog("error", "Error searching videos:", error);
      throw error;
    }
  }

  async getVideoDetails(videoId: string): Promise<VideoMetadata | null> {
    try {
      const response = await this.youtube.videos.list({
        part: ["snippet", "contentDetails", "statistics"],
        id: [videoId]
      });

      const video = response.data.items?.[0];
      if (!video) return null;

      const durationInSeconds = this.parseDuration(video.contentDetails?.duration || "PT0S");

      const metadata: VideoMetadata = {
        id: videoId,
        title: video.snippet?.title || "",
        description: video.snippet?.description || "",
        publishedDate: video.snippet?.publishedAt || "",
        durationInSeconds,
        viewCount: parseInt(video.statistics?.viewCount || "0", 10),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: video.snippet?.thumbnails?.high?.url || "",
        channel_name: video.snippet?.channelTitle || "",
      };

      return metadata;
    } catch (error) {
      safeLog("error", "Error fetching video details:", error);
      return null;
    }
  }

  async fetchTranscript(videoId: string): Promise<{ fullText: string; language: string } | null> {
    try {
      safeLog("error", "[DEBUG] Fetching transcript for video:", videoId);
      const { segments, language } = await this.transcriptService.getTranscriptWithTimestamps(videoId);

      if (!segments || segments.length === 0) {
        safeLog("error", "[DEBUG] No transcript available for video:", videoId);
        return null;
      }

      const fullText = segments.map(segment => segment.text).join(" ");
      safeLog("error", `[DEBUG] Fetched complete transcript for video ${videoId} in language ${language}`);
      return { fullText, language };
    } catch (error) {
      safeLog("error", `Error fetching transcript for video ${videoId}:`, error);
      return null;
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1].replace("H", "")) * 3600 : 0;
    const minutes = match[2] ? parseInt(match[2].replace("M", "")) * 60 : 0;
    const seconds = match[3] ? parseInt(match[3].replace("S", "")) : 0;

    return hours + minutes + seconds;
  }
}