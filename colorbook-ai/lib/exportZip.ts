/**
 * exportZip.ts
 * 
 * Streaming ZIP builder for coloring book exports.
 * Creates organized ZIP files with pages, extras, and metadata.
 * 
 * Structure:
 *   /pages/page-001.png ... page-080.png
 *   /extras/title-page.png (optional)
 *   /extras/copyright.png (optional)
 *   /meta/prompts.json
 *   /meta/book.json
 */

import JSZip from "jszip";

export interface PageData {
  pageIndex: number;
  imageBase64: string;
  title?: string;
  prompt?: string;
  finalPrompt?: string;
}

export interface ExtraPage {
  type: "title" | "copyright" | "belongs-to";
  imageBase64: string;
}

export interface BookMetadata {
  title: string;
  createdAt: string;
  pageCount: number;
  bookType?: string;
  complexity?: string;
  pageSize?: string;
  authorName?: string;
  settings?: Record<string, unknown>;
}

export interface ZipExportInput {
  pages: PageData[];
  extras?: ExtraPage[];
  metadata: BookMetadata;
}

export interface ZipExportResult {
  zipBuffer: Buffer;
  fileCount: number;
  totalSizeBytes: number;
}

/**
 * Create a ZIP file with organized structure for coloring book export.
 * 
 * @param input - Pages, extras, and metadata
 * @returns ZIP buffer ready to stream as response
 */
export async function createBookZip(input: ZipExportInput): Promise<ZipExportResult> {
  const { pages, extras = [], metadata } = input;
  
  const zip = new JSZip();
  let fileCount = 0;
  
  // Create pages folder
  const pagesFolder = zip.folder("pages");
  if (!pagesFolder) {
    throw new Error("Failed to create pages folder");
  }
  
  // Add coloring pages
  const promptsData: {
    pageIndex: number;
    filename: string;
    title?: string;
    prompt?: string;
    finalPrompt?: string;
  }[] = [];
  
  for (const page of pages) {
    try {
      const imageBuffer = Buffer.from(page.imageBase64, "base64");
      const filename = `page-${String(page.pageIndex).padStart(3, "0")}.png`;
      pagesFolder.file(filename, imageBuffer);
      fileCount++;
      
      promptsData.push({
        pageIndex: page.pageIndex,
        filename,
        title: page.title,
        prompt: page.prompt,
        finalPrompt: page.finalPrompt,
      });
    } catch (error) {
      console.error(`[exportZip] Failed to add page ${page.pageIndex}:`, error);
    }
  }
  
  // Create extras folder if we have extras
  if (extras.length > 0) {
    const extrasFolder = zip.folder("extras");
    if (extrasFolder) {
      for (const extra of extras) {
        try {
          const imageBuffer = Buffer.from(extra.imageBase64, "base64");
          const filename = `${extra.type}.png`;
          extrasFolder.file(filename, imageBuffer);
          fileCount++;
        } catch (error) {
          console.error(`[exportZip] Failed to add extra ${extra.type}:`, error);
        }
      }
    }
  }
  
  // Create meta folder
  const metaFolder = zip.folder("meta");
  if (metaFolder) {
    // Add prompts.json
    const promptsJson = JSON.stringify(promptsData, null, 2);
    metaFolder.file("prompts.json", promptsJson);
    fileCount++;
    
    // Add book.json
    const bookJson = JSON.stringify({
      ...metadata,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }, null, 2);
    metaFolder.file("book.json", bookJson);
    fileCount++;
  }
  
  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  
  return {
    zipBuffer,
    fileCount,
    totalSizeBytes: zipBuffer.length,
  };
}

/**
 * Generate a safe filename for the ZIP.
 */
export function getSafeZipFilename(title: string): string {
  const sanitized = title
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
    .toLowerCase();
  
  return `${sanitized || "coloring-book"}.zip`;
}

