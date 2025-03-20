// lib/database.ts
import pg from "pg";
const { Pool } = pg;
import { safeLog } from "./logger";

let pool: Pool | null = null;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    pool.on("error", (err) => {
      safeLog("error", "Unexpected error on idle client", err);
      process.exit(-1);
    });
  }
  return pool;
}

export async function initializeDatabase() {
  const pool = await getPool();
  try {
    safeLog("info", "Attempting to connect to database...");
    await pool.query("SELECT NOW()");
    safeLog("info", "Successfully connected to PostgreSQL database!");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        video_id VARCHAR(255) PRIMARY KEY,
        search_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        published_date TIMESTAMP,
        duration_seconds INTEGER,
        url TEXT NOT NULL,
        channel_name TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        video_id VARCHAR(255) PRIMARY KEY,
        full_transcript TEXT NOT NULL,
        language VARCHAR(255) NOT NULL,
        FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE CASCADE
      );
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
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS SearchConfig (
        param_id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        search_phrase TEXT NOT NULL,
        search_name TEXT NOT NULL UNIQUE,
        creation_date TIMESTAMP NOT NULL
      );
    `);

    safeLog("info", "Database initialized successfully");
  } catch (error) {
    safeLog("error", "Error initializing database:", error);
    throw error;
  }
}

export interface VideoData {
  id: string;
  search_name?: string;
  title: string;
  description: string;
  publishedDate: string;
  durationInSeconds: number;
  viewCount: number;
  url: string;
  channel_name: string;
}

export async function storeVideo(video: VideoData) {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO videos (video_id, search_name, title, description, published_date, duration_seconds, url, channel_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (video_id) DO UPDATE SET
       search_name = EXCLUDED.search_name,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       published_date = EXCLUDED.published_date,
       duration_seconds = EXCLUDED.duration_seconds,
       url = EXCLUDED.url,
       channel_name = EXCLUDED.channel_name`,
    [
      video.id,
      video.search_name || "unknown",
      video.title,
      video.description,
      video.publishedDate || null,
      video.durationInSeconds,
      video.url,
      video.channel_name,
    ]
  );
}

export async function storeTranscript(videoId: string, transcript: string, language: string) {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO transcripts (video_id, full_transcript, language)
     VALUES ($1, $2, $3)
     ON CONFLICT (video_id) DO UPDATE SET
       full_transcript = EXCLUDED.full_transcript,
       language = EXCLUDED.language`,
    [videoId, transcript, language]
  );
}

export async function storeAnalysis(videoId: string, analysis: any) {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO analysis (
       video_id, video_type, name, age, sex, location, symptoms,
       medical_history_of_patient, family_medical_history,
       challenges_faced_during_diagnosis, key_opinion
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (video_id) DO UPDATE SET
       video_type = EXCLUDED.video_type,
       name = EXCLUDED.name,
       age = EXCLUDED.age,
       sex = EXCLUDED.sex,
       location = EXCLUDED.location,
       symptoms = EXCLUDED.symptoms,
       medical_history_of_patient = EXCLUDED.medical_history_of_patient,
       family_medical_history = EXCLUDED.family_medical_history,
       challenges_faced_during_diagnosis = EXCLUDED.challenges_faced_during_diagnosis,
       key_opinion = EXCLUDED.key_opinion`,
    [
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
    ]
  );
}