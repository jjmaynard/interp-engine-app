'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface SunburstTreeProps {
  tree: any;
}

export function SunburstTreeDiagram({ tree }: SunburstTreeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { paths, centerRadius, maxRadius } = useMemo(() => {
    const paths: any[] = [];
    const centerRadius = 60;
    const ringWidth = 80;
    let maxDepth = 0;
    let nodeCounter = 0; // Add unique counter for node IDs

    const processNode = (
      node: any,
      depth: number,
      startAngle: number,
      endAngle: number
    ) => {
      maxDepth = Math.max(maxDepth, depth);
      const nodeId = `node-${nodeCounter++}`; // Use unique counter instead of parent-based ID
      const isOperator = node.Type && !node.RefId && !node.rule_refid;

      if (!isOperator) {
        const innerRadius = centerRadius + depth * ringWidth;
        const outerRadius = centerRadius + (depth + 1) * ringWidth;
        const rating = node.rating || 0;

        paths.push({
          id: nodeId,
          name: node.levelName || node.name || node.Type || 'Unknown',
          rating,
          innerRadius,
          outerRadius,
          startAngle,
          endAngle,
          depth,
          isOperator: false
        });
      }

      if (node.children && node.children.length > 0) {
        const angleSpan = endAngle - startAngle;
        const childAngleSpan = angleSpan / node.children.length;

        node.children.forEach((child: any, index: number) => {
          const childStartAngle = startAngle + index * childAngleSpan;
          const childEndAngle = childStartAngle + childAngleSpan;
          const effectiveDepth = isOperator ? depth : depth + 1;
          
          processNode(child, effectiveDepth, childStartAngle, childEndAngle);
        });
      }
    };

    processNode(tree, 0, 0, 360);

    return {
      paths,
      centerRadius,
      maxRadius: centerRadius + (maxDepth + 1) * ringWidth
    };
  }, [tree]);

  const getRatingColor = (rating: number): string => {
    if (rating >= 0.8) return '#10b981'; // green
    if (rating >= 0.6) return '#84cc16'; // lime
    if (rating >= 0.4) return '#fbbf24'; // amber
    if (rating >= 0.2) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const describeArc = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const createArcPath = (
    centerX: number,
    centerY: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
    const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
    const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
    const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
      `L ${outerEnd.x} ${outerEnd.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerStart.x} ${outerStart.y}`,
      'Z'
    ].join(' ');
  };

  const size = maxRadius * 2 + 100;
  const centerX = size / 2;
  const centerY = size / 2;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.3));
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
    }
  }, []);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const renderContent = () => (
    <div className={`${
      isFullscreen
        ? 'fixed inset-0 w-screen h-screen bg-gray-50 z-[999999] flex flex-col'
        : 'relative w-full bg-white rounded-lg border border-gray-200 flex flex-col'
    }`}>
      {/* Header */}
      <div className={`${isFullscreen ? 'bg-white border-b border-gray-200' : ''} p-4 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Radial Sunburst Diagram</h3>
            <p className="text-sm text-gray-600">Hierarchical structure displayed as concentric rings • <span className="font-medium">Drag to pan • Ctrl+Scroll to zoom</span></p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Zoom out (or Ctrl+Scroll)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-medium min-w-[60px] text-center">
                {(zoom * 100).toFixed(0)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Zoom in (or Ctrl+Scroll)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            {/* Reset button */}
            <button
              onClick={resetView}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Reset view"
            >
              <Move className="w-4 h-4" />
              Reset
            </button>

            {/* Fullscreen button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  Exit
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  Fullscreen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Diagram area */}
      <div 
        className="flex-1 overflow-auto bg-gray-50"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div 
          className="inline-block min-w-full min-h-full flex items-center justify-center p-12"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease'
          }}
        >
          <svg 
            ref={svgRef}
            width={size} 
            height={size} 
            className="drop-shadow-lg"
            style={{ display: 'block' }}
          >
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={centerRadius}
            fill="#6366f1"
            stroke="#4f46e5"
            strokeWidth={2}
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dy=".3em"
            fontSize={14}
            fontWeight={700}
            fill="white"
          >
            {tree?.name || tree?.levelName || 'Root'}
          </text>
          {tree?.rating !== undefined && tree?.rating !== null && (
            <text
              x={centerX}
              y={centerY + 20}
              textAnchor="middle"
              fontSize={16}
              fontWeight={700}
              fill="white"
            >
              {(tree.rating * 100).toFixed(0)}%
            </text>
          )}

          {/* Arcs */}
          {paths.map((path: any) => {
            const isHovered = hoveredNode === path.id;
            return (
              <g key={path.id}>
                <path
                  d={createArcPath(
                    centerX,
                    centerY,
                    path.innerRadius,
                    path.outerRadius,
                    path.startAngle,
                    path.endAngle
                  )}
                  fill={getRatingColor(path.rating)}
                  stroke="white"
                  strokeWidth={2}
                  opacity={isHovered ? 1 : 0.85}
                  onMouseEnter={() => setHoveredNode(path.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer transition-opacity"
                />

                {/* Label if arc is large enough */}
                {path.endAngle - path.startAngle > 15 && (
                  <text
                    x={centerX}
                    y={centerY}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill="white"
                    pointerEvents="none"
                    transform={`
                      rotate(${(path.startAngle + path.endAngle) / 2}, ${centerX}, ${centerY})
                      translate(0, ${-(path.innerRadius + path.outerRadius) / 2})
                    `}
                  >
                    {path.name.length > 12 ? path.name.substring(0, 10) + '...' : path.name}
                  </text>
                )}
              </g>
            );
          })}
          </svg>
        </div>

        {/* Hover tooltip */}
        {hoveredNode && (
          <div className="fixed top-20 right-4 bg-white rounded-lg shadow-xl p-4 border border-gray-200 max-w-xs z-50">
            {paths.find((p: any) => p.id === hoveredNode) && (
              <>
                <div className="font-semibold text-gray-900 mb-2">
                  {paths.find((p: any) => p.id === hoveredNode).name}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${paths.find((p: any) => p.id === hoveredNode).rating * 100}%`,
                        backgroundColor: getRatingColor(paths.find((p: any) => p.id === hoveredNode).rating)
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {(paths.find((p: any) => p.id === hoveredNode).rating * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={`${isFullscreen ? 'bg-white border-t border-gray-200' : ''} p-4 flex-shrink-0`}>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-gradient-to-r from-green-500 to-red-500"></div>
            <span>Rating (High → Low)</span>
          </div>
          <div className="text-xs text-gray-500">
            Inner rings = root • Outer rings = leaf evaluations
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen && typeof window !== 'undefined') {
    return createPortal(renderContent(), document.body);
  }

  return renderContent();
}
