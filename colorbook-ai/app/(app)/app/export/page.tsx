"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  BookOpen,
  Eye,
  AlertTriangle,
  CheckCircle2,
  BookMarked,
  Layers,
  Loader2,
  Settings2,
  FileDown,
  Image as ImageIcon,
  Sparkles,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// Steps for the export wizard
const EXPORT_STEPS = [
  { id: "layout", label: "Layout & Paper", icon: Layers },
  { id: "front-matter", label: "Front Matter", icon: BookMarked },
  { id: "checks", label: "Print Ready", icon: CheckCircle2 },
  { id: "export", label: "Export", icon: FileDown },
];

type ExportStep = "layout" | "front-matter" | "checks" | "export";

interface PageData {
  page: number;
  imageBase64?: string;
  enhancedImageBase64?: string;
  finalLetterBase64?: string;
  status?: string;
}

// Wrapper component that uses search params
function ExportPageContent() {
  const searchParams = useSearchParams();
  // These will be used to load book data when connected to backend
  const _bookId = searchParams.get("bookId");
  const _batchId = searchParams.get("batchId");
  
  // TODO: Load book data based on bookId or batchId
  // useEffect(() => { if (_bookId) loadBookData(_bookId); }, [_bookId]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<ExportStep>("layout");
  
  // Layout settings
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter");
  const [margins, setMargins] = useState<"minimal" | "standard">("minimal");
  const [insertBlankPages, setInsertBlankPages] = useState(true);
  
  // Front matter settings
  const [includeBelongsTo, setIncludeBelongsTo] = useState(true);
  const [belongsToName, setBelongsToName] = useState("");
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [copyrightText, setCopyrightText] = useState("All rights reserved.");
  
  // Book data
  const [bookTitle, setBookTitle] = useState("My Coloring Book");
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Preview state
  const [previewPage, setPreviewPage] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(100);

  // Calculate step index
  const currentStepIndex = EXPORT_STEPS.findIndex(s => s.id === currentStep);

  // Navigation
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < EXPORT_STEPS.length) {
      setCurrentStep(EXPORT_STEPS[nextIndex].id as ExportStep);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(EXPORT_STEPS[prevIndex].id as ExportStep);
    }
  };

  // Check print readiness
  const printReadyIssues: string[] = [];
  const enhancedCount = pages.filter(p => p.enhancedImageBase64 || p.finalLetterBase64).length;
  if (enhancedCount < pages.length) {
    printReadyIssues.push(`${pages.length - enhancedCount} pages not enhanced for print quality`);
  }

  // Calculate total pages in PDF
  const totalPdfPages = 
    (includeBelongsTo ? 1 : 0) +
    (includeCopyright ? 1 : 0) +
    pages.length +
    (insertBlankPages ? pages.length : 0);

  return (
    <>
      <AppTopbar
        title="Export PDF"
        subtitle={bookTitle}
      />
      
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Left: Preview Panel */}
          <div className="w-1/2 border-r bg-muted/30 flex flex-col">
            {/* Preview Header */}
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">PDF Preview</span>
                <Badge variant="outline" className="ml-2">
                  Page {previewPage + 1} of {totalPdfPages || pages.length || 1}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">{previewZoom}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewZoom(100)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              {pages.length > 0 && pages[previewPage] ? (
                <div 
                  className="bg-white shadow-lg rounded-sm"
                  style={{
                    width: `${(pageSize === "letter" ? 612 : 595) * (previewZoom / 100) * 0.5}px`,
                    height: `${(pageSize === "letter" ? 792 : 841) * (previewZoom / 100) * 0.5}px`,
                  }}
                >
                  {pages[previewPage].finalLetterBase64 || pages[previewPage].enhancedImageBase64 || pages[previewPage].imageBase64 ? (
                    <img
                      src={`data:image/png;base64,${pages[previewPage].finalLetterBase64 || pages[previewPage].enhancedImageBase64 || pages[previewPage].imageBase64}`}
                      alt={`Page ${previewPage + 1}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 opacity-30" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>No pages to preview</p>
                  <p className="text-sm mt-2">Generate some pages first, then come back to export</p>
                </div>
              )}
            </div>
            
            {/* Preview Navigation */}
            {pages.length > 0 && (
              <div className="p-4 border-t bg-background flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                  disabled={previewPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page thumbnails */}
                <div className="flex gap-2 overflow-x-auto max-w-md py-2">
                  {pages.slice(0, 10).map((page, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewPage(idx)}
                      className={`w-12 h-16 rounded border-2 transition-all flex-shrink-0 overflow-hidden ${
                        previewPage === idx
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {page.imageBase64 ? (
                        <img
                          src={`data:image/png;base64,${page.finalLetterBase64 || page.imageBase64}`}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          {idx + 1}
                        </div>
                      )}
                    </button>
                  ))}
                  {pages.length > 10 && (
                    <div className="w-12 h-16 flex items-center justify-center text-xs text-muted-foreground">
                      +{pages.length - 10}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewPage(Math.min(pages.length - 1, previewPage + 1))}
                  disabled={previewPage >= pages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Right: Configuration Wizard */}
          <div className="w-1/2 flex flex-col">
            {/* Step Indicator */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center justify-between max-w-lg mx-auto">
                {EXPORT_STEPS.map((step, idx) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStepIndex > idx;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      <button
                        onClick={() => setCurrentStep(step.id as ExportStep)}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={`
                            w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all
                            ${isActive ? "bg-primary text-primary-foreground" : ""}
                            ${isCompleted ? "bg-green-500 text-white" : ""}
                            ${!isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""}
                          `}
                        >
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <span className={`text-xs ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </button>
                      {idx < EXPORT_STEPS.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Step Content */}
            <div className="flex-1 overflow-auto p-6">
              {currentStep === "layout" && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Layout & Paper</h2>
                    <p className="text-sm text-muted-foreground">Configure page size and layout options</p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Paper Size</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPageSize("letter")}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            pageSize === "letter"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">US Letter</div>
                          <div className="text-sm text-muted-foreground">8.5 × 11 inches</div>
                        </button>
                        <button
                          onClick={() => setPageSize("a4")}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            pageSize === "a4"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium">A4</div>
                          <div className="text-sm text-muted-foreground">210 × 297 mm</div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Layout Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Blank pages between drawings</div>
                          <div className="text-sm text-muted-foreground">Prevents bleed-through when coloring</div>
                        </div>
                        <Switch checked={insertBlankPages} onCheckedChange={setInsertBlankPages} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Margins</div>
                          <div className="text-sm text-muted-foreground">Safe area for printing</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMargins("minimal")}
                            className={`px-3 py-1 rounded text-sm ${
                              margins === "minimal" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            Minimal
                          </button>
                          <button
                            onClick={() => setMargins("standard")}
                            className={`px-3 py-1 rounded text-sm ${
                              margins === "standard" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            Standard
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {currentStep === "front-matter" && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Front Matter</h2>
                    <p className="text-sm text-muted-foreground">Add belongs-to page and copyright information</p>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookMarked className="h-4 w-4" />
                        Belongs To Page
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Include "Belongs To" page</div>
                        <Switch checked={includeBelongsTo} onCheckedChange={setIncludeBelongsTo} />
                      </div>
                      
                      {includeBelongsTo && (
                        <div>
                          <label className="text-sm font-medium mb-1 block">Default name (optional)</label>
                          <Input
                            value={belongsToName}
                            onChange={(e) => setBelongsToName(e.target.value)}
                            placeholder="Leave blank for write-in line"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Copyright Page
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Include copyright page</div>
                        <Switch checked={includeCopyright} onCheckedChange={setIncludeCopyright} />
                      </div>
                      
                      {includeCopyright && (
                        <>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Author / Company</label>
                            <Input
                              value={author}
                              onChange={(e) => setAuthor(e.target.value)}
                              placeholder="Your name or company"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Year</label>
                              <Input
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Rights</label>
                              <Input
                                value={copyrightText}
                                onChange={(e) => setCopyrightText(e.target.value)}
                                placeholder="All rights reserved."
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {currentStep === "checks" && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Print Ready Checks</h2>
                    <p className="text-sm text-muted-foreground">Ensure your book is ready for printing</p>
                  </div>
                  
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {/* Status checks */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span>{pages.length} coloring pages ready</span>
                        </div>
                        
                        {enhancedCount === pages.length ? (
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span>All pages enhanced for print quality</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <span>{pages.length - enhancedCount} pages not enhanced</span>
                          </div>
                        )}
                        
                        {includeBelongsTo && (
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span>Belongs-to page will be generated</span>
                          </div>
                        )}
                        
                        {includeCopyright && (
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span>Copyright page included</span>
                          </div>
                        )}
                      </div>
                      
                      {printReadyIssues.length > 0 && (
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Warnings</span>
                          </div>
                          <ul className="text-sm text-amber-600 space-y-1">
                            {printReadyIssues.map((issue, i) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">PDF Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total pages:</span>
                          <span className="ml-2 font-medium">{totalPdfPages}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Paper size:</span>
                          <span className="ml-2 font-medium">{pageSize === "letter" ? "US Letter" : "A4"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coloring pages:</span>
                          <span className="ml-2 font-medium">{pages.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Blank pages:</span>
                          <span className="ml-2 font-medium">{insertBlankPages ? pages.length : 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {currentStep === "export" && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Export PDF</h2>
                    <p className="text-sm text-muted-foreground">Generate and download your coloring book</p>
                  </div>
                  
                  {!isExporting && !pdfUrl && (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <FileDown className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                        <h3 className="font-medium mb-2">Ready to Export</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Your {totalPdfPages}-page PDF is ready to be generated
                        </p>
                        <Button
                          size="lg"
                          onClick={() => {
                            setIsExporting(true);
                            // Simulate export progress
                            let progress = 0;
                            const interval = setInterval(() => {
                              progress += 10;
                              setExportProgress(progress);
                              setExportStatus(`Assembling page ${Math.floor(progress / 10)}...`);
                              if (progress >= 100) {
                                clearInterval(interval);
                                setIsExporting(false);
                                setPdfUrl("#"); // Placeholder
                                toast.success("PDF generated successfully!");
                              }
                            }, 500);
                          }}
                        >
                          <FileDown className="mr-2 h-5 w-5" />
                          Build PDF
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  
                  {isExporting && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="font-medium">Building PDF...</span>
                        </div>
                        <Progress value={exportProgress} className="mb-2" />
                        <p className="text-sm text-muted-foreground">{exportStatus}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {pdfUrl && (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                        <h3 className="font-medium mb-2">PDF Ready!</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Your coloring book PDF has been generated
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button variant="outline" onClick={() => {}}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
            
            {/* Navigation Footer */}
            <div className="p-4 border-t bg-muted/30 flex justify-between">
              <Button
                variant="outline"
                onClick={goToPrevStep}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              {currentStepIndex < EXPORT_STEPS.length - 1 ? (
                <Button onClick={goToNextStep}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Export ready
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Loading fallback for Suspense
function ExportPageLoading() {
  return (
    <>
      <AppTopbar
        title="Export PDF"
        subtitle="Loading..."
      />
      <main className="flex-1 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading export settings...</p>
        </div>
      </main>
    </>
  );
}

// Default export with Suspense boundary
export default function ExportPage() {
  return (
    <Suspense fallback={<ExportPageLoading />}>
      <ExportPageContent />
    </Suspense>
  );
}

