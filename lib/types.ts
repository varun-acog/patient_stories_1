// lib/types.ts
export interface SearchOptions {
  maxResults?: number;
  yearsBack?: number;
  startDate?: string;  // e.g., "2025-03-01"
  endDate?: string;    // e.g., "2025-03-24"
  order?: string;      // e.g., "relevance", "date"
  language?: string;   // e.g., "en"
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  publishedDate: string;
  durationInSeconds: number;
  viewCount: number;
  url: string;
  thumbnail?: string;
  channel_name: string;
  search_name?: string;  // Optional, added by youtube-fetcher.ts
}

export interface TranscriptSegment {
  videoId: string;
  fullTranscript: string;
  language: string;
}
