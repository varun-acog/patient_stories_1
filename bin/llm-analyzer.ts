#!/usr/bin/env -S npx tsx
// bin/llm-analyzer.ts

import { analyzeTranscript } from "../lib/ollama";
import { safeLog } from "../lib/logger";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

interface Options {
  inputFile?: string;
  outputFile?: string;
  videoId?: string;
  metadataFile?: string; // Optional metadata file to provide titles
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
    } else if (args[i] === "--metadata-file" && i + 1 < args.length) {
      options.metadataFile = args[i + 1];
      i++;
    }
  }

  if (!options.inputFile && !options.videoId) {
    safeLog("error", "Usage: llm-analyzer.ts [--input-file <file>] [--output-file <file>] [--metadata-file <file>]");
    safeLog("error", "       llm-analyzer.ts --video-id <video_id> [--output-file <file>] [--metadata-file <file>]");
    process.exit(1);
  }

  let inputData: { videoId: string; transcript: string; language?: string; title?: string }[] = [];
  let metadataMap: Record<string, { title: string; description?: string }> = {};

  // Load metadata if provided
  if (options.metadataFile) {
    const metadataContent = await fs.readFile(options.metadataFile, "utf-8");
    const metadata = JSON.parse(metadataContent);
    if (Array.isArray(metadata)) {
      metadata.forEach(item => {
        if (item.id && item.title) {
          metadataMap[item.id] = { title: item.title, description: item.description };
        }
      });
    }
    safeLog("info", `[DEBUG] Loaded metadata for ${Object.keys(metadataMap).length} videos`);
  }

  if (options.videoId) {
    const transcript = await (await import("../lib/youtube")).getTranscript(options.videoId);
    if (transcript) {
      inputData = [{ videoId: options.videoId, transcript, title: metadataMap[options.videoId]?.title }];
    } else {
      safeLog("error", `❌ No transcript available for video ${options.videoId}`);
      process.exit(1);
    }
  } else if (options.inputFile) {
    const inputContent = await fs.readFile(options.inputFile, "utf-8");
    try {
      inputData = JSON.parse(inputContent).map((item: any) => ({
        videoId: item.videoId || item.id,
        transcript: item.transcript,
        title: item.title || metadataMap[item.videoId || item.id]?.title,
      }));
    } catch (error) {
      const lines = inputContent.split("\n").filter(line => line.trim());
      inputData = lines.map(line => {
        try {
          const item = JSON.parse(line);
          return {
            videoId: item.videoId || item.id,
            transcript: item.transcript,
            title: item.title || metadataMap[item.videoId || item.id]?.title,
          };
        } catch (error) {
          safeLog("error", `Failed to parse line as JSON: ${line}`);
          return null;
        }
      }).filter(data => data !== null) as { videoId: string; transcript: string; title?: string }[];
      
      if (inputData.length === 0) {
        process.exit(1);
      }
    }
  }

  if (inputData.length === 0) {
    safeLog("error", "No transcript data to process");
    process.exit(1);
  }

  const outputData: any[] = [];
  for (const { videoId, transcript, title } of inputData) {
    try {
      safeLog("info", `🔍 Analyzing transcript for video ${videoId}...`);
      const result = await analyzeTranscript(videoId, transcript, title || `Video ${videoId}`);
      if (result) {
        safeLog("info", `✅ Analysis completed for ${videoId}`);
        outputData.push({ videoId, ...result });
      } else {
        safeLog("warn", `⚠️ No analysis result for ${videoId}`);
      }
    } catch (error) {
      safeLog("error", `❌ Error analyzing video ${videoId}:`, error);
    }
  }

  if (options.outputFile) {
    await fs.writeFile(options.outputFile, JSON.stringify(outputData, null, 2));
    safeLog("info", `✅ Wrote analysis results to ${options.outputFile}`);
  } else {
    for (const data of outputData) {
      try {
        process.stdout.write(JSON.stringify(data) + "\n");
        safeLog("info", `[DEBUG] Wrote to stdout: ${JSON.stringify({ videoId: data.videoId })}`);
      } catch (error) {
        if (error.code !== 'EPIPE') {
          safeLog("error", `❌ Error writing to stdout: ${error.message}`);
        } else {
          safeLog("info", `[DEBUG] EPIPE detected, ignoring broken pipe`);
        }
      }
    }
  }

  safeLog("info", "✅ Analysis pipeline completed");
}

main().catch((error) => {
  safeLog("error", "🚨 Unhandled error:", error);
  process.exit(1);
});