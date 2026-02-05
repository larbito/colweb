import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import JSZip from "jszip";
import { getSupabaseServerClient, createSignedUrl } from "@/lib/supabase/server";

/**
 * Server-side ZIP Generation
 * 
 * Fetches images from Supabase storage and builds ZIP.
 * Avoids 413 errors by not receiving images in request body.
 */
export const maxDuration = 300;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  bookTitle: z.string().default("Coloring-Book"),
  includeMetadata: z.boolean().default(true),
  includePdf: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    
    console.log(`[build-zip] Starting for project ${data.projectId}`);
    
    const supabase = getSupabaseServerClient();
    
    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .eq("user_id", data.userId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    // Fetch all ready assets
    const { data: assets, error: assetsError } = await supabase
      .from("generated_assets")
      .select("*")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .eq("status", "ready")
      .order("page_number", { ascending: true });
    
    if (assetsError) {
      console.error("[build-zip] Failed to fetch assets:", assetsError);
      return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }
    
    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: "No assets found" }, { status: 404 });
    }
    
    console.log(`[build-zip] Found ${assets.length} assets`);
    
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const frontMatterFolder = zip.folder("front-matter");
    
    // Separate assets by type
    const pageAssets = assets.filter(a => a.asset_type === "page_image");
    const frontMatterAssets = assets.filter(a => a.asset_type === "front_matter");
    const pdfAsset = assets.find(a => a.asset_type === "pdf");
    
    // Download helper
    async function downloadFile(storagePath: string): Promise<Buffer | null> {
      try {
        const signedUrl = await createSignedUrl("generated", storagePath);
        if (!signedUrl) return null;
        
        const response = await fetch(signedUrl);
        if (!response.ok) return null;
        
        return Buffer.from(await response.arrayBuffer());
      } catch (err) {
        console.error(`[build-zip] Download failed:`, err);
        return null;
      }
    }
    
    const metadata: {
      title: string;
      pageCount: number;
      pages: Array<{
        pageIndex: number;
        filename: string;
        title?: string;
        prompt?: string;
      }>;
      exportDate: string;
      format: string;
    } = {
      title: data.bookTitle,
      pageCount: 0,
      pages: [],
      exportDate: new Date().toISOString(),
      format: "US Letter (2550x3300 @ 300 DPI)",
    };
    
    // Download and add page images
    let processedCount = 0;
    for (const asset of pageAssets) {
      if (!asset.storage_path) continue;
      
      const buffer = await downloadFile(asset.storage_path);
      if (!buffer) continue;
      
      const paddedIndex = String(asset.page_number || processedCount + 1).padStart(3, "0");
      const title = asset.meta?.title;
      const safeTitle = title ? String(title).replace(/[^a-z0-9]/gi, "-").slice(0, 30) : "";
      const filename = safeTitle ? `page-${paddedIndex}-${safeTitle}.png` : `page-${paddedIndex}.png`;
      
      imagesFolder?.file(filename, buffer);
      
      metadata.pages.push({
        pageIndex: asset.page_number || processedCount + 1,
        filename,
        title: asset.meta?.title,
        prompt: asset.meta?.prompt,
      });
      
      processedCount++;
    }
    
    metadata.pageCount = processedCount;
    
    // Download and add front matter
    for (const asset of frontMatterAssets) {
      if (!asset.storage_path) continue;
      
      const buffer = await downloadFile(asset.storage_path);
      if (!buffer) continue;
      
      const type = asset.meta?.frontMatterType || "unknown";
      frontMatterFolder?.file(`${type}-page.png`, buffer);
    }
    
    // Include PDF if requested and exists
    if (data.includePdf && pdfAsset?.storage_path) {
      const pdfBuffer = await downloadFile(pdfAsset.storage_path);
      if (pdfBuffer) {
        zip.file("book.pdf", pdfBuffer);
      }
    }
    
    // Add metadata
    if (data.includeMetadata) {
      zip.file("metadata.json", JSON.stringify(metadata, null, 2));
    }
    
    // Add README
    const readme = `# ${data.bookTitle}

Exported: ${new Date().toLocaleString()}
Total Pages: ${processedCount}

## Format
All images are in US Letter format (2550x3300 pixels @ 300 DPI).
Perfect for printing on standard US Letter paper (8.5" x 11").

## Files
- images/ - Contains all coloring pages as PNG files
- front-matter/ - Title, copyright, and belongs-to pages
${data.includeMetadata ? "- metadata.json - Page titles and prompts\n" : ""}
`;
    zip.file("README.txt", readme);
    
    // Generate ZIP
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    
    // Upload to storage
    const zipPath = `${data.userId}/${data.projectId}/exports/book.zip`;
    const { error: uploadError } = await supabase.storage
      .from("generated")
      .upload(zipPath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });
    
    if (uploadError) {
      console.error("[build-zip] Failed to upload ZIP:", uploadError);
    }
    
    // Create signed URL for download
    const downloadUrl = await createSignedUrl("generated", zipPath, 3600);
    
    const elapsed = Date.now() - startTime;
    console.log(`[build-zip] Complete: ${processedCount} pages in ${elapsed}ms`);
    
    // Return ZIP as direct download (streaming)
    const safeTitle = data.bookTitle.replace(/[^a-z0-9]/gi, "-");
    
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeTitle}-coloring-book.zip"`,
        "X-File-Count": String(processedCount),
        "X-Download-Url": downloadUrl || "",
      },
    });
    
  } catch (error) {
    console.error("[build-zip] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ZIP generation failed" },
      { status: 500 }
    );
  }
}
