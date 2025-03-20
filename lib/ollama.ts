// lib/ollama.ts
import myLama from "./MyLama";
import { safeLog } from "./logger";
import * as yaml from "js-yaml";
import * as fs from "fs";
import path from "path";

let DISEASE_SPACE_PROMPT: string;

try {
  const promptLibraryPath = path.join(process.cwd(), "prompt_library.yaml");
  safeLog("error", `[DEBUG] Loading prompt from: ${promptLibraryPath}`);
  const promptLibrary = yaml.load(fs.readFileSync(promptLibraryPath, "utf8")) as any;
  DISEASE_SPACE_PROMPT = promptLibrary.disease_space.prompt;
  if (!DISEASE_SPACE_PROMPT) {
    throw new Error("disease_space.prompt not found in prompt_library.yaml");
  }
} catch (error) {
  safeLog("error", "❌ Error loading prompt template:", error);
  process.exit(1);
}

export interface AnalysisResult {
  video_type: string;
  name: string | null;
  age: string | null;
  sex: string | null;
  location: string | null;
  symptoms: string[] | null;
  medicalHistoryOfPatient: Record<string, any> | null;
  familyMedicalHistory: Record<string, any> | null;
  challengesFacedDuringDiagnosis: string[] | null;
  key_opinion: string | null;
}

export async function analyzeTranscript(videoId: string, transcript: string, title: string): Promise<AnalysisResult | null> {
  safeLog("error", `[DEBUG] Starting analysis for video ${videoId}...`);

  try {
    if (!transcript || transcript.trim().length === 0) {
      safeLog("error", `❌ No valid transcript provided for video ${videoId}`);
      return null;
    }
    safeLog("error", `[DEBUG] Using provided transcript of length: ${transcript.length}`);
    safeLog("error", `[DEBUG] Transcript preview: ${transcript.slice(0, 100)}...`);

    const structuredPrompt = DISEASE_SPACE_PROMPT
      .replace("{title}", title)
      .replace("{transcript}", transcript);
    safeLog("error", `[DEBUG] Structured prompt: ${structuredPrompt.slice(0, 200)}...`);

    safeLog("error", "[DEBUG] Sending to LLM...");
    const content = await myLama.generate(structuredPrompt);
    if (!content) {
      safeLog("error", `[ERROR] LLM returned empty response for video ${videoId}`);
      return null;
    }
    safeLog("error", "[DEBUG] Raw LLM response:", content);

    const jsonMatch = content.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      safeLog("error", `[ERROR] No JSON found in LLM response for video ${videoId}: ${content}`);
      return null;
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    safeLog("error", "[DEBUG] Parsed JSON:", JSON.stringify(parsedData, null, 2));

    const analysisResult: AnalysisResult = {
      video_type: parsedData.video_type || "Informational",
      name: parsedData.name || null,
      age: parsedData.age || null,
      sex: parsedData.sex || null,
      location: parsedData.location || null,
      symptoms: Array.isArray(parsedData.symptoms) ? parsedData.symptoms : null,
      medicalHistoryOfPatient: typeof parsedData.medicalHistoryOfPatient === "object" ? parsedData.medicalHistoryOfPatient : null,
      familyMedicalHistory: typeof parsedData.familyMedicalHistory === "object" ? parsedData.familyMedicalHistory : null,
      challengesFacedDuringDiagnosis: Array.isArray(parsedData.challengesFacedDuringDiagnosis) ? parsedData.challengesFacedDuringDiagnosis : null,
      key_opinion: parsedData.key_opinion || null
    };

    return analysisResult;
  } catch (error) {
    safeLog("error", `❌ Error analyzing video ${videoId}:`, error);
    return null;
  }
}