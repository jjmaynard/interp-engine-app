'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Dot } from 'recharts';

interface FuzzyCurvePlotProps {
  points: { x: number; y: number }[];
  interpolation: string;
  inputValue: number;
  outputValue: number;
  title: string;
  propertyName?: string;
  invert?: boolean;
}

export function FuzzyCurvePlot({
  points,
  interpolation,
  inputValue,
  outputValue,
  title,
  propertyName,
  invert = false
}: FuzzyCurvePlotProps) {
  
  console.log('[FuzzyCurvePlot] Received props:', {
    pointsCount: points?.length || 0,
    points: points,
    interpolation,
    inputValue,
    outputValue,
    title,
    propertyName,
    invert
  });
  
  // Simple linear interpolation helper function
  const interpolateValue = (x: number, points: { x: number; y: number }[], method: string, invert: boolean): number => {
    if (points.length === 0) return 0;
    if (x <= points[0].x) return invert ? 1 - points[0].y : points[0].y;
    if (x >= points[points.length - 1].x) return invert ? 1 - points[points.length - 1].y : points[points.length - 1].y;
    
    // Find surrounding points
    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        const x1 = points[i].x;
        const y1 = points[i].y;
        const x2 = points[i + 1].x;
        const y2 = points[i + 1].y;
        
        // Linear interpolation
        const t = (x - x1) / (x2 - x1);
        const y = y1 + t * (y2 - y1);
        return invert ? 1 - y : y;
      }
    }
    
    return 0;
  };
  
  // Generate interpolated curve data
  const curveData = useMemo(() => {
    if (!points || points.length === 0) return [];
    
    // Sort points by x value
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    
    // Generate dense curve for smooth visualization
    const minX = sortedPoints[0].x;
    const maxX = sortedPoints[sortedPoints.length - 1].x;
    const range = maxX - minX;
    const step = range / 100; // 100 points for smooth curve
    
    const curvePoints = [];
    
    for (let x = minX; x <= maxX; x += step) {
      const y = interpolateValue(x, sortedPoints, interpolation, invert);
      curvePoints.push({ x, y, isOriginal: false });
    }
    
    // Add original points
    sortedPoints.forEach(point => {
      curvePoints.push({ 
        x: point.x, 
        y: invert ? 1 - point.y : point.y, 
        isOriginal: true 
      });
    });
    
    // Add input point
    curvePoints.push({
      x: inputValue,
      y: outputValue,
      isOriginal: false,
      isInput: true
    });
    
    return curvePoints.sort((a, b) => a.x - b.x);
  }, [points, interpolation, inputValue, outputValue, invert]);
  
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (payload.isInput) {
      // Highlight the input value point
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={3} fill="#fff" />
        </g>
      );
    }
    
    if (payload.isOriginal) {
      // Show original control points
      return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={1} />;
    }
    
    return null;
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="text-sm font-semibold">{propertyName || 'Property'}</p>
          <p className="text-sm">Value: <span className="font-mono">{data.x.toFixed(2)}</span></p>
          <p className="text-sm">Rating: <span className="font-mono">{(data.y * 100).toFixed(1)}%</span></p>
          {data.isInput && <p className="text-xs text-red-600 mt-1">← Your Input</p>}
          {data.isOriginal && <p className="text-xs text-blue-600 mt-1">Control Point</p>}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Method:</span>
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{interpolation}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Input:</span>
            <span className="font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">{inputValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Output:</span>
            <span className="font-mono bg-green-50 px-2 py-1 rounded text-green-700">{(outputValue * 100).toFixed(1)}%</span>
          </div>
          {invert && (
            <div className="flex items-center gap-2">
              <span className="text-orange-600">Inverted</span>
            </div>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={curveData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="x" 
            label={{ value: propertyName || 'Property Value', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis 
            domain={[0, 1]}
            label={{ value: 'Fuzzy Rating (0-1)', angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Reference line for input value */}
          <ReferenceLine 
            x={inputValue} 
            stroke="#ef4444" 
            strokeDasharray="3 3" 
            label={{ value: 'Input', fill: '#ef4444', fontSize: 12 }}
          />
          
          {/* Reference line for output value */}
          <ReferenceLine 
            y={outputValue} 
            stroke="#10b981" 
            strokeDasharray="3 3"
            label={{ value: `${(outputValue * 100).toFixed(1)}%`, fill: '#10b981', fontSize: 12, position: 'right' }}
          />
          
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={<CustomDot />}
            name="Fuzzy Curve"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
          <span>Control Points</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white"></div>
          <span>Your Input Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span>Fuzzy Membership Curve</span>
        </div>
      </div>
    </div>
  );
}
