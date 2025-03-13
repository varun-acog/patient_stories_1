// bin/youtube-fetcher.ts
import { searchDiseaseVideos, VideoMetadata } from "../lib/youtube";
import { safeLog } from "../lib/logger";
import fs from "fs/promises";
import path from "path";

interface Options {
  disease?: string;
  maxResults?: number;
  outputFile?: string;
  videoIdsFile?: string;
  videoId?: string;
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
    }
  }

  if (!options.disease && !options.videoId) {
    safeLog("error", "Usage: youtube-fetcher.ts --disease <disease_name> [--max-results <number>] [--output-file <file>] [--video-ids-file <file>]");
    safeLog("error", "       youtube-fetcher.ts --video-id <video_id> [--output-file <file>] [--video-ids-file <file>]");
    process.exit(1);
  }

  try {
    let videos: VideoMetadata[] = [];
    if (options.videoId) {
      const youtubeService = new (await import("../lib/youtube-service")).YouTubeService(process.env.YOUTUBE_API_KEY || "");
      const video = await youtubeService.getVideoDetails(options.videoId);
      if (video) {
        videos = [video];
      } else {
        safeLog("error", `❌ No metadata found for video ${options.videoId}`);
        process.exit(1);
      }
    } else {
      videos = await searchDiseaseVideos(options.disease!, {
        maxResults: options.maxResults || 1000,
      });
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

    if (outputData.length === 0) {
      safeLog("error", "No videos found to process");
      process.exit(1);
    }

    // Output full metadata if requested
    if (options.outputFile) {
      await fs.writeFile(options.outputFile, JSON.stringify(outputData, null, 2));
      safeLog("info", `✅ Wrote full video metadata to ${options.outputFile}`);
    }

    // Output just video IDs if requested
    if (options.videoIdsFile) {
      const videoIds = outputData.map(video => video.id);
      await fs.writeFile(options.videoIdsFile, JSON.stringify(videoIds, null, 2));
      safeLog("info", `✅ Wrote ${videoIds.length} video IDs to ${options.videoIdsFile}`);
    }

    // If no output file specified, write to stdout
    if (!options.outputFile && !options.videoIdsFile) {
      for (const data of outputData) {
        try {
          process.stdout.write(JSON.stringify(data) + "\n");
          safeLog("info", `[DEBUG] Wrote to stdout: ${JSON.stringify({ id: data.id, title: data.title })}`);
        } catch (error) {
          if (error.code !== 'EPIPE') {
            safeLog("error", `❌ Error writing to stdout: ${error.message}`);
          } else {
            safeLog("info", `[DEBUG] EPIPE detected, ignoring broken pipe`);
          }
        }
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