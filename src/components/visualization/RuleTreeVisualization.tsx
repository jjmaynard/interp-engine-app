'use client';

import { useEffect, useState, memo } from 'react';
import type { RuleNode } from '@/types/interpretation';

interface RuleTreeVisualizationProps {
  tree: RuleNode[];
  interpretationName: string;
  evaluationResults?: Record<string, number>;
}

interface TreeNodeData {
  id: string;
  label: string;
  type: 'evaluation' | 'operator' | 'hedge' | 'rule';
  operator?: string;
  hedge?: string;
  value?: string;
  rating?: number;
  level: number;
  children: TreeNodeData[];
}

// Custom node component
const TreeNodeComponent = memo(({ node, isLast }: { node: TreeNodeData; isLast: boolean }) => {
  const getBgColor = () => {
    if (node.rating !== undefined) {
      if (node.rating >= 0.9) return 'bg-green-100 border-green-500';
      if (node.rating >= 0.7) return 'bg-yellow-100 border-yellow-500';
      if (node.rating >= 0.4) return 'bg-orange-100 border-orange-500';
      return 'bg-red-100 border-red-500';
    }
    
    if (node.type === 'evaluation') return 'bg-blue-100 border-blue-500';
    if (node.type === 'operator') return 'bg-purple-100 border-purple-500';
    if (node.type === 'hedge') return 'bg-indigo-100 border-indigo-500';
    return 'bg-gray-100 border-gray-400';
  };

  const getIcon = () => {
    if (node.type === 'evaluation') return '📊';
    if (node.type === 'operator') {
      if (node.operator === 'and') return '∧';
      if (node.operator === 'or') return '∨';
      if (node.operator === 'product') return '×';
      if (node.operator === 'sum') return '∑';
      return '○';
    }
    if (node.type === 'hedge') return '⚡';
    return '●';
  };

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center mr-4">
        {!isLast && node.children.length > 0 && (
          <div className="w-px h-full bg-gray-300 mt-8"></div>
        )}
      </div>
      <div className="flex-1 mb-4">
        <div className={`px-4 py-3 rounded-lg border-2 shadow-md ${getBgColor()} inline-block`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getIcon()}</span>
            <span className="font-semibold text-sm text-gray-900">
              {node.label}
            </span>
          </div>
          
          {node.type && (
            <div className="text-xs text-gray-600 capitalize mb-1">
              {node.type}
            </div>
          )}
          
          {node.operator && (
            <div className="text-xs text-purple-700 font-medium">
              Operator: {node.operator}
            </div>
          )}
          
          {node.hedge && (
            <div className="text-xs text-indigo-700 font-medium">
              Hedge: {node.hedge} ({node.value})
            </div>
          )}
          
          {node.rating !== undefined && (
            <div className="mt-2 pt-2 border-t border-gray-300">
              <div className="text-xs text-gray-600 mb-1">Rating</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[80px]">
                  <div
                    className={`h-2 rounded-full ${
                      node.rating >= 0.9 ? 'bg-green-500' :
                      node.rating >= 0.7 ? 'bg-yellow-500' :
                      node.rating >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${node.rating * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">
                  {(node.rating * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
        
        {node.children.length > 0 && (
          <div className="ml-8 mt-2 border-l-2 border-gray-300 pl-4">
            {node.children.map((child, idx) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                isLast={idx === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

TreeNodeComponent.displayName = 'TreeNodeComponent';

export function RuleTreeVisualization({
  tree,
  interpretationName,
  evaluationResults = {},
}: RuleTreeVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);

  // Convert flat tree to hierarchical structure
  useEffect(() => {
    if (!tree || tree.length === 0) return;

    const nodes: TreeNodeData[] = [];
    const stack: { node: TreeNodeData; level: number }[] = [];
    let nodeId = 0;

    tree.forEach((item) => {
      const level = (item.levelName.match(/^\s*/)?.[0].length || 0) / 2;
      const label = item.levelName.trim();

      const nodeData: TreeNodeData = {
        id: `node-${nodeId++}`,
        label,
        type: 'rule',
        level,
        children: [],
      };

      // Determine node type
      if (item.Type) {
        nodeData.type = 'operator';
        nodeData.operator = item.Type;
      }

      if (item.Value) {
        nodeData.type = 'hedge';
        nodeData.hedge = label;
        nodeData.value = item.Value;
      }

      if (item.RefId || item.rule_refid) {
        nodeData.type = 'evaluation';
        const refId = item.RefId || item.rule_refid;
        if (refId && evaluationResults[refId]) {
          nodeData.rating = evaluationResults[refId];
        }
      }

      // Find parent based on indentation
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length > 0) {
        // Add as child to parent
        stack[stack.length - 1].node.children.push(nodeData);
      } else {
        // Add as root node
        nodes.push(nodeData);
      }

      stack.push({ node: nodeData, level });
    });

    setTreeData(nodes);
  }, [tree, evaluationResults]);

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
        <div className="p-6 max-h-[600px] overflow-auto bg-gray-50">
          {treeData.map((node, idx) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              isLast={idx === treeData.length - 1}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {isExpanded && (
        <div className="px-6 py-4 bg-gray-100 border-t border-gray-200">
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
            💡 <strong>Tip:</strong> The tree shows the hierarchical structure of the interpretation rules with color-coded ratings.
          </p>
        </div>
      )}
    </div>
  );
}
