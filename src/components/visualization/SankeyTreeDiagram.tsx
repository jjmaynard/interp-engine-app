'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  type: 'property' | 'operator' | 'result';
  level: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  operator?: string;
}

interface SankeyTreeDiagramProps {
  tree: any;
}

export function SankeyTreeDiagram({ tree }: SankeyTreeDiagramProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  const { nodes, links, maxLevel } = useMemo(() => {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    let nodeIdCounter = 0;
    const nodeMap = new Map<string, SankeyNode>();
    
    // Process tree to extract nodes and links
    function processNode(treeNode: any, level: number, parentId?: string, parentOperator?: string): string {
      const nodeId = `node-${nodeIdCounter++}`;
      const rating = treeNode.rating || 0;
      
      // Determine node type
      const isOperator = treeNode.Type && !treeNode.RefId && !treeNode.rule_refid;
      const isProperty = treeNode.RefId || treeNode.rule_refid;
      
      if (!isOperator) {
        // Create node for evaluations and root
        const node: SankeyNode = {
          id: nodeId,
          name: treeNode.levelName || treeNode.name || treeNode.Type || 'Unknown',
          value: rating,
          type: level === 0 ? 'result' : 'property',
          level
        };
        
        nodes.push(node);
        nodeMap.set(nodeId, node);
      }
      
      // Process children
      if (treeNode.children && treeNode.children.length > 0) {
        const currentOperator = isOperator ? treeNode.Type : undefined;
        const effectiveParentId = isOperator ? parentId : nodeId;
        const effectiveLevel = isOperator ? level : level + 1;
        
        treeNode.children.forEach((child: any) => {
          const childId = processNode(child, effectiveLevel, effectiveParentId, currentOperator || parentOperator);
          
          // Create link
          if (effectiveParentId && childId) {
            links.push({
              source: childId,
              target: effectiveParentId,
              value: child.rating || 0,
              operator: currentOperator || parentOperator
            });
          }
        });
      }
      
      return nodeId;
    }
    
    processNode(tree, 0);
    
    const maxLevel = Math.max(...nodes.map(n => n.level));
    
    return { nodes, links, maxLevel };
  }, [tree]);
  
  // Calculate layout positions
  const layout = useMemo(() => {
    const nodeWidth = 180;
    const nodeHeight = 50;
    const nodePadding = 30;
    const levelPadding = 250;
    
    // Group nodes by level
    const levelGroups = new Map<number, SankeyNode[]>();
    nodes.forEach(node => {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    });
    
    // Calculate positions (left to right)
    const positions = new Map<string, { x: number; y: number; height: number }>();
    
    levelGroups.forEach((levelNodes, level) => {
      const totalHeight = levelNodes.length * (nodeHeight + nodePadding);
      
      levelNodes.forEach((node, index) => {
        const x = level * levelPadding + 50; // Left to right
        const y = index * (nodeHeight + nodePadding) + 50;
        const nodeDisplayHeight = Math.max(nodeHeight, node.value * 80); // Scale by rating
        
        positions.set(node.id, { x, y, height: nodeDisplayHeight });
      });
    });
    
    // Calculate total dimensions
    const width = (maxLevel + 1) * levelPadding + nodeWidth + 100;
    const maxY = Math.max(...Array.from(positions.values()).map(p => p.y + p.height));
    const height = maxY + 50;
    
    return { positions, width, height, nodeHeight, nodeWidth };
  }, [nodes, maxLevel]);
  
  // Get color for rating
  const getRatingColor = (rating: number): string => {
    if (rating >= 0.8) return '#10b981'; // green
    if (rating >= 0.6) return '#84cc16'; // lime
    if (rating >= 0.4) return '#fbbf24'; // amber
    if (rating >= 0.2) return '#f97316'; // orange
    return '#ef4444'; // red
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
    }
  }, []);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
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
      {/* Header with controls */}
      <div className={`${isFullscreen ? 'bg-white border-b border-gray-200' : ''} p-4 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Interpretation Flow Diagram</h3>
            <p className="text-sm text-gray-600">Property evaluations flow through operators to produce the final rating • <span className="font-medium">Drag to pan • Ctrl+Scroll to zoom</span></p>
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
            
            {/* Pan/Reset controls */}
            <button
              onClick={resetView}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title="Reset view"
            >
              <Move className="w-4 h-4" />
              Reset
            </button>
            
            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
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
      
      {/* Scrollable diagram area */}
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
          className="inline-block"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease',
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          <svg 
            ref={svgRef}
            width={layout.width} 
            height={layout.height}
            style={{ display: 'block' }}
          >
        <defs>
          {/* Gradient for links */}
          {links.map((link, i) => {
            const sourcePos = layout.positions.get(link.source);
            const targetPos = layout.positions.get(link.target);
            if (!sourcePos || !targetPos) return null;
            
            return (
              <linearGradient 
                key={`gradient-${i}`} 
                id={`gradient-${i}`}
                x1="0%" y1="0%" x2="100%" y2="0%"
              >
                <stop offset="0%" stopColor={getRatingColor(link.value)} stopOpacity={0.6} />
                <stop offset="100%" stopColor={getRatingColor(link.value)} stopOpacity={0.3} />
              </linearGradient>
            );
          })}
        </defs>
        
        {/* Draw links (flows) */}
        {links.map((link, i) => {
          const sourcePos = layout.positions.get(link.source);
          const targetPos = layout.positions.get(link.target);
          if (!sourcePos || !targetPos) return null;
          
          const sourceNode = nodes.find(n => n.id === link.source);
          const targetNode = nodes.find(n => n.id === link.target);
          if (!sourceNode || !targetNode) return null;
          
          const sourceX = sourcePos.x + layout.nodeWidth; // Right edge of source
          const sourceY = sourcePos.y + sourcePos.height / 2;
          const targetX = targetPos.x; // Left edge of target
          const targetY = targetPos.y + targetPos.height / 2;
          
          const strokeWidth = Math.max(3, link.value * 50);
          
          // Bezier curve path
          const midX = (sourceX + targetX) / 2;
          const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
          
          return (
            <g key={`link-${i}`}>
              <path
                d={path}
                fill="none"
                stroke={`url(#gradient-${i})`}
                strokeWidth={strokeWidth}
                opacity={0.6}
              />
              {/* Operator label on link */}
              {link.operator && (
                <g>
                  <rect
                    x={midX - 30}
                    y={(sourceY + targetY) / 2 - 12}
                    width={60}
                    height={24}
                    fill="#fef3c7"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    rx={4}
                  />
                  <text
                    x={midX}
                    y={(sourceY + targetY) / 2 + 5}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="#92400e"
                  >
                    {link.operator}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        
        {/* Draw nodes */}
        {nodes.map((node) => {
          const pos = layout.positions.get(node.id);
          if (!pos) return null;
          
          const color = getRatingColor(node.value);
          const isResult = node.type === 'result';
          
          return (
            <g key={node.id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={layout.nodeWidth}
                height={pos.height}
                fill={color}
                stroke={isResult ? '#1f2937' : color}
                strokeWidth={isResult ? 3 : 1}
                rx={6}
                opacity={0.9}
              />
              <text
                x={pos.x + layout.nodeWidth / 2}
                y={pos.y + pos.height / 2 - 5}
                textAnchor="middle"
                fontSize={isResult ? 14 : 12}
                fontWeight={isResult ? 700 : 600}
                fill="white"
              >
                {node.name.length > 22 ? node.name.substring(0, 19) + '...' : node.name}
              </text>
              <text
                x={pos.x + layout.nodeWidth / 2}
                y={pos.y + pos.height / 2 + 12}
                textAnchor="middle"
                fontSize={isResult ? 16 : 13}
                fontWeight={700}
                fill="white"
              >
                {(node.value * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}
          </svg>
        </div>
      </div>
      
      {/* Legend */}
      <div className={`${isFullscreen ? 'bg-white border-t border-gray-200' : ''} p-4 flex-shrink-0`}>
        <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span>Properties</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            <span>Operators</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-gray-800"></div>
            <span>Final Result</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-gradient-to-r from-green-500 to-red-500"></div>
            <span>Rating (High → Low)</span>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Use portal for fullscreen mode
  if (isFullscreen && typeof window !== 'undefined') {
    return createPortal(renderContent(), document.body);
  }
  
  return renderContent();
}
