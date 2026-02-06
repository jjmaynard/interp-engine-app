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
  propertyId?: string;
  evaluationId?: string | number;
  evaluationDesc?: string;
}

export function FuzzyCurvePlot({
  points,
  interpolation,
  inputValue,
  outputValue,
  title,
  propertyName,
  invert = false,
  propertyId,
  evaluationId,
  evaluationDesc
}: FuzzyCurvePlotProps) {
  
  console.log('[FuzzyCurvePlot] Received props:', {
    pointsCount: points?.length || 0,
    points: points,
    interpolation,
    inputValue,
    outputValue,
    title,
    propertyName,
    invert,
    isValidInput: !isNaN(inputValue),
    inputValueType: typeof inputValue,
    inputValueActual: inputValue
  });
  
  // Check if input value is missing/invalid
  const hasInvalidInput = isNaN(inputValue);
  
  if (hasInvalidInput) {
    console.warn('[FuzzyCurvePlot] Missing input value for property:', propertyName);
  }
  
  // Interpolation helper functions
  // CVIR S-curve (piecewise quadratic sigmoid) - matches NASIS implementation
  const sigmoid = (x: number, points: { x: number; y: number }[]): number => {
    if (points.length < 2) return points[0]?.y || 0;
    
    const min = points[0].x;
    const max = points[points.length - 1].x;
    
    if (min === max) return points[0].y;
    
    // Values outside the range
    if (x < min) return 0;
    if (x > max) return 1;
    
    // Piecewise quadratic S-curve (CVIR ComputeSCurve algorithm)
    const midpoint = (max + min) / 2;
    if (x < midpoint) {
      // First half: 2 * ((x - min) / (max - min))^2
      const normalized = (x - min) / (max - min);
      return 2 * normalized * normalized;
    } else {
      // Second half: 1 - 2 * ((x - max) / (max - min))^2
      const normalized = (x - max) / (max - min);
      return 1 - 2 * normalized * normalized;
    }
  };

  const spline = (x: number, points: { x: number; y: number }[]): number => {
    // Catmull-Rom spline interpolation for smooth curves
    if (points.length < 2) return points[0]?.y || 0;
    
    // Find the segment
    let idx = 0;
    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        idx = i;
        break;
      }
    }
    
    const p0 = points[Math.max(0, idx - 1)];
    const p1 = points[idx];
    const p2 = points[Math.min(points.length - 1, idx + 1)];
    const p3 = points[Math.min(points.length - 1, idx + 2)];
    
    const t = (x - p1.x) / (p2.x - p1.x);
    const t2 = t * t;
    const t3 = t2 * t;
    
    // Catmull-Rom basis
    const v0 = (p2.y - p0.y) / 2;
    const v1 = (p3.y - p1.y) / 2;
    
    return (2 * p1.y - 2 * p2.y + v0 + v1) * t3 +
           (-3 * p1.y + 3 * p2.y - 2 * v0 - v1) * t2 +
           v0 * t + p1.y;
  };
  
  const interpolateValue = (x: number, points: { x: number; y: number }[], method: string, invert: boolean): number => {
    if (points.length === 0) return 0;
    
    let y: number = 0; // Initialize to 0 to avoid TypeScript error
    
    // Apply appropriate interpolation method
    if (method.toLowerCase() === 'sigmoid') {
      y = sigmoid(x, points);
    } else if (method.toLowerCase() === 'spline') {
      // For spline, handle bounds first
      if (x <= points[0].x) {
        y = points[0].y;
      } else if (x >= points[points.length - 1].x) {
        y = points[points.length - 1].y;
      } else {
        y = spline(x, points);
      }
    } else {
      // Linear interpolation (default)
      if (x <= points[0].x) {
        y = points[0].y;
      } else if (x >= points[points.length - 1].x) {
        y = points[points.length - 1].y;
      } else {
        // Find surrounding points for linear interpolation
        for (let i = 0; i < points.length - 1; i++) {
          if (x >= points[i].x && x <= points[i + 1].x) {
            const x1 = points[i].x;
            const y1 = points[i].y;
            const x2 = points[i + 1].x;
            const y2 = points[i + 1].y;
            
            const t = (x - x1) / (x2 - x1);
            y = y1 + t * (y2 - y1);
            break;
          }
        }
      }
    }
    
    return invert ? 1 - y : y;
  };
  
  // Generate interpolated curve data
  const curveData = useMemo(() => {
    if (!points || points.length === 0) {
      // If no control points, just show the input/output point
      return [{
        x: inputValue,
        y: outputValue,
        isOriginal: false,
        isInput: true
      }];
    }
    
    // Sort points by x value
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    
    // Handle single point case
    if (sortedPoints.length === 1) {
      return [
        {
          x: sortedPoints[0].x,
          y: invert ? 1 - sortedPoints[0].y : sortedPoints[0].y,
          isOriginal: true
        },
        {
          x: inputValue,
          y: outputValue,
          isOriginal: false,
          isInput: true
        }
      ];
    }
    
    // Generate dense curve for smooth visualization
    const minX = sortedPoints[0].x;
    const maxX = sortedPoints[sortedPoints.length - 1].x;
    const range = maxX - minX;
    const step = range > 0 ? range / 100 : 1; // 100 points for smooth curve, avoid division by zero
    
    const curvePoints = [];
    
    if (range > 0) {
      for (let x = minX; x <= maxX; x += step) {
        const y = interpolateValue(x, sortedPoints, interpolation, invert);
        curvePoints.push({ x, y, isOriginal: false });
      }
    }
    
    // Add original points
    sortedPoints.forEach(point => {
      curvePoints.push({ 
        x: point.x, 
        y: invert ? 1 - point.y : point.y, 
        isOriginal: true 
      });
    });
    
    // Add input point only if it's valid (not NaN/missing)
    if (!hasInvalidInput) {
      curvePoints.push({
        x: inputValue,
        y: outputValue,
        isOriginal: false,
        isInput: true
      });
    }
    
    return curvePoints.sort((a, b) => a.x - b.x);
  }, [points, interpolation, inputValue, outputValue, invert, hasInvalidInput]);
  
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
      {hasInvalidInput && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Missing Property Value</p>
              <p className="text-sm mt-1">The property value for <span className="font-mono">{propertyName}</span> was not provided. The output rating shown ({(outputValue * 100).toFixed(1)}%) may be a default value or based on other factors.</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Method:</span>
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{interpolation}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Input:</span>
            <span className={`font-mono px-2 py-1 rounded ${hasInvalidInput ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {hasInvalidInput ? 'N/A (missing)' : inputValue.toFixed(2)}
            </span>
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
            type="number"
            domain={['auto', 'auto']}
            allowDataOverflow={false}
          />
          <YAxis 
            domain={[0, 1]}
            label={{ value: 'Fuzzy Rating (0-1)', angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            type="number"
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
      
      {/* Evaluation Details */}
      {(propertyId || evaluationId || evaluationDesc) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Evaluation Details</h4>
          <div className="space-y-2 text-sm">
            {propertyId && (
              <div className="flex">
                <span className="font-medium text-gray-600 w-32">Property ID:</span>
                <span className="text-gray-900 font-mono">{propertyId}</span>
              </div>
            )}
            {evaluationId && (
              <div className="flex">
                <span className="font-medium text-gray-600 w-32">Evaluation ID:</span>
                <span className="text-gray-900 font-mono">{evaluationId}</span>
              </div>
            )}
            {evaluationDesc && (
              <div className="flex flex-col">
                <span className="font-medium text-gray-600 mb-1">Description:</span>
                <span className="text-gray-700 leading-relaxed">{evaluationDesc}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
