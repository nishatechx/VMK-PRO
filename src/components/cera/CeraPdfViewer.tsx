import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  LayoutGrid,
  RotateCw,
  AlertCircle,
  FileText,
  Loader2,
  Bookmark,
  Share2,
  Check,
  AlignLeft,
} from 'lucide-react';
import { CeraDocument } from '../../types/cera';
import {
  getPdfProxyUrl,
  openCeraPdfPage,
  toggleCeraBookmark,
  getCeraBookmarks,
  cacheOpenPdfPageText,
} from '../../services/ceraService';
import { OFFICIAL_PAGE_CHUNKS } from '../../data/officialCetDocuments';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use locally bundled worker in public/ for zero CDN latency and offline resilience, with CDN fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface CeraPdfViewerProps {
  document: CeraDocument;
  initialPage?: number;
  onPageChange?: (pageNumber: number) => void;
  onCloseViewer?: () => void;
}

export const CeraPdfViewer: React.FC<CeraPdfViewerProps> = ({
  document: doc,
  initialPage = 1,
  onPageChange,
  onCloseViewer,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(doc.pageCount || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'embed' | 'text'>('canvas');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  const currentPageChunk = OFFICIAL_PAGE_CHUNKS.find(
    (c) =>
      (c.documentId === doc.id || doc.id.includes(c.documentId.replace('cet-', '')) || doc.courseName.toLowerCase().includes(c.documentId.replace('cet-', ''))) &&
      c.pageNumber === currentPage
  ) || OFFICIAL_PAGE_CHUNKS.find((c) => c.documentId === doc.id) || null;

  useEffect(() => {
    if (initialPage && initialPage !== currentPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  useEffect(() => {
    const bookmarks = getCeraBookmarks();
    const hasBm = bookmarks.some(
      (b) => b.documentId === doc.id && b.pageNumber === currentPage
    );
    setIsBookmarked(hasBm);
  }, [doc.id, currentPage]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!doc.pdfUrl) {
        setIsLoadingPdf(false);
        setRenderError('No direct official PDF URL is attached to this document.');
        return;
      }

      setIsLoadingPdf(true);
      setRenderError(null);

      try {
        const proxyUrl = getPdfProxyUrl(doc.pdfUrl);

        const loadingTask = pdfjsLib.getDocument({
          url: proxyUrl,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          withCredentials: false,
        });

        const loadedPdf = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = loadedPdf;
        setNumPages(loadedPdf.numPages);
        setIsLoadingPdf(false);

        // Extract text from the first batch of pages into CIA cache in background
        (async () => {
          try {
            const pagesToScan = Math.min(loadedPdf.numPages, 30);
            for (let p = 1; p <= pagesToScan; p++) {
              if (isCancelled) break;
              const pageObj = await loadedPdf.getPage(p);
              const textContent = await pageObj.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str || '')
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
              if (pageText) {
                cacheOpenPdfPageText(doc.id, p, pageText);
              }
            }
          } catch (scanErr) {
            console.warn('[PDF Text Pre-extract Warning]:', scanErr);
          }
        })();
      } catch (err: any) {
        console.warn('[PDF.js Load Error, trying direct fallback]:', err);
        if (isCancelled) return;

        try {
          const directTask = pdfjsLib.getDocument({
            url: doc.pdfUrl!,
            withCredentials: false,
          });
          const loadedDirect = await directTask.promise;
          if (isCancelled) return;

          pdfDocRef.current = loadedDirect;
          setNumPages(loadedDirect.numPages);
          setIsLoadingPdf(false);
        } catch (directErr: any) {
          console.error('[PDF Load Final Failure]:', directErr);
          if (!isCancelled) {
            setIsLoadingPdf(false);
            setRenderError(
              'Canvas stream could not be loaded directly. You can switch to the interactive Embedded Reader below, read verified text, or open in a new tab.'
            );
          }
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        try {
          if (typeof (pdfDocRef.current as any).destroy === 'function') {
            (pdfDocRef.current as any).destroy();
          } else if (typeof (pdfDocRef.current as any).cleanup === 'function') {
            (pdfDocRef.current as any).cleanup();
          }
        } catch {
          // ignore cleanup errors during unmount
        }
        pdfDocRef.current = null;
      }
    };
  }, [doc.pdfUrl]);

  const renderCurrentPage = useCallback(async () => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        if (typeof renderTaskRef.current.cancel === 'function') {
          renderTaskRef.current.cancel();
        }
      } catch {
        // ignore cancellation error
      }
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      onPageChange?.(currentPage);

      // Extract text content of current viewed page for immediate CIA answers
      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pageText) {
          cacheOpenPdfPageText(doc.id, currentPage, pageText);
        }
      } catch (tErr) {
        // non-blocking
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[PDF Page Render Error]:', err);
      }
    }
  }, [currentPage, scale, rotation, onPageChange]);

  useEffect(() => {
    if (!isLoadingPdf && pdfDocRef.current) {
      renderCurrentPage();
    }
  }, [isLoadingPdf, currentPage, scale, rotation, renderCurrentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const nextP = currentPage - 1;
      setCurrentPage(nextP);
      onPageChange?.(nextP);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      onPageChange?.(nextP);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      setCurrentPage(val);
      onPageChange?.(val);
    }
  };

  const handleToggleBookmark = () => {
    toggleCeraBookmark({
      documentId: doc.id,
      documentTitle: doc.title,
      courseName: doc.courseName,
      academicYear: doc.academicYear,
      pageNumber: currentPage,
    });
    setIsBookmarked((prev) => !prev);
  };

  const handleCopyShareLink = () => {
    if (doc.pdfUrl) {
      const shareUrl = `${doc.pdfUrl}#page=${currentPage}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-[#FFFFFF] text-[#172033] overflow-hidden border-r border-[#E2E8F0] ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative'
      }`}
    >
      {/* 1. TOP BREADCRUMB & HEADER (Section 23) */}
      <div className="px-4 py-2.5 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0 text-xs">
          {onCloseViewer && (
            <button
              type="button"
              onClick={onCloseViewer}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] border border-[#CBD5E1] transition-colors cursor-pointer mr-1 shrink-0"
              title="Close PDF and return to workspace"
              aria-label="Close PDF"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Close PDF</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[#64748B] truncate font-medium">
            <span className="font-semibold text-[#1677FF]">{doc.type}</span>
            <span>&rsaquo;</span>
            <span>{doc.educationSection}</span>
            <span>&rsaquo;</span>
            <span className="font-semibold text-[#172033] truncate">{doc.courseName}</span>
          </div>

          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#475569]">
            {doc.academicYear}
          </span>
        </div>

        {/* Quick Actions: Open Original, Bookmark, Share */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 text-[#FF8A00] border-amber-200'
                : 'text-[#64748B] hover:text-[#172033] border-transparent hover:bg-[#F1F5F9]'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Page'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#FF8A00]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] border border-transparent transition-colors cursor-pointer"
            title="Copy Page Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {doc.pdfUrl ? (
            <button
              type="button"
              onClick={() => openCeraPdfPage(doc.pdfUrl, currentPage, doc.officialSourcePageUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#1677FF] hover:bg-[#F0F7FF] rounded-lg border border-[#1677FF]/30 transition-all cursor-pointer"
              title="Open verified official PDF in new tab"
            >
              <span>Open Original PDF</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <a
              href={doc.officialSourcePageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#64748B] hover:text-[#172033] bg-[#F1F5F9] rounded-lg transition-colors"
            >
              <span>Source Webpage</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* 2. PDF TOOLBAR: ← 12 / 48 →, − 100% +, Search, Fullscreen, Download */}
      <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2 py-1 shadow-2xs">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 text-[#64748B] hover:text-[#172033] disabled:opacity-30 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 text-[11px] font-medium text-[#172033]">
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={handlePageInput}
              className="w-10 text-center py-0.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#172033] font-semibold outline-none"
            />
            <span className="text-[#94A3B8]">/</span>
            <span>{numPages}</span>
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1 text-[#64748B] hover:text-[#172033] disabled:opacity-30 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2 py-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            className="p-1 text-[#64748B] hover:text-[#172033] cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setScale(1.0)}
            className="px-2 text-[11px] font-medium text-[#475569] hover:text-[#1677FF] cursor-pointer"
            title="Reset Zoom (100%)"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            className="p-1 text-[#64748B] hover:text-[#172033] cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1 text-[#94A3B8] hover:text-[#172033] cursor-pointer ml-1"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>

        {/* View Options: Thumbnails, Mode Switcher, Fullscreen, Download */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: PDF Canvas | Embedded Reader | Verified Text */}
          <div className="flex rounded-lg bg-[#F1F5F9] p-0.5 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => {
                setRenderError(null);
                setViewMode('canvas');
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'canvas'
                  ? 'bg-[#1677FF] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Canvas View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('embed')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'embed'
                  ? 'bg-[#1677FF] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Embedded PDF
            </button>
            <button
              type="button"
              onClick={() => setViewMode('text')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'text'
                  ? 'bg-[#1677FF] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Document Text
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
              showThumbnails
                ? 'bg-[#1677FF] text-white border-[#1677FF]'
                : 'bg-[#FFFFFF] text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
            title="Toggle Page Thumbnails"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">Thumbnails</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-[#FFFFFF] text-[#64748B] hover:text-[#172033] border border-[#E2E8F0] transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {doc.pdfUrl && (
            <a
              href={doc.pdfUrl}
              download={`${doc.courseName}_${doc.academicYear}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFFFF] text-[#475569] hover:text-[#172033] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors text-[11px] font-medium"
              title="Download Original PDF"
            >
              <Download className="w-3 h-3" />
              <span className="hidden md:inline">Download</span>
            </a>
          )}
        </div>
      </div>

      {/* 3. MAIN PDF VIEWPORT & THUMBNAILS (Light Mode Surface) */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden bg-[#F1F5F9]">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <div className="w-36 bg-[#FFFFFF] border-r border-[#E2E8F0] flex flex-col shrink-0 overflow-y-auto p-2 space-y-2 select-none z-10 shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider px-1">
              Pages ({numPages})
            </div>
            {Array.from({ length: Math.min(numPages, 100) }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => {
                  setCurrentPage(pg);
                  onPageChange?.(pg);
                }}
                className={`w-full py-2 px-2 rounded-lg border text-xs font-medium flex flex-col items-center justify-center transition-all cursor-pointer ${
                  pg === currentPage
                    ? 'bg-[#F0F7FF] text-[#1677FF] border-[#1677FF] font-semibold shadow-2xs'
                    : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-[#94A3B8]" />
                <span>Page {pg}</span>
              </button>
            ))}
          </div>
        )}

        {/* Viewport: Embedded Reader OR Verified Document Text OR Canvas */}
        <div className="flex-1 min-h-0 relative overflow-auto flex items-start justify-center p-4">
          {viewMode === 'embed' ? (
            /* Interactive Embedded PDF View (Works reliably across all devices & deployments) */
            <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm relative min-h-[550px]">
              {doc.pdfUrl ? (
                <iframe
                  src={`${doc.pdfUrl}#page=${currentPage}`}
                  title={doc.title}
                  className="w-full flex-1 min-h-[650px] border-0 rounded-xl bg-white"
                />
              ) : (
                <div className="p-8 text-center text-xs text-[#64748B]">No official PDF URL attached</div>
              )}
            </div>
          ) : viewMode === 'text' ? (
            /* Document Text View */
            <div className="w-full max-w-3xl bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4 text-[#172033]">
              <div className="pb-3 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-[#1677FF] uppercase tracking-wide">
                    {doc.type} · Page {currentPage} of {numPages}
                  </span>
                  <h2 className="text-base font-semibold text-[#062B66] mt-0.5">
                    {currentPageChunk?.headings?.[0] || currentPageChunk?.section || doc.courseName}
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {doc.academicYear} · {doc.educationSection} · {doc.documentType}
                  </p>
                </div>

                {doc.pdfUrl && (
                  <button
                    type="button"
                    onClick={() => openCeraPdfPage(doc.pdfUrl, currentPage, doc.officialSourcePageUrl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1677FF] hover:bg-[#F0F7FF] rounded-lg border border-[#1677FF]/30 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Open in PDF</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {currentPageChunk ? (
                <div className="space-y-4 text-xs leading-relaxed text-[#334155]">
                  {currentPageChunk.section && (
                    <div className="font-semibold text-xs text-[#062B66]">
                      {currentPageChunk.section} {currentPageChunk.point && `— ${currentPageChunk.point}`}
                    </div>
                  )}

                  {currentPageChunk.paragraph && (
                    <p className="p-3 bg-[#F8FAFC] border-l-2 border-[#1677FF] rounded-r-md text-[#172033] font-medium leading-relaxed">
                      {currentPageChunk.paragraph}
                    </p>
                  )}

                  <div className="whitespace-pre-wrap leading-relaxed text-xs text-[#334155]">
                    {currentPageChunk.text}
                  </div>

                  {currentPageChunk.keywords && currentPageChunk.keywords.length > 0 && (
                    <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Keywords:
                      </span>
                      {currentPageChunk.keywords.map((kw, kwIdx) => (
                        <span
                          key={kwIdx}
                          className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] text-[10px] font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <AlignLeft className="w-8 h-8 text-[#94A3B8] mx-auto" />
                  <h4 className="text-xs font-semibold text-[#172033]">Official Page Text</h4>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Full page text is available in the original PDF. Use "Canvas View", "Embedded PDF", or open the original document in a new tab.
                  </p>
                  {doc.pdfUrl && (
                    <button
                      type="button"
                      onClick={() => openCeraPdfPage(doc.pdfUrl, currentPage, doc.officialSourcePageUrl)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1677FF] text-white rounded-lg text-xs font-semibold"
                    >
                      <span>Open Page {currentPage} in Original PDF</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Canvas PDF View */
            <>
              {isLoadingPdf && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-2xs z-20 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1677FF]" />
                  <p className="text-xs font-medium text-[#64748B]">
                    Rendering document...
                  </p>
                </div>
              )}

              {renderError ? (
                <div className="m-auto max-w-md p-6 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl text-center space-y-3 shadow-sm">
                  <AlertCircle className="w-8 h-8 text-[#FF8A00] mx-auto" />
                  <h3 className="text-sm font-semibold text-[#172033]">Document Viewer</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{renderError}</p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    {doc.pdfUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setRenderError(null);
                          setViewMode('embed');
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#1677FF] hover:bg-[#1677FF]/90 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Switch to Embedded Reader</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewMode('text')}
                      className="w-full sm:w-auto px-4 py-2 bg-[#F0F7FF] hover:bg-[#E0EFFF] text-[#1677FF] border border-[#1677FF]/30 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>View Page Text</span>
                    </button>

                    {doc.pdfUrl && (
                      <button
                        type="button"
                        onClick={() => openCeraPdfPage(doc.pdfUrl, currentPage, doc.officialSourcePageUrl)}
                        className="w-full sm:w-auto px-4 py-2 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative shadow-md bg-white rounded overflow-hidden border border-[#E2E8F0]">
                  <canvas ref={canvasRef} className="block max-w-none" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
