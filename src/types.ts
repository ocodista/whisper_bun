export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  segments?: TranscriptSegment[];
  language?: string;
  language_probability?: number;
  error?: string;
}

export interface ChunkInfo {
  path: string;
  chunkNumber: number;
  timestamp: number;
}
