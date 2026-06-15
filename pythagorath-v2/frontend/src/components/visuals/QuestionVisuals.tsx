/**
 * Visual interaction renderer — PORTED as-is from the previous project (a kept
 * asset, §10). Pure visual dispatcher with no data/file coupling: it renders the
 * question STIMULUS (number line, counting objects, shapes, clock, ...) from a
 * plain data object. The answer input lives in the question screen.
 */
import { useMemo } from 'react';

// ===== Types =====
export interface NumberLineData {
  start: number;
  end: number;
  highlight?: number[];
  jumpFrom?: number;
  jumpTo?: number;
  jumpCount?: number;
}

export interface AnalogClockData {
  hours: number;
  minutes: number;
}

export interface CoinDisplayData {
  coins: { value: number; label: string; count: number }[];
  currency?: string;
}

export interface CountingObjectsData {
  emoji: string;
  count: number;
  arrangement?: 'line' | 'grid' | 'random';
}

export interface ShapeDisplayData {
  shape: 'circle' | 'square' | 'triangle' | 'rectangle' | 'hexagon' | 'pentagon';
  count?: number;
  showSymmetry?: boolean;
  color?: string;
}

export interface PatternDisplayData {
  items: string[];
  missingIndex?: number;
}

export type VisualType =
  | 'number-line'
  | 'analog-clock'
  | 'coins'
  | 'counting-objects'
  | 'shapes'
  | 'pattern';

export type VisualData =
  | NumberLineData
  | AnalogClockData
  | CoinDisplayData
  | CountingObjectsData
  | ShapeDisplayData
  | PatternDisplayData;

// ===== Number Line =====
function NumberLine({ data }: { data: NumberLineData }) {
  const { start, end, highlight = [], jumpFrom, jumpTo } = data;
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="my-4 p-4 bg-secondary rounded-xl border-2 border-border" dir="ltr">
      <div className="flex items-end justify-center gap-0 min-w-fit mx-auto">
        {numbers.map((num) => {
          const isHi = highlight.includes(num) || num === jumpFrom || num === jumpTo;
          return (
            <div key={num} className="flex flex-col items-center w-9">
              <div className={`w-0.5 h-5 ${isHi ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              <div className={`h-0.5 w-full ${isHi ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              <span
                className={`text-base mt-1 font-bold ${
                  isHi
                    ? 'text-primary-foreground bg-primary rounded-full w-7 h-7 flex items-center justify-center'
                    : 'text-muted-foreground'
                }`}
              >
                {num}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Analog Clock =====
function AnalogClock({ data }: { data: AnalogClockData }) {
  const { hours, minutes } = data;
  const hourAngle = useMemo(() => (hours % 12) * 30 + minutes * 0.5, [hours, minutes]);
  const minuteAngle = useMemo(() => minutes * 6, [minutes]);

  return (
    <div className="my-4 flex justify-center">
      <div className="relative w-48 h-48 bg-card rounded-full border-4 border-primary/40 shadow-lg">
        {[...Array(12)].map((_, i) => {
          const num = i + 1;
          const angle = (num * 30 - 90) * (Math.PI / 180);
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          return (
            <span
              key={num}
              className="absolute text-sm font-bold text-foreground"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {num}
            </span>
          );
        })}
        <div
          className="absolute bg-foreground rounded-full"
          style={{
            width: '4px', height: '28%', left: 'calc(50% - 2px)', bottom: '50%',
            transform: `rotate(${hourAngle}deg)`, transformOrigin: 'bottom center',
          }}
        />
        <div
          className="absolute bg-primary rounded-full"
          style={{
            width: '3px', height: '36%', left: 'calc(50% - 1.5px)', bottom: '50%',
            transform: `rotate(${minuteAngle}deg)`, transformOrigin: 'bottom center',
          }}
        />
        <div className="absolute w-3 h-3 bg-accent rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
      </div>
    </div>
  );
}

// ===== Coins =====
function CoinDisplay({ data }: { data: CoinDisplayData }) {
  const { coins, currency = 'ر.ع' } = data;
  return (
    <div className="my-4 p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
      <div className="flex flex-wrap justify-center gap-3">
        {coins.map((coin, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            {[...Array(coin.count)].map((_, i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 bg-gradient-to-br from-accent/70 to-primary border-primary text-primary-foreground"
              >
                <div className="text-center leading-tight">
                  <div className="text-xs">{coin.label}</div>
                  <div className="text-[10px]">{currency}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Counting Objects =====
function CountingObjects({ data }: { data: CountingObjectsData }) {
  const { emoji, count, arrangement = 'line' } = data;
  const objects = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="my-4 p-5 bg-primary/5 rounded-xl border-2 border-primary/20">
      <div
        className={`flex flex-wrap justify-center ${
          arrangement === 'grid' ? 'gap-3 max-w-[240px] mx-auto' : 'gap-2'
        }`}
      >
        {objects.map((_, idx) => (
          <span
            key={idx}
            className="text-4xl"
            style={
              arrangement === 'random'
                ? { transform: `rotate(${Math.random() * 20 - 10}deg)` }
                : undefined
            }
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== Shapes =====
function ShapeDisplay({ data }: { data: ShapeDisplayData }) {
  const { shape, count = 1, color = 'hsl(34 90% 55%)' } = data;
  const size = 60;
  const renderShape = (key: number) => {
    switch (shape) {
      case 'circle':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="25" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
          </svg>
        );
      case 'square':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <rect x="8" y="8" width="44" height="44" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
          </svg>
        );
      case 'triangle':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <polygon points="30,5 55,55 5,55" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
          </svg>
        );
      case 'rectangle':
        return (
          <svg key={key} width={size * 1.5} height={size} viewBox="0 0 90 60">
            <rect x="5" y="10" width="80" height="40" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
          </svg>
        );
      case 'hexagon':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <polygon points="30,5 52,17 52,42 30,55 8,42 8,17" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
          </svg>
        );
      case 'pentagon':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <polygon points="30,5 55,23 47,53 13,53 5,23" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
          </svg>
        );
      default:
        return null;
    }
  };
  return (
    <div className="my-4 p-4 bg-secondary rounded-xl border-2 border-border">
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: count }, (_, i) => renderShape(i))}
      </div>
    </div>
  );
}

// ===== Pattern =====
function PatternDisplay({ data }: { data: PatternDisplayData }) {
  const { items, missingIndex } = data;
  return (
    <div className="my-4 p-4 bg-secondary rounded-xl border-2 border-border">
      <div className="flex flex-wrap justify-center items-center gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {idx === missingIndex ? (
              <div className="w-10 h-10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center text-primary font-bold">
                ?
              </div>
            ) : (
              <span className="text-3xl">{item}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Dispatcher =====
export default function QuestionVisual({
  visualType,
  visualData,
}: {
  visualType: VisualType;
  visualData: VisualData;
}) {
  switch (visualType) {
    case 'number-line':
      return <NumberLine data={visualData as NumberLineData} />;
    case 'analog-clock':
      return <AnalogClock data={visualData as AnalogClockData} />;
    case 'coins':
      return <CoinDisplay data={visualData as CoinDisplayData} />;
    case 'counting-objects':
      return <CountingObjects data={visualData as CountingObjectsData} />;
    case 'shapes':
      return <ShapeDisplay data={visualData as ShapeDisplayData} />;
    case 'pattern':
      return <PatternDisplay data={visualData as PatternDisplayData} />;
    default:
      return null;
  }
}
