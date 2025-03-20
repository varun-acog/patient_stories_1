import { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { safeLog } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { disease, keywords } = req.body;

    if (!disease || typeof disease !== "string") {
      return res.status(400).json({ error: "A valid disease name is required" });
    }

    const searchName = keywords ? `${disease} ${keywords}`.trim() : disease;

    const pool = await getPool();

    // Check if the search term exists in SearchConfig
    const searchConfigResult = await pool.query(
      `SELECT creation_date FROM SearchConfig WHERE search_name = $1`,
      [searchName]
    );

    if (searchConfigResult.rows.length === 0) {
      return res.status(404).json({ error: `No data found for search term "${searchName}"` });
    }

    const lastUpdated = searchConfigResult.rows[0].creation_date;

    // Count videos
    const videoCountResult = await pool.query(
      `SELECT COUNT(*) FROM videos WHERE search_name = $1`,
      [searchName]
    );
    const videoCount = parseInt(videoCountResult.rows[0].count, 10);

    // Count transcripts
    const transcriptCountResult = await pool.query(
      `SELECT COUNT(*) FROM transcripts WHERE video_id IN (
        SELECT video_id FROM videos WHERE search_name = $1
      )`,
      [searchName]
    );
    const transcriptCount = parseInt(transcriptCountResult.rows[0].count, 10);

    // Count analyzed videos
    const analysisCountResult = await pool.query(
      `SELECT COUNT(*) FROM analysis WHERE video_id IN (
        SELECT video_id FROM videos WHERE search_name = $1
      )`,
      [searchName]
    );
    const analysisCount = parseInt(analysisCountResult.rows[0].count, 10);

    // Count patient stories
    const patientStoriesCountResult = await pool.query(
      `SELECT COUNT(*) FROM analysis WHERE video_type = 'patient story' AND video_id IN (
        SELECT video_id FROM videos WHERE search_name = $1
      )`,
      [searchName]
    );
    const patientStoriesCount = parseInt(patientStoriesCountResult.rows[0].count, 10);

    // Count KOL interviews
    const kolInterviewsCountResult = await pool.query(
      `SELECT COUNT(*) FROM analysis WHERE video_type = 'KOL interview' AND video_id IN (
        SELECT video_id FROM videos WHERE search_name = $1
      )`,
      [searchName]
    );
    const kolInterviewsCount = parseInt(kolInterviewsCountResult.rows[0].count, 10);

    // Get the LLM model from environment variable
    const llmModel = process.env.LLM_MODEL || "Unknown";

    return res.status(200).json({
      videoCount,
      transcriptCount,
      analysisCount,
      patientStoriesCount,
      kolInterviewsCount,
      llmModel,
      lastUpdated: lastUpdated.toISOString(),
    });
  } catch (error: any) {
    safeLog("error", "API error in /api/search:", error.message);
    return res.status(500).json({ error: "Failed to process request", details: error.message });
  }
}