import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// 使用 CDN worker（避免 Vite 构建配置复杂度）
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string;
  onTextSelect?: (text: string, pageNumber: number) => void;
  annotations?: Array<{
    id: string;
    pageNumber: number;
    text?: string;
    color: string;
    content: string;
  }>;
}

/**
 * PDF.js 渲染组件
 * 支持：翻页、缩放、文本选择、批注高亮
 */
export default function PdfViewer({ fileUrl, onTextSelect, annotations = [] }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载 PDF
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument(fileUrl);
    loadingTask.promise
      .then((pdf) => {
        if (cancelled) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNumber(1);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(`PDF 加载失败: ${err.message}`);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // 渲染页面
  const renderPage = useCallback(async (pageNum: number, pdf: pdfjsLib.PDFDocumentProxy, renderScale: number) => {
    if (!canvasRef.current || !textLayerRef.current) return;

    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空之前的内容
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    textLayer.innerHTML = '';

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: renderScale });

      // 设置 canvas 尺寸
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // 渲染 PDF 到 canvas
      await page.render({ canvasContext: ctx, viewport }).promise;

      // 渲染文本层（用于文本选择和搜索）
      const textContent = await page.getTextContent();
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;

      // 使用 PDF.js 的 TextLayer 来渲染文本
      const textLayerFrag = document.createDocumentFragment();
      for (const item of textContent.items) {
        const textItem = item as pdfjsLib.TextItem;
        const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
        const fontHeight = Math.hypot(tx[0], tx[1]);
        const fontWidth = Math.hypot(tx[2], tx[3]);

        const span = document.createElement('span');
        span.textContent = textItem.str;
        span.style.position = 'absolute';
        span.style.left = `${tx[4]}px`;
        span.style.top = `${tx[5] - fontHeight}px`;
        span.style.fontSize = `${fontHeight}px`;
        span.style.fontFamily = textItem.fontName as string;
        span.style.transform = `scaleX(${fontWidth > 0 ? (textItem.width * renderScale) / fontWidth : 1})`;
        span.style.transformOrigin = '0% 0%';
        span.style.whiteSpace = 'pre';
        span.style.userSelect = 'text';
        span.style.cursor = 'text';
        span.dataset.pageNumber = String(pageNum);
        textLayerFrag.appendChild(span);
      }
      textLayer.appendChild(textLayerFrag);

      // 渲染高亮（批注）
      const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum);
      for (const ann of pageAnnotations) {
        // 简单高亮：在文本层中查找匹配的文本并高亮
        highlightText(textLayer, ann.text ?? '', ann.color);
      }

      page.cleanup();
    } catch (err) {
      console.error('页面渲染失败:', err);
    }
  }, [annotations]);

  // 当页面、缩放或 PDF 变化时重新渲染
  useEffect(() => {
    if (pdfDoc && pageNumber >= 1 && pageNumber <= numPages) {
      renderPage(pageNumber, pdfDoc, scale);
    }
  }, [pdfDoc, pageNumber, scale, renderPage, numPages]);

  // 监听文本选择
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 2) return;

      // 检查选择是否在文本层内
      const range = selection.getRangeAt(0);
      const container = textLayerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) return;

      onTextSelect?.(selectedText, pageNumber);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [onTextSelect, pageNumber]);

  // 高亮文本（简化版：查找文本并添加背景色）
  function highlightText(container: HTMLDivElement, text: string, color: string) {
    if (!text) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      nodes.push(node as Text);
    }

    for (const textNode of nodes) {
      const index = textNode.textContent?.indexOf(text) ?? -1;
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + text.length);

        const rects = range.getClientRects();
        const containerRect = container.getBoundingClientRect();

        for (const rect of Array.from(rects)) {
          const highlight = document.createElement('div');
          highlight.style.position = 'absolute';
          highlight.style.left = `${rect.left - containerRect.left}px`;
          highlight.style.top = `${rect.top - containerRect.top}px`;
          highlight.style.width = `${rect.width}px`;
          highlight.style.height = `${rect.height}px`;
          highlight.style.backgroundColor = color + '50'; // 30% 透明度
          highlight.style.pointerEvents = 'none';
          highlight.style.zIndex = '10';
          highlight.style.borderRadius = '2px';
          container.appendChild(highlight);
        }
      }
    }
  }

  // 翻页
  const goToPage = (num: number) => {
    if (num >= 1 && num <= numPages) setPageNumber(num);
  };

  // 缩放
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const zoomReset = () => setScale(1.5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent mr-3" />
        加载 PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    );
  }

  if (!pdfDoc) return null;

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm tabular-nums">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={zoomReset} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 渲染区域 */}
      <div ref={containerRef} className="flex-1 overflow-auto relative flex justify-center py-8">
        <div className="relative shadow-lg">
          <canvas ref={canvasRef} className="block" />
          <div
            ref={textLayerRef}
            className="absolute inset-0"
            style={{ lineHeight: 1 }}
          />
        </div>
      </div>
    </div>
  );
}
