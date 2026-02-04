"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard, SubSection } from "@/components/app/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileDown,
  Download,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Eye,
  Archive,
  FileText,
  BookOpen,
  Hash,
  Settings2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PageData {
  pageIndex: number;
  imageBase64: string;
  title?: string;
  prompt?: string;
}

type ExportStep = "configure" | "preview" | "download";

function ExportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Step state
  const [currentStep, setCurrentStep] = useState<ExportStep>("configure");
  
  // Retrieve pages from session storage
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // PDF options
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includeCopyrightPage, setIncludeCopyrightPage] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [bookTitle, setBookTitle] = useState("My Coloring Book");
  const [authorName, setAuthorName] = useState("");
  const [copyrightText, setCopyrightText] = useState("");
  
  // Title page preview (generated separately)
  const [titlePagePreview, setTitlePagePreview] = useState<string | null>(null);
  const [copyrightPagePreview, setCopyrightPagePreview] = useState<string | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingCopyright, setIsGeneratingCopyright] = useState(false);
  
  // PDF state
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  
  // ZIP state
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  
  // Load pages from session storage
  useEffect(() => {
    try {
      const storedPages = sessionStorage.getItem("exportPages");
      if (storedPages) {
        const parsed = JSON.parse(storedPages);
        setPages(parsed);
        
        // Get book title from URL if present
        const title = searchParams.get("title");
        if (title) setBookTitle(title);
      }
    } catch (e) {
      console.error("Failed to load pages:", e);
    }
    setIsLoading(false);
  }, [searchParams]);
  
  // Generate title page preview
  const generateTitlePreview = async () => {
    setIsGeneratingTitle(true);
    try {
      const response = await fetch("/api/front-matter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "title",
          options: {
            bookTitle,
            authorName: authorName || undefined,
            year: new Date().getFullYear().toString(),
          },
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "done" && data.imageBase64) {
        // Build proper data URL
        const imageDataUrl = data.imageBase64.startsWith("data:") 
          ? data.imageBase64 
          : `data:image/png;base64,${data.imageBase64}`;
        setTitlePagePreview(imageDataUrl);
        toast.success("Title page ready");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      console.error("[export/titlePage] Error:", error);
      toast.error("Failed to generate title page");
    }
    setIsGeneratingTitle(false);
  };
  
  // Generate copyright page preview
  const generateCopyrightPreview = async () => {
    setIsGeneratingCopyright(true);
    try {
      const response = await fetch("/api/front-matter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "copyright",
          options: {
            bookTitle,
            authorName: authorName || undefined,
            year: new Date().getFullYear().toString(),
          },
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "done" && data.imageBase64) {
        // Build proper data URL
        const imageDataUrl = data.imageBase64.startsWith("data:") 
          ? data.imageBase64 
          : `data:image/png;base64,${data.imageBase64}`;
        setCopyrightPagePreview(imageDataUrl);
        toast.success("Copyright page ready");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      console.error("[export/copyrightPage] Error:", error);
      toast.error("Failed to generate copyright page");
    }
    setIsGeneratingCopyright(false);
  };
  
  // Generate PDF
  const generatePdf = async (previewOnly = false) => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pages.map((p, idx) => ({
            pageIndex: idx + 1,
            imageBase64: p.imageBase64,
            title: p.title,
            isProcessed: false, // Will be processed to US Letter
          })),
          includeTitlePage,
          includeCopyrightPage,
          includePageNumbers,
          bookTitle,
          authorName: authorName || undefined,
          copyrightText: copyrightText || undefined,
          previewMode: previewOnly,
          previewPageCount: 5,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "PDF generation failed");
      }
      
      const data = await response.json();
      setPdfBase64(data.pdfBase64);
      setPdfProgress(100);
      
      if (!previewOnly) {
        toast.success(`PDF ready! ${data.totalPages} pages`);
      }
      
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error(error instanceof Error ? error.message : "PDF generation failed");
    }
    
    setIsGeneratingPdf(false);
  };
  
  // Download PDF
  const downloadPdf = () => {
    if (!pdfBase64) return;
    
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `${bookTitle.replace(/[^a-z0-9]/gi, "-")}-coloring-book.pdf`;
    link.click();
    
    toast.success("PDF downloaded!");
  };
  
  // Generate and download ZIP
  const generateZip = async () => {
    setIsGeneratingZip(true);
    
    try {
      const response = await fetch("/api/export/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pages.map((p, idx) => ({
            pageIndex: idx + 1,
            imageBase64: p.imageBase64,
            title: p.title,
            prompt: p.prompt,
            isProcessed: false,
          })),
          bookTitle,
          includeMetadata: true,
          processToLetter: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "ZIP generation failed");
      }
      
      const data = await response.json();
      
      // Download ZIP
      const link = document.createElement("a");
      link.href = `data:application/zip;base64,${data.zipBase64}`;
      link.download = data.filename;
      link.click();
      
      toast.success(`ZIP downloaded! ${data.processedPages} pages`);
      
    } catch (error) {
      console.error("ZIP generation failed:", error);
      toast.error(error instanceof Error ? error.message : "ZIP generation failed");
    }
    
    setIsGeneratingZip(false);
  };
  
  // Step navigation
  const goToStep = (step: ExportStep) => {
    if (step === "preview" && !pdfBase64) {
      generatePdf(true);
    }
    setCurrentStep(step);
  };
  
  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }
  
  if (pages.length === 0) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Pages to Export</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Generate some coloring pages first, then come back to export them as PDF or ZIP.
          </p>
          <Button onClick={() => router.push("/app/create")}>
            Create Coloring Book
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Export Book"
        subtitle={`Export ${pages.length} pages to PDF or download as ZIP`}
      />
      
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <StepButton
          step={1}
          label="Configure"
          isActive={currentStep === "configure"}
          isComplete={currentStep === "preview" || currentStep === "download"}
          onClick={() => setCurrentStep("configure")}
        />
        <div className="flex-1 h-px bg-border" />
        <StepButton
          step={2}
          label="Preview"
          isActive={currentStep === "preview"}
          isComplete={currentStep === "download"}
          onClick={() => goToStep("preview")}
        />
        <div className="flex-1 h-px bg-border" />
        <StepButton
          step={3}
          label="Download"
          isActive={currentStep === "download"}
          isComplete={false}
          onClick={() => goToStep("download")}
        />
      </div>
      
      {/* Configure Step */}
      {currentStep === "configure" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Book Info */}
          <SectionCard title="Book Information" icon={BookOpen}>
            <div className="space-y-4">
              <SubSection title="Book Title">
                <Input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Enter your book title"
                />
              </SubSection>
              
              <SubSection title="Author Name (optional)">
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name or pen name"
                />
              </SubSection>
            </div>
          </SectionCard>
          
          {/* PDF Options */}
          <SectionCard title="PDF Options" icon={Settings2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Title Page</div>
                    <div className="text-sm text-muted-foreground">Include a decorative title page</div>
                  </div>
                </div>
                <Switch checked={includeTitlePage} onCheckedChange={setIncludeTitlePage} />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Copyright Page</div>
                    <div className="text-sm text-muted-foreground">Include copyright information</div>
                  </div>
                </div>
                <Switch checked={includeCopyrightPage} onCheckedChange={setIncludeCopyrightPage} />
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Page Numbers</div>
                    <div className="text-sm text-muted-foreground">Add page numbers at bottom</div>
                  </div>
                </div>
                <Switch checked={includePageNumbers} onCheckedChange={setIncludePageNumbers} />
              </div>
            </div>
          </SectionCard>
          
          {/* Copyright Text */}
          {includeCopyrightPage && (
            <SectionCard title="Copyright Text" icon={FileText} className="lg:col-span-2">
              <Textarea
                value={copyrightText}
                onChange={(e) => setCopyrightText(e.target.value)}
                placeholder={`© ${new Date().getFullYear()} All Rights Reserved\n\nThis coloring book is for personal use only.\nNo part may be reproduced without permission.`}
                rows={4}
              />
            </SectionCard>
          )}
          
          {/* Pages Preview Grid */}
          <SectionCard title={`Pages (${pages.length})`} icon={BookOpen} className="lg:col-span-2">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {pages.slice(0, 16).map((page, idx) => (
                <div key={idx} className="aspect-[8.5/11] rounded-lg overflow-hidden border bg-white">
                  <img
                    src={`data:image/png;base64,${page.imageBase64}`}
                    alt={`Page ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                </div>
              ))}
              {pages.length > 16 && (
                <div className="aspect-[8.5/11] rounded-lg border bg-muted flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">+{pages.length - 16} more</span>
                </div>
              )}
            </div>
          </SectionCard>
          
          {/* Actions */}
          <div className="lg:col-span-2 flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Back
                </Button>
            <Button onClick={() => goToStep("preview")}>
              Continue to Preview
              <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
          </div>
                        </div>
      )}
      
      {/* Preview Step */}
      {currentStep === "preview" && (
        <div className="space-y-6">
          {isGeneratingPdf ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <div className="font-medium">Generating PDF Preview...</div>
                <div className="text-sm text-muted-foreground">This may take a moment</div>
              </div>
            </div>
          ) : pdfBase64 ? (
            <div className="space-y-4">
                      <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">PDF Preview</h3>
                        <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => generatePdf(false)}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </div>
              
              {/* PDF Embed */}
              <div className="border rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                <iframe
                  src={`data:application/pdf;base64,${pdfBase64}`}
                  className="w-full h-[600px]"
                  title="PDF Preview"
                              />
                            </div>
                          </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <Eye className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <div className="font-medium">No preview available</div>
                <div className="text-sm text-muted-foreground">Click below to generate PDF preview</div>
              </div>
              <Button onClick={() => generatePdf(true)}>
                Generate Preview
              </Button>
                </div>
              )}
              
          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("configure")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Configure
            </Button>
            <Button onClick={() => goToStep("download")} disabled={!pdfBase64}>
              Continue to Download
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Download Step */}
      {currentStep === "download" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PDF Download */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
                    <FileDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Download PDF</h3>
                    <p className="text-sm text-muted-foreground">
                      Print-ready PDF with all {pages.length} pages
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    US Letter (8.5&quot; x 11&quot;) @ 300 DPI
                        </div>
                  <Button 
                    className="w-full" 
                    onClick={pdfBase64 ? downloadPdf : () => generatePdf(false)}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : pdfBase64 ? (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        Generate & Download
                      </>
                    )}
                  </Button>
                        </div>
                    </CardContent>
                  </Card>
                  
            {/* ZIP Download */}
                  <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Archive className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                  <div>
                    <h3 className="font-semibold text-lg">Download ZIP</h3>
                    <p className="text-sm text-muted-foreground">
                      All pages as individual PNG files
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Includes metadata.json with prompts
                  </div>
                        <Button
                    className="w-full" 
                    variant="outline"
                    onClick={generateZip}
                    disabled={isGeneratingZip}
                  >
                    {isGeneratingZip ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Download ZIP
                      </>
                    )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
            </div>
            
          {/* Success message */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Your coloring book is ready!</h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Download your {pages.length}-page coloring book as PDF or ZIP.
                    All images are processed to US Letter format (2550×3300 pixels) at 300 DPI.
                  </p>
                </div>
            </div>
            </CardContent>
          </Card>
          
          {/* Back button */}
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setCurrentStep("preview")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Preview
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// Step button component
function StepButton({
  step,
  label,
  isActive,
  isComplete,
  onClick,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
        ${isActive 
          ? "bg-primary text-primary-foreground" 
          : isComplete 
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }
      `}
    >
      <span className={`
        flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium
        ${isActive 
          ? "bg-primary-foreground text-primary" 
          : isComplete 
            ? "bg-green-500 text-white"
            : "bg-background"
        }
      `}>
        {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

// Main export component wrapped in Suspense
export default function ExportPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    }>
      <ExportPageContent />
    </Suspense>
  );
}
