// lib/database.ts
import pkg from 'pg';
const { Pool } = pkg;
import { safeLog } from './logger';
import { AnalysisResult } from "./ollama";

let pool: Pool | null = null;

async function connectWithRetry(retries = 5, retryInterval = 2000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      safeLog("info", `Attempting to connect to database (attempt ${attempt + 1}/${retries})...`);
      const newPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      await newPool.query('SELECT 1');
      safeLog("info", "Successfully connected to PostgreSQL database!");
      return newPool;
    } catch (error) {
      attempt++;
      safeLog("error", `Database connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt >= retries) throw error;
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error("Failed to connect to database after multiple attempts");
}

export async function initializeDatabase() {
  try {
    if (!pool) pool = await connectWithRetry();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        video_id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        published_date TIMESTAMP NULL,
        duration_seconds INTEGER,
        url TEXT NOT NULL,
        channel_name TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        transcript_id SERIAL PRIMARY KEY,
        video_id VARCHAR(255) UNIQUE NOT NULL,
        full_transcript TEXT NOT NULL,
        language VARCHAR(10) NOT NULL,
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis (
        video_id VARCHAR(255) PRIMARY KEY,
        video_type TEXT,
        name TEXT,
        age TEXT,
        sex TEXT,
        location TEXT,
        symptoms JSONB,
        medical_history_of_patient JSONB,
        family_medical_history JSONB,
        challenges_faced_during_diagnosis JSONB,
        key_opinion TEXT,
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE
      )
    `);

    safeLog("info", "Database initialized successfully");
  } catch (error) {
    safeLog("error", "Error initializing database:", error);
    throw error;
  }
}

export async function getPool(): Promise<Pool> {
  if (!pool) await initializeDatabase();
  if (!pool) throw new Error("Database pool not initialized");
  return pool;
}

export async function storeVideo(metadata: VideoMetadata) {
  try {
    const pool = await getPool();
    const query = `
      INSERT INTO videos (video_id, title, description, published_date, duration_seconds, url, channel_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (video_id) DO UPDATE 
      SET title = $2, description = $3, published_date = $4, duration_seconds = $5, url = $6, channel_name = $7
    `;
    await pool.query(query, [
      metadata.id,
      metadata.title,
      metadata.description,
      metadata.publishedDate || null,
      metadata.durationInSeconds || null,
      metadata.url || `https://youtube.com/watch?v=${metadata.id}`,
      metadata.channel_name || "",
    ]);
    safeLog("info", `✅ Video metadata stored for ${metadata.id}`);
  } catch (error) {
    safeLog("error", `Error storing metadata for video ${metadata.id}:`, error);
    throw error;
  }
}

export async function storeTranscript(videoId: string, transcript: string, language: string = 'en') {
  try {
    const pool = await getPool();
    const query = `
      INSERT INTO transcripts (video_id, full_transcript, language)
      VALUES ($1, $2, $3)
      ON CONFLICT (video_id) DO UPDATE 
      SET full_transcript = $2, language = $3
    `;
    await pool.query(query, [videoId, transcript, language]);
    safeLog("info", `✅ Transcript stored for video ${videoId}`);
  } catch (error) {
    safeLog("error", `❌ Error storing transcript for ${videoId}:`, error);
    throw error;
  }
}

export async function getTranscript(videoId: string) {
  try {
    const pool = await getPool();
    const query = `
      SELECT full_transcript, language
      FROM transcripts
      WHERE video_id = $1
    `;
    const result = await pool.query(query, [videoId]);
    return result.rows[0] ? { fullTranscript: result.rows[0].full_transcript, language: result.rows[0].language } : null;
  } catch (error) {
    safeLog("error", `Error fetching transcript for ${videoId}:`, error);
    throw error;
  }
}

export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  try {
    const pool = await getPool();
    const query = `
      SELECT video_id AS id, title, description, published_date AS "publishedDate", 
             duration_seconds AS "durationInSeconds", url, channel_name
      FROM videos
      WHERE video_id = $1
    `;
    const result = await pool.query(query, [videoId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      publishedDate: row.publishedDate || "",
      durationInSeconds: row.durationInSeconds || 0,
      viewCount: 0, // Not stored; fetch from YouTube API if needed
      url: row.url,
      channel_name: row.channel_name,
    };
  } catch (error) {
    safeLog("error", `Error fetching metadata for video ${videoId}:`, error);
    throw error;
  }
}

export async function storeAnalysis(videoId: string, analysis: AnalysisResult) {
  try {
    const pool = await getPool();
    const query = `
      INSERT INTO analysis (
        video_id, video_type, name, age, sex, location, symptoms, 
        medical_history_of_patient, family_medical_history, 
        challenges_faced_during_diagnosis, key_opinion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (video_id) 
      DO UPDATE SET 
        video_type = EXCLUDED.video_type,
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        sex = EXCLUDED.sex,
        location = EXCLUDED.location,
        symptoms = EXCLUDED.symptoms,
        medical_history_of_patient = EXCLUDED.medical_history_of_patient,
        family_medical_history = EXCLUDED.family_medical_history,
        challenges_faced_during_diagnosis = EXCLUDED.challenges_faced_during_diagnosis,
        key_opinion = EXCLUDED.key_opinion
    `;
    await pool.query(query, [
      videoId,
      analysis.video_type,
      analysis.name,
      analysis.age,
      analysis.sex,
      analysis.location,
      analysis.symptoms ? JSON.stringify(analysis.symptoms) : null,
      analysis.medicalHistoryOfPatient ? JSON.stringify(analysis.medicalHistoryOfPatient) : null,
      analysis.familyMedicalHistory ? JSON.stringify(analysis.familyMedicalHistory) : null,
      analysis.challengesFacedDuringDiagnosis ? JSON.stringify(analysis.challengesFacedDuringDiagnosis) : null,
      analysis.key_opinion,
    ]);
    safeLog("info", `✅ Analysis stored for video ${videoId}`);
  } catch (error) {
    safeLog("error", `❌ Error storing analysis for ${videoId}:`, error);
    throw error;
  }
}

export async function getAllVideoIds(): Promise<string[]> {
  try {
    const pool = await getPool();
    const result = await pool.query("SELECT video_id FROM videos");
    return result.rows.map((row: any) => row.video_id);
  } catch (error) {
    safeLog("error", "Error fetching all video IDs:", error);
    throw error;
  }
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  publishedDate: string;
  durationInSeconds: number;
  viewCount: number;
  url: string;
  channel_name: string;
}

process.on("SIGTERM", () => pool?.end());
process.on("SIGINT", () => pool?.end());