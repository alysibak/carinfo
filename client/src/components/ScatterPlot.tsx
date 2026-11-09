import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { niceTicks } from '../utils/niceTicks';

/**
 * A scatter chart drawn as plain SVG: axes with round ticks, a dashed grid,
 * a dot per point, a card beside the dot under the pointer, and a tap or
 * click to open it. The value chart used a charting library for this alone,
 * and it was over half of that page's code (about 110 KB compressed).
 */

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  /** Dot radius, px. */
  r: number;
  fill: string;
  stroke: string;
}

interface ScatterPlotProps<P extends ScatterPoint> {
  points: P[];
  height: number;
  xLabel: string;
  yLabel: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  /** The card for the point under the pointer. */
  tooltip: (point: P) => ReactNode;
  hoveredId: string | null;
  onHover: (point: P | null) => void;
  onSelect: (point: P) => void;
  /** What the chart shows, for screen readers (the page's list view has the cars themselves). */
  label: string;
}

const PAD = { top: 12, right: 16, bottom: 50, left: 72 };

/** The width of the element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export default function ScatterPlot<P extends ScatterPoint>({
  points,
  height,
  xLabel,
  yLabel,
  formatX,
  formatY,
  tooltip,
  hoveredId,
  onHover,
  onSelect,
  label,
}: ScatterPlotProps<P>) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = Math.max(0, height - PAD.top - PAD.bottom);

  const { xTicks, yTicks } = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      xTicks: niceTicks(Math.min(...xs), Math.max(...xs), width < 480 ? 4 : 6),
      yTicks: niceTicks(Math.min(...ys), Math.max(...ys), 5),
    };
  }, [points, width]);

  const [x0, x1] = [xTicks[0] ?? 0, xTicks[xTicks.length - 1] ?? 1];
  const [y0, y1] = [yTicks[0] ?? 0, yTicks[yTicks.length - 1] ?? 1];
  const sx = (value: number) => PAD.left + ((value - x0) / (x1 - x0 || 1)) * plotWidth;
  const sy = (value: number) => PAD.top + plotHeight - ((value - y0) / (y1 - y0 || 1)) * plotHeight;

  const hovered = hoveredId ? points.find((p) => p.id === hoveredId) : undefined;

  return (
    <div ref={boxRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {yTicks.map((tick) => (
            <g key={`y${tick}`}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={sy(tick)}
                y2={sy(tick)}
                stroke="#3f3f46"
                strokeOpacity={0.8}
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 8}
                y={sy(tick)}
                dy="0.32em"
                textAnchor="end"
                fill="#a1a1aa"
                fontSize={11}
              >
                {formatY(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={`x${tick}`}>
              <line
                x1={sx(tick)}
                x2={sx(tick)}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke="#3f3f46"
                strokeOpacity={0.8}
                strokeDasharray="4 4"
              />
              <text
                x={sx(tick)}
                y={PAD.top + plotHeight + 18}
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize={11}
              >
                {formatX(tick)}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={PAD.left + plotWidth}
            y1={PAD.top + plotHeight}
            y2={PAD.top + plotHeight}
            stroke="#71717a"
          />
          <line
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
            stroke="#71717a"
          />
          <text
            x={PAD.left + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize={11}
            fontWeight={500}
          >
            {xLabel}
          </text>
          <text
            transform={`translate(14 ${PAD.top + plotHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize={11}
            fontWeight={500}
          >
            {yLabel}
          </text>
          {hovered && (
            <g stroke="#71717a" strokeWidth={1} pointerEvents="none">
              <line x1={sx(hovered.x)} x2={sx(hovered.x)} y1={PAD.top} y2={PAD.top + plotHeight} />
              <line x1={PAD.left} x2={PAD.left + plotWidth} y1={sy(hovered.y)} y2={sy(hovered.y)} />
            </g>
          )}
          {points.map((point) => (
            <circle
              key={point.id}
              cx={sx(point.x)}
              cy={sy(point.y)}
              r={point.r}
              fill={point.fill}
              stroke={point.stroke}
              strokeWidth={2}
              fillOpacity={hovered && point.id !== hovered.id ? 0.35 : 0.9}
              className="cursor-pointer"
              onMouseEnter={() => onHover(point)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(point)}
            />
          ))}
          {/* The hovered dot again, over the rest. Moving the dot itself to the
              top took it out from under the pointer for a moment, and it
              flickered between hovered and not. */}
          {hovered && (
            <circle
              cx={sx(hovered.x)}
              cy={sy(hovered.y)}
              r={hovered.r}
              fill={hovered.fill}
              stroke={hovered.stroke}
              strokeWidth={3}
              fillOpacity={0.9}
              pointerEvents="none"
            />
          )}
        </svg>
      )}
      {hovered && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            top: Math.min(Math.max(0, sy(hovered.y) - 20), Math.max(0, height - 180)),
            ...(sx(hovered.x) > width / 2
              ? { right: width - sx(hovered.x) + 14 }
              : { left: sx(hovered.x) + 14 }),
          }}
        >
          {tooltip(hovered)}
        </div>
      )}
    </div>
  );
}
