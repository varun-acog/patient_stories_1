// bin/transcript-fetcher.ts
import { getTranscript } from "../lib/youtube";
import { safeLog } from "../lib/logger";
import fs from "fs/promises";
import path from "path";

interface Options {
  inputFile?: string;
  outputFile?: string;
  videoId?: string;
}

async function main() {
  const options: Options = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input-file" && i + 1 < args.length) {
      options.inputFile = args[i + 1];
      i++;
    } else if (args[i] === "--output-file" && i + 1 < args.length) {
      options.outputFile = args[i + 1];
      i++;
    } else if (args[i] === "--video-id" && i + 1 < args.length) {
      options.videoId = args[i + 1];
      i++;
    }
  }

  if (!options.inputFile && !options.videoId) {
    safeLog("error", "Usage: transcript-fetcher.ts --input-file <videoIds_file> [--output-file <file>]");
    safeLog("error", "       transcript-fetcher.ts --video-id <video_id> [--output-file <file>]");
    process.exit(1);
  }

  let videoIds: string[] = [];
  try {
    if (options.videoId) {
      videoIds = [options.videoId];
    } else if (options.inputFile) {
      try {
        const inputContent = await fs.readFile(options.inputFile, "utf-8");
        videoIds = JSON.parse(inputContent);
        if (!Array.isArray(videoIds)) throw new Error("Input file must be an array of video IDs");
      } catch (error) {
        if (error.code === "ENOENT") {
          safeLog("warn", `Input file ${options.inputFile} not found; proceeding with empty list`);
          videoIds = [];
        } else {
          safeLog("error", `Failed to parse input file ${options.inputFile}:`, error.message);
          process.exit(1);
        }
      }
    }

    const totalVideos = videoIds.length;
    if (totalVideos === 0) {
      safeLog("warn", "No video IDs to process; writing empty output");
    } else {
      safeLog("info", `Starting transcript fetch for ${totalVideos} videos`);
    }

    const outputData: { videoId: string; transcript: string; language: string }[] = [];
    let completed = 0;

    for (const videoId of videoIds) {
      try {
        const transcriptData = await getTranscript(videoId);
        outputData.push({
          videoId,
          transcript: transcriptData ? transcriptData.transcript : "NOT AVAILABLE",
          language: transcriptData ? transcriptData.language : "unknown"
        });
        if (!transcriptData) {
          safeLog("warn", `No transcript available for video ${videoId}`);
        }
      } catch (error) {
        safeLog("error", `Error fetching transcript for ${videoId}:`, error.message);
        outputData.push({
          videoId,
          transcript: "NOT AVAILABLE",
          language: "unknown"
        });
      }
      completed++;
      safeLog("info", `${completed}/${totalVideos} fetched`);
    }

    if (options.outputFile) {
      await fs.writeFile(options.outputFile, JSON.stringify(outputData, null, 2));
      safeLog("info", `✅ Wrote ${outputData.length} transcripts to ${options.outputFile}`);
    } else {
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