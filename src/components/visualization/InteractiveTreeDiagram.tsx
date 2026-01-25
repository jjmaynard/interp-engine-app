'use client';

import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  NodeTypes,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RuleNode } from '@/types/interpretation';
import { ChevronDown, ChevronRight, Eye, TrendingUp, Maximize2, Minimize2 } from 'lucide-react';

// Note: tree nodes are enriched at runtime with additional properties
interface InteractiveTreeDiagramProps {
  tree: any; // RuleNode enriched with label, Evaluation, rating
  onNodeClick?: (node: any) => void;
  onShowCurve?: (evaluation: any) => void;
}

// Branch colors for differentiation
const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

// Custom node component with rating visualization
function DecisionNode({ data }: any) {
  const { node, onExpand, isExpanded, onShowCurve, rating, branchColor } = data;
  
  const getRatingColor = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return '#9ca3af'; // gray-400
    }
    
    // Determine if this is a productivity or limitation type
    const nodeName = node.levelName || node.name || '';
    const isProductivity = nodeName.toLowerCase().includes('productivity') ||
                          nodeName.toLowerCase().includes('nccpi') ||
                          nodeName.toLowerCase().includes('sqi') ||
                          nodeName.toLowerCase().includes('yield');
    
    if (isProductivity) {
      // Green for high ratings
      if (rating >= 0.8) return '#10b981'; // green-500
      if (rating >= 0.6) return '#84cc16'; // lime-500
      if (rating >= 0.4) return '#fbbf24'; // amber-400
      if (rating >= 0.2) return '#f97316'; // orange-500
      return '#ef4444'; // red-500
    } else {
      // Red for high ratings (limitations)
      if (rating >= 0.8) return '#ef4444'; // red-500
      if (rating >= 0.6) return '#f97316'; // orange-500
      if (rating >= 0.4) return '#fbbf24'; // amber-400
      if (rating >= 0.2) return '#84cc16'; // lime-500
      return '#10b981'; // green-500
    }
  };
  
  const nodeColor = getRatingColor(rating);
  const hasChildren = node.children && node.children.length > 0;
  const isFuzzyEvaluation = false; // Will need to check evaluation data differently
  
  return (
    <div 
      className="px-4 py-2 rounded-lg border-2 bg-white shadow-md min-w-[200px] max-w-[300px]"
      style={{ 
        borderColor: branchColor || nodeColor,
        borderLeftWidth: '4px',
        borderLeftColor: branchColor || nodeColor
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {node.levelName || node.name || node.Type || 'Unknown'}
          </div>
          
          {node.RefId && (
            <div className="text-xs text-gray-500 mt-1">
              RefId: {node.RefId}
            </div>
          )}
          
          {node.Type && (
            <div className="text-xs text-purple-600 mt-1">
              {node.Type}
            </div>
          )}
          
          {rating !== null && rating !== undefined && !isNaN(rating) && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${rating * 100}%`,
                    backgroundColor: nodeColor
                  }}
                />
              </div>
              <span className="text-xs font-mono" style={{ color: nodeColor }}>
                {(rating * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-1">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand?.();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  decision: DecisionNode,
};

export function InteractiveTreeDiagram({ 
  tree, 
  onNodeClick,
  onShowCurve 
}: InteractiveTreeDiagramProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Convert tree to React Flow nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    const branchColorMap = new Map<string, string>();
    
    const processNode = (
      treeNode: any, // Enriched RuleNode with additional properties
      parentId: string | null, 
      depth: number,
      siblingIndex: number,
      totalSiblings: number,
      branchIndex: number = 0
    ): string => {
      const id = `node-${nodeId++}`;
      const isExpanded = expandedNodes.has(id) || depth === 0;
      
      // Assign branch color at depth 1
      let branchColor: string | undefined;
      if (depth === 1) {
        branchColor = BRANCH_COLORS[siblingIndex % BRANCH_COLORS.length];
        branchColorMap.set(id, branchColor);
      } else if (depth > 1 && parentId) {
        // Inherit color from parent's branch
        branchColor = branchColorMap.get(parentId);
        if (branchColor) branchColorMap.set(id, branchColor);
      }
      
      // Calculate position with better spacing
      const horizontalSpacing = 400; // Increased from 350
      const verticalSpacing = 180; // Increased from 150
      const x = siblingIndex * horizontalSpacing - (totalSiblings - 1) * (horizontalSpacing / 2);
      const y = depth * verticalSpacing;
      
      nodes.push({
        id,
        type: 'decision',
        position: { x, y },
        data: {
          node: treeNode,
          label: treeNode.levelName || treeNode.name || treeNode.Type || 'Unknown',
          onExpand: () => {
            setExpandedNodes(prev => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          },
          isExpanded,
          onShowCurve,
          rating: (treeNode as any).rating,
          branchColor,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });
      
      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: branchColor || '#94a3b8',
          },
          style: {
            strokeWidth: 2,
            stroke: branchColor || '#94a3b8',
          },
        });
      }
      
      // Process children if expanded
      if (isExpanded && treeNode.children && treeNode.children.length > 0) {
        treeNode.children.forEach((child: any, index: number) => {
          processNode(child, id, depth + 1, index, treeNode.children!.length, depth === 0 ? index : branchIndex);
        });
      }
      
      return id;
    };
    
    processNode(tree, null, 0, 0, 1);
    
    return { nodes, edges };
  }, [tree, expandedNodes, onShowCurve]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes when expansion changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);
  
  const onNodeClickHandler = useCallback((event: any, node: Node) => {
    onNodeClick?.(node.data.node);
  }, [onNodeClick]);
  
  return (
    <div className={`relative bg-gray-50 rounded-lg border border-gray-200 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 w-screen h-screen rounded-none' 
        : 'w-full h-[600px]'
    }`}>
      {/* Fullscreen toggle button */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 right-4 z-10 px-3 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-300 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-4 h-4" />
            Exit Fullscreen
          </>
        ) : (
          <>
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </>
        )}
      </button>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const rating = node.data?.rating;
            if (rating === null || rating === undefined || isNaN(rating)) {
              return '#9ca3af';
            }
            if (rating >= 0.8) return '#10b981';
            if (rating >= 0.6) return '#84cc16';
            if (rating >= 0.4) return '#fbbf24';
            if (rating >= 0.2) return '#f97316';
            return '#ef4444';
          }}
          maskColor="rgb(240, 240, 240, 0.6)"
        />
      </ReactFlow>
    </div>
  );
}
