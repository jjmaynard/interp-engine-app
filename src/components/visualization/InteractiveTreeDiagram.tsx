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
import { ChevronDown, ChevronRight, Eye, TrendingUp } from 'lucide-react';

// Note: tree nodes are enriched at runtime with additional properties
interface InteractiveTreeDiagramProps {
  tree: any; // RuleNode enriched with label, Evaluation, rating
  onNodeClick?: (node: any) => void;
  onShowCurve?: (evaluation: any) => void;
}

// Custom node component with rating visualization
function DecisionNode({ data }: any) {
  const { node, onExpand, isExpanded, onShowCurve, rating } = data;
  
  const getRatingColor = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return '#9ca3af'; // gray-400
    }
    
    // Determine if this is a productivity or limitation type
    const isProductivity = node.label?.toLowerCase().includes('productivity') ||
                          node.label?.toLowerCase().includes('nccpi') ||
                          node.label?.toLowerCase().includes('sqi') ||
                          node.label?.toLowerCase().includes('yield');
    
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
  const isFuzzyEvaluation = node.Evaluation?.Points && node.Evaluation.Points.length > 0;
  
  return (
    <div 
      className="px-4 py-2 rounded-lg border-2 bg-white shadow-md min-w-[200px] max-w-[300px]"
      style={{ borderColor: nodeColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {node.label || node.Evaluation?.Property || 'Unknown'}
          </div>
          
          {node.Evaluation?.Property && (
            <div className="text-xs text-gray-500 mt-1">
              {node.Evaluation.Property}
              {node.Evaluation.Operator && ` (${node.Evaluation.Operator})`}
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
          
          {isFuzzyEvaluation && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowCurve?.(node.Evaluation);
              }}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title="Show fuzzy curve"
            >
              <TrendingUp className="w-4 h-4 text-blue-600" />
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
  
  // Convert tree to React Flow nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;
    
    const processNode = (
      treeNode: any, // Enriched RuleNode with additional properties
      parentId: string | null, 
      depth: number,
      siblingIndex: number,
      totalSiblings: number
    ): string => {
      const id = `node-${nodeId++}`;
      const isExpanded = expandedNodes.has(id) || depth === 0;
      
      // Calculate position
      const x = siblingIndex * 350 - (totalSiblings - 1) * 175;
      const y = depth * 150;
      
      nodes.push({
        id,
        type: 'decision',
        position: { x, y },
        data: {
          node: treeNode,
          label: treeNode.label || treeNode.Evaluation?.Property || 'Unknown',
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
          rating: treeNode.rating,
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
          },
          style: {
            strokeWidth: 2,
            stroke: '#94a3b8',
          },
        });
      }
      
      // Process children if expanded
      if (isExpanded && treeNode.children && treeNode.children.length > 0) {
        treeNode.children.forEach((child: any, index: number) => {
          processNode(child, id, depth + 1, index, treeNode.children!.length);
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
    <div className="w-full h-[600px] bg-gray-50 rounded-lg border border-gray-200">
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
