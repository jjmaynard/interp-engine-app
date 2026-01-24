'use client';

import { useEffect, useState, memo } from 'react';
import { BarChart3, GitMerge, Zap, Box, ChevronRight, ChevronDown } from 'lucide-react';
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
const TreeNodeComponent = memo(({ node, depth = 0 }: { node: TreeNodeData; depth?: number }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const getIcon = () => {
    if (node.type === 'evaluation') return <BarChart3 className="w-4 h-4" />;
    if (node.type === 'operator') return <GitMerge className="w-4 h-4" />;
    if (node.type === 'hedge') return <Zap className="w-4 h-4" />;
    return <Box className="w-4 h-4" />;
  };

  const getTypeColor = () => {
    if (node.rating !== undefined) {
      if (node.rating >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
      if (node.rating >= 0.7) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      if (node.rating >= 0.4) return 'text-orange-600 bg-orange-50 border-orange-200';
      return 'text-red-600 bg-red-50 border-red-200';
    }
    
    if (node.type === 'evaluation') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (node.type === 'operator') return 'text-purple-600 bg-purple-50 border-purple-200';
    if (node.type === 'hedge') return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      {/* Single-line compact node */}
      <div 
        className={`flex items-center gap-2 py-1.5 px-3 rounded-md border transition-all hover:shadow-sm ${getTypeColor()}`}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        {/* Collapse toggle */}
        {hasChildren && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-white/50 rounded p-0.5 transition-colors"
          >
            {isCollapsed ? 
              <ChevronRight className="w-3 h-3" /> : 
              <ChevronDown className="w-3 h-3" />
            }
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Label */}
        <span className="text-sm font-medium flex-1 truncate" title={node.label}>
          {node.label || 'Unnamed'}
        </span>

        {/* Type badge */}
        <span className="text-xs px-1.5 py-0.5 rounded bg-white/60 font-medium">
          {node.type}
        </span>

        {/* Operator/Hedge info */}
        {node.operator && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 font-mono">
            {node.operator}
          </span>
        )}
        {node.hedge && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800 font-mono">
            {node.hedge}
          </span>
        )}

        {/* Rating */}
        {node.rating !== undefined && (
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/80">
            {(node.rating * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
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

    console.log('[TreeViz] Building tree from', tree.length, 'nodes');
    console.log('[TreeViz] First node has children?', !!tree[0]?.children, 'length:', tree[0]?.children?.length);

    // Check if tree already has children arrays built
    if (tree[0]?.children) {
      // Tree is already hierarchical, use directly
      const convertNode = (node: RuleNode | any, depth: number = 0): TreeNodeData => {
        const label = (node.name || node.levelName || '').trim();
        
        const nodeData: TreeNodeData = {
          id: `node-${Math.random()}`,
          label: label.replace(/^[\s¦°\-│├└]+/, ''), // Remove box-drawing prefix
          type: 'rule',
          level: depth,
          children: [],
        };

        // Determine node type based on hierarchical format
        if (node.RefId || node.rule_refid) {
          nodeData.type = 'evaluation';
          const refId = node.RefId || node.rule_refid;
          if (refId && evaluationResults[refId]) {
            nodeData.rating = evaluationResults[refId];
          }
        } else if (node.Type) {
          // Check if it's an operator or hedge
          const operatorTypes = ['and', 'or', 'product', 'sum', 'times', 'add', 'multiply', 'divide', 
                                 'subtract', 'minus', 'plus', 'average', 'limit', 'power', 'weight',
                                 'not_null_and', 'alpha'];
          const hedgeTypes = ['not', 'very', 'slightly', 'somewhat', 'extremely', 
                             'null_or', 'null_not_rated'];
          
          if (operatorTypes.includes(node.Type.toLowerCase())) {
            nodeData.type = 'operator';
            nodeData.operator = node.Type;
          } else if (hedgeTypes.includes(node.Type.toLowerCase())) {
            nodeData.type = 'hedge';
            nodeData.hedge = node.Type;
            if (node.Value) {
              nodeData.value = node.Value;
            }
          }
        }

        // Recursively convert children
        if (node.children && node.children.length > 0) {
          nodeData.children = node.children.map((child: any) => convertNode(child, depth + 1));
        }

        return nodeData;
      };

      const rootNode = convertNode(tree[0], 0);
      console.log('[TreeViz] Using pre-built tree, depth from children arrays');
      setTreeData([rootNode]);
      return;
    }

    // Otherwise, tree is flat - parse from indentation
    const nodes: TreeNodeData[] = [];
    const stack: { node: TreeNodeData; level: number }[] = [];
    let nodeId = 0;
    let maxDepth = 0;

    tree.forEach((item, idx) => {
      // Parse indentation from R data.tree format
      // Format: "    ¦   °--Label" where each level adds ~4 chars
      // Count both spaces AND box-drawing characters before the label
      const fullText = item.levelName;
      const labelMatch = fullText.match(/^[\s¦°\-│├└]+(.+)$/);
      const label = labelMatch ? labelMatch[1].trim() : fullText.trim();
      
      // Calculate depth by counting the visual indentation units
      // Each level typically adds: "    " (4 spaces) or "¦   " or "°--"
      const prefixLength = fullText.length - label.length - (fullText.match(label)?.[0]?.length || 0);
      const level = Math.floor(prefixLength / 4);

      if (idx < 10) {
        console.log(`[TreeViz] Node ${idx}: level=${level}, prefix="${fullText.substring(0, 20)}", label="${label.substring(0, 40)}"`);
      }

      if (idx < 10) {
        console.log(`[TreeViz] Node ${idx}: level=${level}, prefix="${fullText.substring(0, 20)}", label="${label.substring(0, 40)}"`);
      }
      
      maxDepth = Math.max(maxDepth, level);

      const nodeData: TreeNodeData = {
        id: `node-${nodeId++}`,
        label,
        type: 'rule',
        level,
        children: [],
      };

      // Determine node type
      if (item.RefId || item.rule_refid) {
        nodeData.type = 'evaluation';
        const refId = item.RefId || item.rule_refid;
        if (refId && evaluationResults[refId]) {
          nodeData.rating = evaluationResults[refId];
        }
      } else if (item.Type) {
        const operatorTypes = ['and', 'or', 'product', 'sum', 'times', 'add', 'multiply', 'divide', 
                               'subtract', 'minus', 'plus', 'average', 'limit', 'power', 'weight',
                               'alpha'];
        const hedgeTypes = ['not', 'very', 'slightly', 'somewhat', 'extremely', 
                           'null_or', 'null_not_rated', 'not_null_and'];
        
        if (operatorTypes.includes(item.Type.toLowerCase())) {
          nodeData.type = 'operator';
          nodeData.operator = item.Type;
        } else if (hedgeTypes.includes(item.Type.toLowerCase())) {
          nodeData.type = 'hedge';
          nodeData.hedge = item.Type;
          if (item.Value) {
            nodeData.value = item.Value;
          }
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

    console.log('[TreeViz] Built tree with', nodes.length, 'root nodes, max depth:', maxDepth);
    console.log('[TreeViz] First root node has', nodes[0]?.children.length, 'children');

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
        <div className="p-4 max-h-[600px] overflow-auto bg-gray-50">
          <div className="space-y-1">
            {treeData.map((node) => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                depth={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {isExpanded && (
        <div className="px-6 py-4 bg-gray-100 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-purple-600" />
              <span className="text-gray-700">Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span className="text-gray-700">Hedge</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-500"></div>
              <span className="text-gray-700">High Rating (≥90%)</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-600 flex items-center gap-1">
            <Box className="w-3 h-3" />
            <strong>Tip:</strong> The tree shows the hierarchical structure of the interpretation rules with color-coded ratings.
          </p>
        </div>
      )}
    </div>
  );
}
