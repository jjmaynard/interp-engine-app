'use client';

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  NodeTypes,
  ConnectionMode,
  ReactFlowProvider,
  Panel,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Maximize2, Minimize2, Eye, TrendingUp } from 'lucide-react';

interface InteractiveSankeyDiagramProps {
  tree: any;
  onNodeClick?: (node: any, evaluationData?: any) => void;
  onShowCurve?: (evaluation: any) => void;
  propertyValues?: Record<string, number | string | null>;
}

// Custom node component with Sankey-style appearance
function SankeyNode({ data }: any) {
  const { node, onShowCurve, rating, branchColor } = data;
  
  const getRatingColor = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return '#9ca3af';
    }
    if (rating >= 0.8) return '#10b981';
    if (rating >= 0.6) return '#84cc16';
    if (rating >= 0.4) return '#fbbf24';
    if (rating >= 0.2) return '#f97316';
    return '#ef4444';
  };
  
  const nodeColor = branchColor || getRatingColor(rating);
  const isFuzzyEvaluation = node.Evaluation && node.Evaluation.Points && node.Evaluation.Points.length > 0;
  const isOperator = node.Type && !node.RefId && !node.rule_refid;
  
  // Operator nodes are smaller badges
  if (isOperator) {
    return (
      <>
        <Handle type="target" position={Position.Left} />
        <div 
          className="px-4 py-2 rounded-md bg-amber-100 border-2 border-amber-500 shadow-md"
          style={{ minWidth: '80px' }}
        >
          <div className="text-sm font-bold text-amber-900 text-center">
            {node.Type}
          </div>
        </div>
        <Handle type="source" position={Position.Right} />
      </>
    );
  }
  
  // Evaluation nodes are full Sankey-style boxes
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div 
        className="rounded-lg shadow-xl min-w-[200px] max-w-[280px] overflow-hidden"
        style={{ 
          borderLeft: `6px solid ${nodeColor}`,
        }}
      >
        {/* Header */}
        <div 
          className="px-4 py-2 text-white font-bold text-sm"
          style={{ backgroundColor: nodeColor }}
        >
          {node.levelName || node.name || 'Unknown'}
        </div>
      
      {/* Content */}
      <div className="bg-white px-4 py-3">
        {node.RefId && (
          <div className="text-xs text-gray-600 mb-2">
            RefId: {node.RefId}
          </div>
        )}
        
        {/* Rating display */}
        {rating !== null && rating !== undefined && !isNaN(rating) && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">Rating</span>
              <span className="text-lg font-bold" style={{ color: nodeColor }}>
                {(rating * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${rating * 100}%`,
                  backgroundColor: nodeColor
                }}
              />
            </div>
          </div>
        )}
        
        {/* Actions */}
        {isFuzzyEvaluation && onShowCurve && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Ensure we pass the full evaluation object with all metadata
              const fullEvaluation = {
                ...node.Evaluation,
                // If Evaluation doesn't have these, try to get from node itself
                propiid: node.Evaluation.propiid || node.propiid,
                evaliid: node.Evaluation.evaliid || node.evaliid || node.RefId || node.rule_refid,
                evaldesc: node.Evaluation.evaldesc || node.evaldesc
              };
              onShowCurve(fullEvaluation);
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            View Curve
          </button>
        )}
      </div>
    </div>
    <Handle type="source" position={Position.Right} />
    </>
  );
}

const nodeTypes: NodeTypes = {
  sankeyNode: SankeyNode,
};

function InteractiveSankeyFlow({ tree, onNodeClick, onShowCurve, propertyValues = {} }: InteractiveSankeyDiagramProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Convert tree to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeIdCounter = 0;
    const levelCounts = new Map<number, number>();
    let maxLevel = 0;
    
    const LEVEL_SPACING_X = 350;
    const NODE_SPACING_Y = 120;
    
    // First pass: find max level
    function findMaxLevel(treeNode: any, level: number): void {
      maxLevel = Math.max(maxLevel, level);
      if (treeNode.children && treeNode.children.length > 0) {
        treeNode.children.forEach((child: any) => findMaxLevel(child, level + 1));
      }
    }
    
    findMaxLevel(tree, 0);
    
    function processNode(
      treeNode: any, 
      level: number, 
      parentId: string | null,
      branchIndex: number = 0
    ): string {
      const nodeId = `node-${nodeIdCounter++}`;
      const rating = treeNode.rating || 0;
      
      // Track how many nodes at this level
      const countAtLevel = levelCounts.get(level) || 0;
      levelCounts.set(level, countAtLevel + 1);
      
      const isOperator = treeNode.Type && !treeNode.RefId && !treeNode.rule_refid;
      
      // Position calculation - reversed: children on left, parent on right
      const x = (maxLevel - level) * LEVEL_SPACING_X;
      const y = countAtLevel * NODE_SPACING_Y + 50;
      
      // Get branch color
      const BRANCH_COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
      ];
      const branchColor = BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
      
      // Create node
      nodes.push({
        id: nodeId,
        type: 'sankeyNode',
        position: { x, y },
        data: {
          node: treeNode,
          onShowCurve,
          rating,
          branchColor: isOperator ? undefined : branchColor,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      
      // Process children
      if (treeNode.children && treeNode.children.length > 0) {
        treeNode.children.forEach((child: any, childIndex: number) => {
          const childId = processNode(
            child, 
            level + 1, 
            nodeId,
            treeNode.children.length > 1 ? childIndex : branchIndex
          );
          
          // Create edge with Sankey-style appearance - reversed direction
          const edgeRating = child.rating || 0;
          const edgeColor = isOperator ? '#f59e0b' : branchColor;
          
          edges.push({
            id: `edge-${nodeId}-${childId}`,
            source: childId,
            target: nodeId,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: edgeColor,
              strokeWidth: Math.max(2, edgeRating * 8),
              opacity: 0.6,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
              width: 20,
              height: 20,
            },
            label: isOperator ? treeNode.Type : undefined,
            labelStyle: { 
              fill: '#92400e', 
              fontWeight: 700,
              fontSize: 11,
              backgroundColor: '#fef3c7',
              padding: '4px 8px',
              borderRadius: '4px',
            },
            labelBgStyle: {
              fill: '#fef3c7',
              fillOpacity: 0.9,
            },
          });
        });
      }
      
      return nodeId;
    }
    
    processNode(tree, 0, null, 0);
    
    console.log('[Interactive Sankey] Nodes created:', nodes.length);
    console.log('[Interactive Sankey] Edges created:', edges.length);
    console.log('[Interactive Sankey] Sample edge:', edges[0]);
    
    return { initialNodes: nodes, initialEdges: edges };
  }, [tree, onShowCurve]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onNodeClickHandler = useCallback(async (event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      const treeNode = node.data.node;
      const refId = treeNode.RefId || treeNode.rule_refid;
      
      if (refId) {
        // For evaluation nodes, fetch evaluation data
        try {
          const response = await fetch(`/api/evaluations/${refId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          if (data.success && data.data) {
            const propname = data.data.propname;
            
            // Try exact match first, then case-insensitive match
            let propertyValue = propertyValues[propname];
            if (propertyValue === undefined || propertyValue === null) {
              // Try finding by case-insensitive match
              const propKey = Object.keys(propertyValues).find(
                key => key.toLowerCase() === propname.toLowerCase()
              );
              if (propKey) {
                propertyValue = propertyValues[propKey];
              }
            }
            
            console.log('[InteractiveSankey] Property lookup:', {
              propname,
              propertyValue,
              allPropertyKeys: Object.keys(propertyValues),
              nodeRating: node.data.rating
            });
            
            // Only show fuzzy curve if we have a valid input value
            // Don't default to 0 - that creates misleading visualizations
            const hasValidInput = propertyValue !== undefined && propertyValue !== null && propertyValue !== '';
            const inputValue = hasValidInput ? Number(propertyValue) : NaN;
            const outputValue = node.data.rating || 0;
            
            const evaluationData = {
              ...data.data,
              inputValue,
              outputValue,
              propertyValue,
              hasValidInput,
            };
            
            onNodeClick(treeNode, evaluationData);
          } else {
            onNodeClick(treeNode);
          }
        } catch (error) {
          console.error('Failed to load evaluation data:', error);
          onNodeClick(treeNode);
        }
      } else {
        onNodeClick(treeNode);
      }
    }
  }, [onNodeClick, propertyValues]);
  
  const renderContent = () => (
    <div className={`${
      isFullscreen 
        ? 'fixed inset-0 w-screen h-screen bg-white z-[999999]' 
        : 'relative w-full h-[600px] bg-white rounded-lg border border-gray-200'
    }`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        
        <Panel position="top-right" className="bg-white/90 backdrop-blur rounded-lg shadow-lg p-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
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
        </Panel>
        
        <Panel position="bottom-center" className="bg-white/90 backdrop-blur rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>Evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span>Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1 bg-gradient-to-r from-green-500 to-red-500"></div>
              <span>Rating (High → Low)</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
  
  if (isFullscreen && typeof window !== 'undefined') {
    return createPortal(renderContent(), document.body);
  }
  
  return renderContent();
}

// Wrapper with ReactFlowProvider
export function InteractiveSankeyDiagram(props: InteractiveSankeyDiagramProps) {
  return (
    <ReactFlowProvider>
      <InteractiveSankeyFlow {...props} />
    </ReactFlowProvider>
  );
}
