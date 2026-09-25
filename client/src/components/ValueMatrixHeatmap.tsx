import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartDensityCell, ChartDensityResult } from '../services/api';
import { DISPLAY_CURRENCY } from '../utils/currency';

const BODY_STYLE_COLORS: Record<string, string> = {
  sedan: '#ffffff',
  suv: '#93c5fd',
  coupe: '#fda4af',
  truck: '#fdba74',
  van: '#c4b5fd',
  minivan: '#86efac',
  wagon: '#e2e8f0',
};

interface ValueMatrixHeatmapProps {
  density: ChartDensityResult;
  height: number;
  yLabel: string;
  onCellSelect: (cell: ChartDensityCell) => void;
}

function formatPrice(v: number): string {
  return `$${(v / 1000).toFixed(0)}k`;
}

function formatY(v: number, metric: ChartDensityResult['metric']): string {
  if (metric === 'mpg') return `${Math.round(v)}`;
  if (metric === 'displacement') return `${v.toFixed(1)}L`;
  return `${Math.round(v)}`;
}

function metricUnit(metric: ChartDensityResult['metric']): string {
  if (metric === 'mpg') return ' MPG';
  if (metric === 'co2') return ' g/mi';
  return '';
}

/** "$20k–$30k · 25–30 MPG" */
function describeCell(cell: ChartDensityCell, metric: ChartDensityResult['metric']): string {
  return `${formatPrice(cell.priceMin)}–${formatPrice(cell.priceMax)} · ${formatY(cell.yMin, metric)}–${formatY(cell.yMax, metric)}${metricUnit(metric)}`;
}

/** How many of the densest cells to offer as buttons under the chart. */
const BUSIEST_CELLS = 6;

export default function ValueMatrixHeatmap({
  density,
  height,
  yLabel,
  onCellSelect,
}: ValueMatrixHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<ChartDensityCell | null>(null);
  const [width, setWidth] = useState(640);

  // The canvas is mouse-only, and hover never happens on a phone. The busiest
  // cells, as buttons, give keyboard, screen-reader and touch users the same
  // zoom, and tell everyone where the market is thickest.
  const busiest = useMemo(
    () => [...density.cells].sort((a, b) => b.count - a.count).slice(0, BUSIEST_CELLS),
    [density.cells],
  );
  const summary =
    `Heat map of ${density.total.toLocaleString()} vehicles by estimated value and ${yLabel}.` +
    (busiest[0]
      ? ` Busiest area: ${describeCell(busiest[0], density.metric)}, ${busiest[0].count.toLocaleString()} vehicles.`
      : '');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || density.cells.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pad = { top: 16, right: 16, bottom: 44, left: 48 };
    const plotW = Math.max(width - pad.left - pad.right, 1);
    const plotH = Math.max(height - pad.top - pad.bottom, 1);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { priceMin, priceMax, yMin, yMax, cells, metric } = density;
    const priceSpan = Math.max(priceMax - priceMin, 1);
    const ySpan = Math.max(yMax - yMin, 0.01);
    const maxCount = Math.max(...cells.map((c) => c.count), 1);

    const toX = (price: number) => pad.left + ((price - priceMin) / priceSpan) * plotW;
    const toY = (y: number) => pad.top + plotH - ((y - yMin) / ySpan) * plotH;

    // Grid
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const x = pad.left + (plotW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();
      const y = pad.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Cells (back to front by count ascending so dense regions on top)
    const sorted = [...cells].sort((a, b) => a.count - b.count);
    for (const cell of sorted) {
      const x0 = toX(cell.priceMin);
      const x1 = toX(cell.priceMax);
      const y0 = toY(cell.yMax);
      const y1 = toY(cell.yMin);
      const w = Math.max(x1 - x0, 2);
      const h = Math.max(y1 - y0, 2);
      const t = Math.log(cell.count + 1) / Math.log(maxCount + 1);
      const base = BODY_STYLE_COLORS[cell.dominantBodyStyle] ?? '#a1a1aa';
      ctx.globalAlpha = 0.15 + t * 0.85;
      ctx.fillStyle = base;
      ctx.fillRect(x0, y0, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(x0, y0, w, h);
    }

    // Highlight hovered
    if (hovered) {
      const x0 = toX(hovered.priceMin);
      const x1 = toX(hovered.priceMax);
      const y0 = toY(hovered.yMax);
      const y1 = toY(hovered.yMin);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }

    // Axes labels
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const price = priceMin + (priceSpan * i) / 4;
      const x = pad.left + (plotW * i) / 4;
      ctx.fillText(formatPrice(price), x, height - 12);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const yVal = yMin + (ySpan * i) / 4;
      const y = pad.top + plotH - (plotH * i) / 4;
      ctx.fillText(formatY(yVal, metric), pad.left - 8, y);
    }

    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillText(`Est. value (${DISPLAY_CURRENCY})`, pad.left + plotW / 2, height - 28);
  }, [density, height, width, hovered, yLabel]);

  useEffect(() => {
    draw();
  }, [draw]);

  const hitTest = (clientX: number, clientY: number): ChartDensityCell | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pad = { top: 16, right: 16, bottom: 44, left: 48 };
    const plotW = Math.max(width - pad.left - pad.right, 1);
    const plotH = Math.max(height - pad.top - pad.bottom, 1);
    const { priceMin, priceMax, yMin, yMax } = density;
    const priceSpan = Math.max(priceMax - priceMin, 1);
    const ySpan = Math.max(yMax - yMin, 0.01);

    const price = priceMin + ((x - pad.left) / plotW) * priceSpan;
    const yVal = yMin + ((pad.top + plotH - y) / plotH) * ySpan;

    for (const cell of density.cells) {
      if (
        price >= cell.priceMin &&
        price <= cell.priceMax &&
        yVal >= cell.yMin &&
        yVal <= cell.yMax
      ) {
        return cell;
      }
    }
    return null;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={summary}
        className="w-full cursor-crosshair"
        onMouseMove={(e) => setHovered(hitTest(e.clientX, e.clientY))}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => {
          const cell = hitTest(e.clientX, e.clientY);
          if (cell) onCellSelect(cell);
        }}
      />
      {hovered && (
        <div className="absolute top-3 right-3 bg-zinc-950 border border-zinc-600 px-3 py-2 text-xs pointer-events-none">
          <p className="text-white font-semibold">{hovered.count.toLocaleString()} vehicles</p>
          <p className="text-zinc-400 mt-1">{describeCell(hovered, density.metric)}</p>
          <p className="text-zinc-500 mt-1 capitalize">Mostly {hovered.dominantBodyStyle}</p>
          <p className="text-zinc-500 mt-1">Click to zoom in</p>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 mt-2 text-[10px] text-zinc-500 uppercase tracking-widest">
        <span>Low density</span>
        <div className="flex h-2 w-24 rounded-sm overflow-hidden border border-zinc-700">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ backgroundColor: `rgba(255,255,255,${0.1 + (i / 7) * 0.9})` }}
            />
          ))}
        </div>
        <span>High density</span>
      </div>
      {busiest.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mb-2">
            Busiest areas · select to zoom in
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {busiest.map((cell) => (
              <li key={`${cell.priceMin}:${cell.yMin}`}>
                <button
                  type="button"
                  onClick={() => onCellSelect(cell)}
                  className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2 border border-zinc-800 hover:border-zinc-500 text-left text-xs transition-colors"
                >
                  <span className="text-zinc-200">{describeCell(cell, density.metric)}</span>
                  <span className="text-zinc-400 shrink-0 tabular-nums">
                    {cell.count.toLocaleString()} · mostly {cell.dominantBodyStyle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
