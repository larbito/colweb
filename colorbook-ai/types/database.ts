/**
 * Database Types for Supabase
 * 
 * These types mirror the database schema.
 * Update when migrations change the schema.
 */

export type AssetType = 'page_image' | 'front_matter' | 'pdf' | 'zip' | 'preview';
export type AssetStatus = 'generating' | 'ready' | 'failed' | 'expired';

export interface GeneratedAsset {
  id: string;
  project_id: string;
  user_id: string;
  page_number: number | null;
  asset_type: AssetType;
  storage_bucket: string;
  storage_path: string | null;
  mime_type: string;
  status: AssetStatus;
  expires_at: string | null;
  deleted_at: string | null;
  meta: AssetMeta;
  created_at: string;
  updated_at: string;
}

export interface AssetMeta {
  // Generation details
  prompt?: string;
  promptHash?: string;
  attempts?: number;
  maxAttempts?: number;
  
  // Validation results
  validationResult?: {
    valid: boolean;
    notes?: string;
  };
  
  // Front matter specific
  frontMatterType?: 'title' | 'copyright' | 'belongsTo';
  
  // Error details
  error?: string;
  errorCode?: string;
  
  // Image details
  width?: number;
  height?: number;
  fileSize?: number;
  
  // Generation warnings
  warnings?: string[];
  
  // User-provided title/description
  title?: string;
  description?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  project_type: 'coloring_book' | 'quote_book';
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  // Book settings
  bookTitle?: string;
  authorName?: string;
  pageCount?: number;
  complexity?: string;
  orientation?: string;
  
  // Style settings
  styleProfile?: string;
  theme?: string;
  
  // Generation settings
  model?: string;
  size?: string;
}

// Supabase Database type definition
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      generated_assets: {
        Row: GeneratedAsset;
        Insert: Omit<GeneratedAsset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GeneratedAsset, 'id' | 'created_at'>>;
      };
    };
    Enums: {
      asset_type: AssetType;
      asset_status: AssetStatus;
    };
  };
}

// Helper type for creating new assets
export type NewGeneratedAsset = Database['public']['Tables']['generated_assets']['Insert'];
export type UpdateGeneratedAsset = Database['public']['Tables']['generated_assets']['Update'];

// Helper type for creating new projects
export type NewProject = Database['public']['Tables']['projects']['Insert'];
export type UpdateProject = Database['public']['Tables']['projects']['Update'];

