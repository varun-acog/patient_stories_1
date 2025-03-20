// bin/database-manager.ts
import { initializeDatabase, storeVideo, storeTranscript, storeAnalysis, getPool } from "../lib/database";
import { safeLog } from "../lib/logger";
import fs from "fs/promises";

interface Options {
  metadataFile?: string;
  transcriptsFile?: string;
  analysisFile?: string;
  searchConfigFile?: string;
  clear?: boolean;
  list?: string;
  videoId?: string;
  delete?: string;
  createVideo?: string;
  createTranscript?: string;
  createAnalysis?: string;
}

async function clearAllTables() {
  try {
    const pool = await getPool();
    await pool.query("TRUNCATE TABLE videos CASCADE");
    safeLog("info", "✅ All data cleared from videos, transcripts, and analysis tables");
  } catch (error) {
    safeLog("error", "❌ Error clearing tables:", error);
    throw error;
  }
}

async function listRecords(table: string, videoId?: string) {
  try {
    const pool = await getPool();
    let query: string;
    let params: string[] = [];
    switch (table.toLowerCase()) {
      case "videos":
        query = videoId ? "SELECT * FROM videos WHERE video_id = $1" : "SELECT * FROM videos";
        break;
      case "transcripts":
        query = videoId ? "SELECT * FROM transcripts WHERE video_id = $1" : "SELECT * FROM transcripts";
        break;
      case "analysis":
        query = videoId ? "SELECT * FROM analysis WHERE video_id = $1" : "SELECT * FROM analysis";
        break;
      default:
        throw new Error(`Invalid table name: ${table}. Use 'videos', 'transcripts', or 'analysis'.`);
    }

    if (videoId) params = [videoId];
    const result = await pool.query(query, params);
    safeLog("info", `✅ Retrieved ${result.rows.length} records from ${table}`);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    safeLog("error", `❌ Error listing records from ${table}:`, error);
    throw error;
  }
}

async function deleteRecord(videoId: string) {
  try {
    const pool = await getPool();
    const result = await pool.query("DELETE FROM videos WHERE video_id = $1", [videoId]);
    if (result.rowCount === 0) {
      safeLog("warn", `⚠️ No record found with video_id ${videoId}`);
    } else {
      safeLog("info", `✅ Deleted record with video_id ${videoId} from videos (cascaded to transcripts and analysis)`);
    }
  } catch (error) {
    safeLog("error", `❌ Error deleting record with video_id ${videoId}:`, error);
    throw error;
  }
}

async function storeSearchConfig(config: { user_id: string; search_phrase: string; search_name: string }) {
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO SearchConfig (user_id, search_phrase, search_name, creation_date)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (search_name) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         search_phrase = EXCLUDED.search_phrase,
         creation_date = NOW()`,
      [config.user_id, config.search_phrase, config.search_name]
    );
    safeLog("info", `✅ Stored SearchConfig for search_name ${config.search_name}`);
  } catch (error) {
    safeLog("error", `❌ Error storing SearchConfig:`, error);
    throw error;
  }
}

async function main() {
  const options: Options = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--metadata-file" && i + 1 < args.length) {
      options.metadataFile = args[i + 1];
      i++;
    } else if (args[i] === "--transcripts-file" && i + 1 < args.length) {
      options.transcriptsFile = args[i + 1];
      i++;
    } else if (args[i] === "--analysis-file" && i + 1 < args.length) {
      options.analysisFile = args[i + 1];
      i++;
    } else if (args[i] === "--search-config-file" && i + 1 < args.length) {
      options.searchConfigFile = args[i + 1];
      i++;
    } else if (args[i] === "--clear") {
      options.clear = true;
    } else if (args[i] === "--list" && i + 1 < args.length) {
      options.list = args[i + 1];
      i++;
    } else if (args[i] === "--video-id" && i + 1 < args.length) {
      options.videoId = args[i + 1];
      i++;
    } else if (args[i] === "--delete" && i + 1 < args.length) {
      options.delete = args[i + 1];
      i++;
    } else if (args[i] === "--create-video" && i + 1 < args.length) {
      options.createVideo = args[i + 1];
      i++;
    } else if (args[i] === "--create-transcript" && i + 1 < args.length) {
      options.createTranscript = args[i + 1];
      i++;
    } else if (args[i] === "--create-analysis" && i + 1 < args.length) {
      options.createAnalysis = args[i + 1];
      i++;
    }
  }

  if (!options.metadataFile && !options.transcriptsFile && !options.analysisFile && !options.searchConfigFile && !options.clear && 
      !options.list && !options.delete && !options.createVideo && !options.createTranscript && !options.createAnalysis) {
    safeLog("error", "Usage: database-manager.ts [options]");
    safeLog("error", "Options:");
    safeLog("error", "  --metadata-file <file>    Path to metadata file from youtube-fetcher");
    safeLog("error", "  --transcripts-file <file> Path to transcripts file from transcript-fetcher");
    safeLog("error", "  --analysis-file <file>    Path to analysis file from llm-analyzer");
    safeLog("error", "  --search-config-file <file> Path to search config file");
    safeLog("error", "  --clear                   Clear all data from all tables");
    safeLog("error", "  --list <table>            List records from table (videos, transcripts, analysis)");
    safeLog("error", "  --video-id <id>           Filter list or specify record for delete");
    safeLog("error", "  --delete <video_id>       Delete record by video_id");
    safeLog("error", "  --create-video <json>     Create a video record (JSON format)");
    safeLog("error", "  --create-transcript <json> Create a transcript record (JSON format)");
    safeLog("error", "  --create-analysis <json>  Create an analysis record (JSON format)");
    process.exit(1);
  }

  try {
    await initializeDatabase();

    if (options.clear) {
      await clearAllTables();
    }

    if (options.list) {
      await listRecords(options.list, options.videoId);
    }

    if (options.delete) {
      await deleteRecord(options.delete);
    }

    if (options.createVideo) {
      const videoData = JSON.parse(options.createVideo);
      await storeVideo({
        id: videoData.id,
        title: videoData.title,
        description: videoData.description || "",
        publishedDate: videoData.publishedDate || "",
        durationInSeconds: videoData.durationInSeconds || 0,
        viewCount: videoData.viewCount || 0,
        url: videoData.url || `https://youtube.com/watch?v=${videoData.id}`,
        channel_name: videoData.channel_name || "",
      });
      safeLog("info", `✅ Created video record for ${videoData.id}`);
    }

    if (options.createTranscript) {
      const transcriptData = JSON.parse(options.createTranscript);
      await storeTranscript(
        transcriptData.videoId,
        transcriptData.transcript,
        transcriptData.language // No default override
      );
      safeLog("info", `✅ Created transcript record for ${transcriptData.videoId}`);
    }

    if (options.createAnalysis) {
      const analysisData = JSON.parse(options.createAnalysis);
      await storeAnalysis(analysisData.videoId, {
        video_type: analysisData.video_type,
        name: analysisData.name,
        age: analysisData.age,
        sex: analysisData.sex,
        location: analysisData.location,
        symptoms: analysisData.symptoms,
        medicalHistoryOfPatient: analysisData.medicalHistoryOfPatient,
        familyMedicalHistory: analysisData.familyMedicalHistory,
        challengesFacedDuringDiagnosis: analysisData.challengesFacedDuringDiagnosis,
        key_opinion: analysisData.key_opinion,
      });
      safeLog("info", `✅ Created analysis record for ${analysisData.videoId}`);
    }

    if (options.metadataFile) {
      const metadataContent = await fs.readFile(options.metadataFile, "utf-8");
      const metadata = JSON.parse(metadataContent);
      for (const video of metadata) {
        await storeVideo({
          id: video.id,
          title: video.title,
          description: video.description || "",
          publishedDate: video.publishedDate || "",
          durationInSeconds: video.durationInSeconds || 0,
          viewCount: video.viewCount || 0,
          url: video.url || `https://youtube.com/watch?v=${video.id}`,
          channel_name: video.channel_name || "",
          search_name: video.search_name || "unknown" // Fallback adjusted
        });
        safeLog("info", `✅ Stored metadata for video ${video.id}`);
      }
    }

    if (options.transcriptsFile) {
      const transcriptsContent = await fs.readFile(options.transcriptsFile, "utf-8");
      const transcripts = JSON.parse(transcriptsContent);
      for (const { videoId, transcript, language } of transcripts) {
        await storeTranscript(videoId, transcript, language); // No default override
        safeLog("info", `✅ Stored transcript for video ${videoId}`);
      }
    }

    if (options.analysisFile) {
      const analysisContent = await fs.readFile(options.analysisFile, "utf-8");
      const analysisData = JSON.parse(analysisContent);
      for (const { videoId, ...analysis } of analysisData) {
        await storeAnalysis(videoId, analysis);
        safeLog("info", `✅ Stored analysis for video ${videoId}`);
      }
    }

    if (options.searchConfigFile) {
      const configContent = await fs.readFile(options.searchConfigFile, "utf-8");
      const configData = JSON.parse(configContent);
      for (const config of configData) {
        await storeSearchConfig({
          user_id: config.user_id,
          search_phrase: config.search_phrase,
          search_name: config.search_name
        });
      }
    }

    safeLog("info", "✅ Database management completed");
  } catch (error) {
    safeLog("error", "❌ Error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  safeLog("error", "Unhandled error:", error);
  process.exit(1);
});