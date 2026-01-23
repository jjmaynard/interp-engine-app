'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { RuleNode } from '@/types/interpretation';

interface RuleTreeVisualizationProps {
  tree: RuleNode[];
  interpretationName: string;
  evaluationResults?: Record<string, number>;
}

// Custom node component
function CustomNode({ data }: { data: any }) {
  const getBgColor = () => {
    if (data.rating !== undefined) {
      if (data.rating >= 0.9) return 'bg-green-100 border-green-500';
      if (data.rating >= 0.7) return 'bg-yellow-100 border-yellow-500';
      if (data.rating >= 0.4) return 'bg-orange-100 border-orange-500';
      return 'bg-red-100 border-red-500';
    }
    
    if (data.type === 'evaluation') return 'bg-blue-100 border-blue-500';
    if (data.type === 'operator') return 'bg-purple-100 border-purple-500';
    if (data.type === 'hedge') return 'bg-indigo-100 border-indigo-500';
    return 'bg-gray-100 border-gray-400';
  };

  const getIcon = () => {
    if (data.type === 'evaluation') return '📊';
    if (data.type === 'operator') {
      if (data.operator === 'and') return '∧';
      if (data.operator === 'or') return '∨';
      if (data.operator === 'product') return '×';
      if (data.operator === 'sum') return '∑';
      return '○';
    }
    if (data.type === 'hedge') return '⚡';
    return '●';
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 shadow-md ${getBgColor()} min-w-[200px]`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{getIcon()}</span>
        <span className="font-semibold text-sm text-gray-900">
          {data.label}
        </span>
      </div>
      
      {data.type && (
        <div className="text-xs text-gray-600 capitalize mb-1">
          {data.type}
        </div>
      )}
      
      {data.operator && (
        <div className="text-xs text-purple-700 font-medium">
          Operator: {data.operator}
        </div>
      )}
      
      {data.hedge && (
        <div className="text-xs text-indigo-700 font-medium">
          Hedge: {data.hedge} ({data.value})
        </div>
      )}
      
      {data.rating !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="text-xs text-gray-600 mb-1">Rating</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  data.rating >= 0.9 ? 'bg-green-500' :
                  data.rating >= 0.7 ? 'bg-yellow-500' :
                  data.rating >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${data.rating * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-900">
              {(data.rating * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export function RuleTreeVisualization({
  tree,
  interpretationName,
  evaluationResults = {},
}: RuleTreeVisualizationProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert flat tree to hierarchical nodes and edges
  useEffect(() => {
    if (!tree || tree.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let nodeId = 0;

    // Track indentation levels
    const levelStack: { id: string; level: number }[] = [];
    
    tree.forEach((node, index) => {
      const currentId = `node-${nodeId++}`;
      const level = (node.levelName.match(/^\s*/)?.[0].length || 0) / 2;
      const label = node.levelName.trim();

      // Determine node type
      let nodeType = 'custom';
      let nodeData: any = {
        label,
        type: 'rule',
      };

      // Check if it's an operator
      if (node.Type) {
        nodeData.type = 'operator';
        nodeData.operator = node.Type;
      }

      // Check if it's a hedge
      if (node.Value) {
        nodeData.type = 'hedge';
        nodeData.hedge = label;
        nodeData.value = node.Value;
      }

      // Check if it's an evaluation reference
      if (node.RefId || node.rule_refid) {
        nodeData.type = 'evaluation';
        const refId = node.RefId || node.rule_refid;
        if (evaluationResults[refId!]) {
          nodeData.rating = evaluationResults[refId!];
        }
      }

      // Create node
      newNodes.push({
        id: currentId,
        type: nodeType,
        data: nodeData,
        position: { x: level * 250, y: index * 120 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      // Connect to parent based on indentation
      while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= level) {
        levelStack.pop();
      }

      if (levelStack.length > 0) {
        const parentId = levelStack[levelStack.length - 1].id;
        newEdges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep',
          animated: nodeData.rating !== undefined,
          style: {
            stroke: nodeData.rating !== undefined
              ? nodeData.rating >= 0.7 ? '#22c55e' : '#ef4444'
              : '#94a3b8',
            strokeWidth: 2,
          },
        });
      }

      levelStack.push({ id: currentId, level });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [tree, evaluationResults, setNodes, setEdges]);

  if (!tree || tree.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        <p>No rule tree available for this interpretation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Rule Tree Visualization</h3>
            <p className="text-sm text-purple-100 mt-1">
              {interpretationName}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md transition-colors text-sm font-medium"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Visualization */}
      {isExpanded && (
        <div style={{ height: '600px' }} className="border-t border-gray-200">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const rating = node.data.rating;
                if (rating !== undefined) {
                  if (rating >= 0.9) return '#22c55e';
                  if (rating >= 0.7) return '#eab308';
                  if (rating >= 0.4) return '#f97316';
                  return '#ef4444';
                }
                return '#94a3b8';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </div>
      )}

      {/* Legend */}
      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-500"></div>
              <span className="text-gray-700">Evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 border-2 border-purple-500"></div>
              <span className="text-gray-700">Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-100 border-2 border-indigo-500"></div>
              <span className="text-gray-700">Hedge</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-500"></div>
              <span className="text-gray-700">High Rating (≥90%)</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-600">
            💡 <strong>Tip:</strong> Use mouse wheel to zoom, drag to pan, or use the controls in the bottom-left corner.
          </p>
        </div>
      )}
    </div>
  );
}
