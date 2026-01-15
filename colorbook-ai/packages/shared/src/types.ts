export type TrimPreset = 'US_LETTER' | 'EIGHT_BY_TEN' | 'A4' | 'SQUARE_8_25';
export type Complexity = 'kids' | 'medium' | 'detailed';
export type LineThickness = 'thin' | 'medium' | 'bold';

export type PageStatus = 'draft' | 'queued' | 'generating' | 'ready' | 'failed' | 'approved' | 'rejected';

export type ProjectStatus = 'draft' | 'prompted' | 'generating' | 'ready' | 'failed';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type JobType = 'generate-page' | 'export-pdf';


