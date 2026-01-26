'use client';

import { useMemo } from 'react';
import { Maximize2 } from 'lucide-react';

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
    const width = 1200;
    const height = 600;
    const nodeHeight = 40;
    const nodePadding = 20;
    
    // Group nodes by level
    const levelGroups = new Map<number, SankeyNode[]>();
    nodes.forEach(node => {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, []);
      }
      levelGroups.get(node.level)!.push(node);
    });
    
    // Calculate positions
    const levelWidth = width / (maxLevel + 1);
    const positions = new Map<string, { x: number; y: number; height: number }>();
    
    levelGroups.forEach((levelNodes, level) => {
      const totalHeight = levelNodes.length * (nodeHeight + nodePadding);
      const startY = (height - totalHeight) / 2;
      
      levelNodes.forEach((node, index) => {
        const x = (maxLevel - level) * levelWidth; // Reverse direction (right to left)
        const y = startY + index * (nodeHeight + nodePadding);
        const nodeDisplayHeight = Math.max(nodeHeight, node.value * 100); // Scale by rating
        
        positions.set(node.id, { x, y, height: nodeDisplayHeight });
      });
    });
    
    return { positions, width, height, nodeHeight };
  }, [nodes, maxLevel]);
  
  // Get color for rating
  const getRatingColor = (rating: number): string => {
    if (rating >= 0.8) return '#10b981'; // green
    if (rating >= 0.6) return '#84cc16'; // lime
    if (rating >= 0.4) return '#fbbf24'; // amber
    if (rating >= 0.2) return '#f97316'; // orange
    return '#ef4444'; // red
  };
  
  return (
    <div className="relative w-full h-[800px] bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Interpretation Flow Diagram</h3>
        <p className="text-sm text-gray-600">Property evaluations flow through operators to produce the final rating</p>
      </div>
      
      <svg 
        width={layout.width} 
        height={layout.height} 
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
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
          
          const sourceX = sourcePos.x + 150; // Node width
          const sourceY = sourcePos.y + sourcePos.height / 2;
          const targetX = targetPos.x;
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
                width={150}
                height={pos.height}
                fill={color}
                stroke={isResult ? '#1f2937' : color}
                strokeWidth={isResult ? 3 : 1}
                rx={6}
                opacity={0.9}
              />
              <text
                x={pos.x + 75}
                y={pos.y + pos.height / 2 - 5}
                textAnchor="middle"
                fontSize={isResult ? 14 : 12}
                fontWeight={isResult ? 700 : 600}
                fill="white"
              >
                {node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name}
              </text>
              <text
                x={pos.x + 75}
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
      
      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
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
  );
}
