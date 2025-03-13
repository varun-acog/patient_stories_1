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

  try {
    let videoIds: string[] = [];
    if (options.videoId) {
      videoIds = [options.videoId];
    } else if (options.inputFile) {
      const inputContent = await fs.readFile(options.inputFile, "utf-8");
      let inputData;
      try {
        inputData = JSON.parse(inputContent);
      } catch (error) {
        safeLog("error", `Failed to parse input file as JSON: ${error.message}`);
        process.exit(1);
      }
      
      if (Array.isArray(inputData)) {
        if (inputData.length > 0 && typeof inputData[0] === 'string') {
          videoIds = inputData;
          safeLog("info", `Detected array of string IDs format`);
        } else if (inputData.length > 0 && typeof inputData[0] === 'object') {
          videoIds = inputData
            .map((item: any) => item.id || item.videoId)
            .filter((id: string | null): id is string => id !== null);
          safeLog("info", `Detected array of objects format`);
        }
      }
      
      safeLog("info", `Found ${videoIds.length} video IDs in input file`);
    }

    if (videoIds.length === 0) {
      safeLog("error", "No video IDs to process");
      process.exit(1);
    }

    const outputData: { videoId: string; transcript: string; language: string }[] = [];
    for (const videoId of videoIds) {
      try {
        safeLog("info", `🔍 Fetching transcript for video ${videoId}...`);
        const transcriptData = await getTranscript(videoId);
        if (transcriptData) {
          const { transcript, language } = transcriptData;
          outputData.push({ videoId, transcript, language });
          safeLog("info", `✅ Fetched transcript for video ${videoId}`);
        } else {
          safeLog("warn", `⚠️ No transcript available for video ${videoId}`);
        }
      } catch (error) {
        safeLog("error", `❌ Error processing video ${videoId}:`, error);
      }
    }

    if (options.outputFile) {
      await fs.writeFile(options.outputFile, JSON.stringify(outputData, null, 2));
      safeLog("info", `✅ Wrote transcript fetch results to ${options.outputFile}`);
    } else {
      for (const data of outputData) {
        try {
          process.stdout.write(JSON.stringify(data) + "\n");
          safeLog("info", `[DEBUG] Wrote to stdout: ${JSON.stringify({ videoId: data.videoId, transcriptLength: data.transcript.length, language: data.language })}`);
        } catch (error) {
          if (error.code !== 'EPIPE') {
            safeLog("error", `❌ Error writing to stdout: ${error.message}`);
          } else {
            safeLog("info", `[DEBUG] EPIPE detected, ignoring broken pipe`);
          }
        }
      }
    }

    safeLog("info", `✅ Transcript fetching completed for ${outputData.length}/${videoIds.length} videos`);
  } catch (error) {
    safeLog("error", "❌ Error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  safeLog("error", "Unhandled error:", error);
  process.exit(1);
});