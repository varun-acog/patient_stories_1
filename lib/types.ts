export interface VideoMetadata {
  id: string; // Video ID (primary key)
  title: string;
  description: string;
  publishedDate: string; // ISO 8601 format (e.g., "2023-01-01T12:00:00Z")
  durationInSeconds: number; // Duration in seconds
  viewCount: number;
  url: string;
  channel_name: string;
}

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  order?: "date" | "rating" | "relevance" | "title" | "viewCount";
}

export interface TranscriptSegment {
  videoId: string;
  fullTranscript: string;
  language: string;
}
