#!/usr/bin/env -S npx tsx
// bin/youtube-fetcher.ts
import { searchDiseaseVideos, VideoMetadata } from "../lib/youtube";
import { safeLog } from "../lib/logger";
import fs from "fs/promises";
import path from "path";

interface Options {
  disease?: string;
  maxResults?: number;  // Optional, undefined means fetch all
  outputFile?: string;
  videoIdsFile?: string;
  videoId?: string;
  startDate?: string;
  endDate?: string;
}

async function main() {
  const options: Options = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--disease" && i + 1 < args.length) {
      options.disease = args[i + 1];
      i++;
    } else if (args[i] === "--max-results" && i + 1 < args.length) {
      options.maxResults = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--output-file" && i + 1 < args.length) {
      options.outputFile = args[i + 1];
      i++;
    } else if (args[i] === "--video-ids-file" && i + 1 < args.length) {
      options.videoIdsFile = args[i + 1];
      i++;
    } else if (args[i] === "--video-id" && i + 1 < args.length) {
      options.videoId = args[i + 1];
      i++;
    } else if (args[i] === "--start-date" && i + 1 < args.length) {
      options.startDate = args[i + 1];
      i++;
    } else if (args[i] === "--end-date" && i + 1 < args.length) {
      options.endDate = args[i + 1];
      i++;
    }
  }

  if (!options.disease && !options.videoId) {
    safeLog("error", "Usage: youtube-fetcher.ts --disease <disease_name> [--max-results <number>] [--output-file <file>] [--video-ids-file <file>] [--start-date <YYYY-MM-DD>] [--end-date <YYYY-MM-DD>]");
    safeLog("error", "       youtube-fetcher.ts --video-id <video_id> [--output-file <file>] [--video-ids-file <file>]");
    process.exit(1);
  }

  try {
    let videos: VideoMetadata[] = [];
    let searchName: string = options.disease || options.videoId || "unknown";

    if (options.videoId) {
      const youtubeService = new (await import("../lib/youtube-service")).YouTubeService(process.env.YOUTUBE_API_KEY || "");
      const video = await youtubeService.getVideoDetails(options.videoId);
      if (video) {
        videos = [{ ...video, search_name: searchName }];
      } else {
        safeLog("warn", `❌ No metadata found for video ${options.videoId}`);
      }
    } else {
      const searchOptions: any = { 
        maxResults: options.maxResults,  // Pass undefined if not specified
        startDate: options.startDate,
        endDate: options.endDate
      };
      videos = await searchDiseaseVideos(options.disease!, searchOptions);
      videos = videos.map(video => ({ ...video, search_name: searchName }));
      safeLog("info", `Found ${videos.length} videos for "${options.disease}"`);
    }

    const outputData: VideoMetadata[] = [];
    for (const video of videos) {
      try {
        outputData.push(video);
        safeLog("info", `✅ Processed metadata for video ${video.id}`);
      } catch (error) {
        safeLog("error", `❌ Error processing video ${video.id}:`, error);
      }
    }

    if (options.outputFile) {
      await fs.writeFile(options.outputFile, JSON.stringify(outputData, null, 2));
      safeLog("info", `✅ Wrote full video metadata to ${options.outputFile}`);
    }

    if (options.videoIdsFile) {
      const videoIds = outputData.map(video => video.id);
      await fs.writeFile(options.videoIdsFile, JSON.stringify(videoIds, null, 2));
      if (videoIds.length === 0) {
        safeLog("warn", `No video IDs found; wrote empty array to ${options.videoIdsFile}`);
      } else {
        safeLog("info", `✅ Wrote ${videoIds.length} video IDs to ${options.videoIdsFile}`);
      }
    }

    if (!options.outputFile && !options.videoIdsFile) {
      for (const data of outputData) {
        process.stdout.write(JSON.stringify(data) + "\n");
      }
    }
  } catch (error) {
    safeLog("error", "❌ Error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  safeLog("error", "Unhandled error:", error);
  process.exit(1);
});