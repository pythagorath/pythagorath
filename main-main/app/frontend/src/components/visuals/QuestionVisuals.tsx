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

export interface MeasurementData {
  type: 'length' | 'weight' | 'capacity';
  items: { name: string; value: number; unit: string }[];
}

export interface SimpleChartData {
  type: 'bar' | 'pictograph';
  data: { label: string; value: number; emoji?: string }[];
}

export type VisualType = 'number-line' | 'analog-clock' | 'coins' | 'counting-objects' | 'shapes' | 'pattern' | 'measurement' | 'simple-chart';

export type VisualData = NumberLineData | AnalogClockData | CoinDisplayData | CountingObjectsData | ShapeDisplayData | PatternDisplayData | MeasurementData | SimpleChartData;

// ===== Number Line Component =====
function NumberLine({ data }: { data: NumberLineData }) {
  const { start, end, highlight = [], jumpFrom, jumpTo, jumpCount } = data;
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const totalWidth = numbers.length;

  return (
    <div className="my-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200" dir="ltr">
      <div className="relative overflow-x-auto pb-2">
        {/* Jump arrows */}
        {jumpFrom !== undefined && jumpTo !== undefined && jumpCount !== undefined && (
          <div className="flex justify-center mb-2">
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
              +{jumpCount} قفزات
            </div>
          </div>
        )}
        
        {/* Number line */}
        <div className="flex items-center justify-center gap-0 min-w-fit mx-auto">
          {numbers.map((num, idx) => {
            const isHighlighted = highlight.includes(num);
            const isJumpStart = num === jumpFrom;
            const isJumpEnd = num === jumpTo;
            const isInJumpRange = jumpFrom !== undefined && jumpTo !== undefined && num >= jumpFrom && num <= jumpTo;
            
            return (
              <div key={num} className="flex flex-col items-center relative">
                {/* Tick and line */}
                <div className="flex items-center">
                  {idx === 0 && <div className="w-2 h-0.5 bg-gray-400" />}
                  <div className={`flex flex-col items-center ${totalWidth > 12 ? 'w-6' : 'w-8'}`}>
                    {/* Jump arc indicator */}
                    {isInJumpRange && num !== jumpFrom && (
                      <div className="absolute -top-3 w-full h-3 border-t-2 border-green-400 rounded-t-full" />
                    )}
                    <div className={`w-0.5 h-4 ${isHighlighted || isJumpStart || isJumpEnd ? 'bg-blue-600' : 'bg-gray-400'}`} />
                    <div className={`h-0.5 w-full ${isHighlighted || isInJumpRange ? 'bg-blue-600' : 'bg-gray-400'}`} />
                    <span className={`text-xs mt-1 font-bold ${
                      isHighlighted ? 'text-blue-700 bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center' :
                      isJumpStart || isJumpEnd ? 'text-green-700 bg-green-200 rounded-full w-5 h-5 flex items-center justify-center' :
                      'text-gray-600'
                    }`}>
                      {num}
                    </span>
                  </div>
                  {idx === numbers.length - 1 && (
                    <div className="flex items-center">
                      <div className="w-2 h-0.5 bg-gray-400" />
                      <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== Analog Clock Component =====
function AnalogClock({ data }: { data: AnalogClockData }) {
  const { hours, minutes } = data;
  
  const hourAngle = useMemo(() => {
    return (hours % 12) * 30 + minutes * 0.5;
  }, [hours, minutes]);
  
  const minuteAngle = useMemo(() => {
    return minutes * 6;
  }, [minutes]);

  return (
    <div className="my-4 flex justify-center">
      <div className="relative w-48 h-48 bg-white rounded-full border-4 border-indigo-300 shadow-lg">
        {/* Clock numbers */}
        {[...Array(12)].map((_, i) => {
          const num = i + 1;
          const angle = (num * 30 - 90) * (Math.PI / 180);
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          return (
            <span
              key={num}
              className="absolute text-sm font-bold text-indigo-800"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {num}
            </span>
          );
        })}
        
        {/* Minute marks */}
        {[...Array(60)].map((_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const isMajor = i % 5 === 0;
          const innerR = isMajor ? 42 : 44;
          const outerR = 47;
          const x1 = 50 + innerR * Math.cos(angle);
          const y1 = 50 + innerR * Math.sin(angle);
          const x2 = 50 + outerR * Math.cos(angle);
          const y2 = 50 + outerR * Math.sin(angle);
          return (
            <div
              key={i}
              className={`absolute ${isMajor ? 'bg-indigo-600' : 'bg-gray-300'}`}
              style={{
                left: `${(x1 + x2) / 2}%`,
                top: `${(y1 + y2) / 2}%`,
                width: isMajor ? '3px' : '1px',
                height: isMajor ? '8px' : '4px',
                transform: `translate(-50%, -50%) rotate(${i * 6}deg)`,
              }}
            />
          );
        })}
        
        {/* Hour hand */}
        <div
          className="absolute bg-indigo-800 rounded-full origin-bottom"
          style={{
            width: '4px',
            height: '28%',
            left: 'calc(50% - 2px)',
            bottom: '50%',
            transform: `rotate(${hourAngle}deg)`,
            transformOrigin: 'bottom center',
          }}
        />
        
        {/* Minute hand */}
        <div
          className="absolute bg-blue-500 rounded-full origin-bottom"
          style={{
            width: '3px',
            height: '36%',
            left: 'calc(50% - 1.5px)',
            bottom: '50%',
            transform: `rotate(${minuteAngle}deg)`,
            transformOrigin: 'bottom center',
          }}
        />
        
        {/* Center dot */}
        <div className="absolute w-3 h-3 bg-red-500 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10" />
      </div>
    </div>
  );
}

// ===== Coin Display Component =====
function CoinDisplay({ data }: { data: CoinDisplayData }) {
  const { coins, currency = 'ر.ع' } = data;
  
  return (
    <div className="my-4 p-4 bg-amber-50 rounded-xl border-2 border-amber-200">
      <div className="flex flex-wrap justify-center gap-3">
        {coins.map((coin, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            {[...Array(coin.count)].map((_, i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 ${
                  coin.value >= 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-600 text-yellow-900' :
                  'bg-gradient-to-br from-gray-200 to-gray-400 border-gray-500 text-gray-800'
                }`}
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

// ===== Counting Objects Component =====
function CountingObjects({ data }: { data: CountingObjectsData }) {
  const { emoji, count, arrangement = 'line' } = data;
  
  const objects = Array.from({ length: count }, (_, i) => i);
  
  return (
    <div className="my-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
      <div className={`flex flex-wrap justify-center ${
        arrangement === 'grid' ? 'gap-3 max-w-[200px] mx-auto' :
        arrangement === 'random' ? 'gap-2' :
        'gap-2'
      }`}>
        {objects.map((_, idx) => (
          <span
            key={idx}
            className={`text-3xl ${arrangement === 'random' ? 'transform' : ''}`}
            style={arrangement === 'random' ? {
              transform: `rotate(${Math.random() * 20 - 10}deg) translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`,
            } : undefined}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== Shape Display Component =====
function ShapeDisplay({ data }: { data: ShapeDisplayData }) {
  const { shape, count = 1, showSymmetry = false, color = '#4F46E5' } = data;
  
  const renderShape = (key: number) => {
    const size = 60;
    switch (shape) {
      case 'circle':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="25" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
            {showSymmetry && <line x1="30" y1="5" x2="30" y2="55" stroke="red" strokeWidth="1.5" strokeDasharray="4" />}
          </svg>
        );
      case 'square':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <rect x="8" y="8" width="44" height="44" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
            {showSymmetry && <line x1="30" y1="5" x2="30" y2="55" stroke="red" strokeWidth="1.5" strokeDasharray="4" />}
          </svg>
        );
      case 'triangle':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <polygon points="30,5 55,55 5,55" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
            {showSymmetry && <line x1="30" y1="5" x2="30" y2="55" stroke="red" strokeWidth="1.5" strokeDasharray="4" />}
          </svg>
        );
      case 'rectangle':
        return (
          <svg key={key} width={size * 1.5} height={size} viewBox="0 0 90 60">
            <rect x="5" y="10" width="80" height="40" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
            {showSymmetry && <line x1="45" y1="5" x2="45" y2="55" stroke="red" strokeWidth="1.5" strokeDasharray="4" />}
          </svg>
        );
      case 'hexagon':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <polygon points="30,5 52,17 52,42 30,55 8,42 8,17" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
            {showSymmetry && <line x1="30" y1="5" x2="30" y2="55" stroke="red" strokeWidth="1.5" strokeDasharray="4" />}
          </svg>
        );
      case 'pentagon':
        return (
          <svg key={key} width={size} height={size} viewBox="0 0 60 60">
            <polygon points="30,5 55,23 47,53 13,53 5,23" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
            {showSymmetry && <line x1="30" y1="5" x2="30" y2="55" stroke="red" strokeWidth="1.5" strokeDasharray="4" />}
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="my-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: count }, (_, i) => renderShape(i))}
      </div>
      {showSymmetry && (
        <p className="text-center text-xs text-red-600 mt-2 font-medium">
          --- خط التماثل ---
        </p>
      )}
    </div>
  );
}

// ===== Pattern Display Component =====
function PatternDisplay({ data }: { data: PatternDisplayData }) {
  const { items, missingIndex } = data;
  
  return (
    <div className="my-4 p-4 bg-pink-50 rounded-xl border-2 border-pink-200">
      <div className="flex flex-wrap justify-center items-center gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {idx === missingIndex ? (
              <div className="w-10 h-10 border-2 border-dashed border-pink-400 rounded-lg flex items-center justify-center text-pink-400 font-bold">
                ?
              </div>
            ) : (
              <span className="text-3xl">{item}</span>
            )}
            {idx < items.length - 1 && <span className="text-gray-300 mx-0.5">،</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Measurement Visual Component =====
function MeasurementVisual({ data }: { data: MeasurementData }) {
  const { type, items } = data;
  const maxValue = Math.max(...items.map(i => i.value));
  
  const icon = type === 'length' ? '📏' : type === 'weight' ? '⚖️' : '🫗';
  
  return (
    <div className="my-4 p-4 bg-teal-50 rounded-xl border-2 border-teal-200">
      <div className="flex items-center justify-center gap-1 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-teal-700">
          {type === 'length' ? 'مقارنة الأطوال' : type === 'weight' ? 'مقارنة الأوزان' : 'مقارنة السعة'}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-sm font-medium w-16 text-left">{item.name}</span>
            <div className="flex-1 bg-teal-100 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-teal-400 to-teal-600 rounded-full flex items-center justify-end px-2 transition-all"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              >
                <span className="text-[10px] text-white font-bold">{item.value} {item.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Simple Chart Component =====
function SimpleChart({ data }: { data: SimpleChartData }) {
  const { type, data: chartData } = data;
  const maxValue = Math.max(...chartData.map(d => d.value));
  
  if (type === 'pictograph') {
    return (
      <div className="my-4 p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
        <div className="space-y-2">
          {chartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm font-medium w-16 text-left">{item.label}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: item.value }, (_, i) => (
                  <span key={i} className="text-lg">{item.emoji || '⭐'}</span>
                ))}
              </div>
              <span className="text-xs text-gray-500">({item.value})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="my-4 p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
      <div className="flex items-end justify-center gap-3 h-32">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-orange-700">{item.value}</span>
            <div
              className="w-10 bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-md transition-all"
              style={{ height: `${(item.value / maxValue) * 80}%`, minHeight: '8px' }}
            />
            <span className="text-xs text-gray-600 mt-1">{item.emoji || ''}</span>
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Main Dispatcher Component =====
interface QuestionVisualProps {
  visualType: VisualType;
  visualData: VisualData;
}

export default function QuestionVisual({ visualType, visualData }: QuestionVisualProps) {
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
    case 'measurement':
      return <MeasurementVisual data={visualData as MeasurementData} />;
    case 'simple-chart':
      return <SimpleChart data={visualData as SimpleChartData} />;
    default:
      return null;
  }
}