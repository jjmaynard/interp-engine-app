'use client';

import { useMemo } from 'react';
import { RuleNode } from '@/types/interpretation';
import { ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';

// Note: nodes are enriched at runtime with additional properties
interface BranchAnalysisProps {
  selectedNode: any; // Enriched RuleNode
  rootNode: any; // Enriched RuleNode
  onClose: () => void;
}

interface PathNode {
  node: any; // Enriched RuleNode
  depth: number;
  rating: number | null;
  contribution: number;
}

export function BranchAnalysis({ selectedNode, rootNode, onClose }: BranchAnalysisProps) {
  
  // Find path from selected node to root
  const pathToRoot = useMemo(() => {
    const path: PathNode[] = [];
    
    const findPath = (node: any, target: any, currentPath: any[]): boolean => {
      if (node === target) {
        // Found the target, build path info
        currentPath.forEach((pathNode, index) => {
          path.push({
            node: pathNode,
            depth: index,
            rating: pathNode.rating ?? null,
            contribution: 0, // Will calculate below
          });
        });
        return true;
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (findPath(child, target, [...currentPath, child])) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    findPath(rootNode, selectedNode, [rootNode]);
    
    // Calculate contribution percentages
    if (path.length > 0) {
      const finalRating = path[path.length - 1].rating ?? 0;
      path.forEach((pathNode) => {
        if (finalRating !== 0) {
          pathNode.contribution = ((pathNode.rating ?? 0) / finalRating) * 100;
        }
      });
    }
    
    return path;
  }, [selectedNode, rootNode]);
  
  // Get subtree statistics
  const subtreeStats = useMemo(() => {
    let totalNodes = 0;
    let evaluationNodes = 0;
    let maxDepth = 0;
    
    const traverse = (node: any, depth: number) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);
      
      if (node.RefId || node.rule_refid) {
        evaluationNodes++;
      }
      
      if (node.children) {
        node.children.forEach((child: any) => traverse(child, depth + 1));
      }
    };
    
    traverse(selectedNode, 0);
    
    return { totalNodes, evaluationNodes, maxDepth };
  }, [selectedNode]);
  
  const getRatingColor = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return 'text-gray-400';
    }
    
    if (rating >= 0.8) return 'text-green-600';
    if (rating >= 0.6) return 'text-lime-600';
    if (rating >= 0.4) return 'text-amber-500';
    if (rating >= 0.2) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getRatingBgColor = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return 'bg-gray-100';
    }
    
    if (rating >= 0.8) return 'bg-green-100';
    if (rating >= 0.6) return 'bg-lime-100';
    if (rating >= 0.4) return 'bg-amber-100';
    if (rating >= 0.2) return 'bg-orange-100';
    return 'bg-red-100';
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000000 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Branch Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">
              Analyzing: <span className="font-semibold">{selectedNode.levelName || selectedNode.name || selectedNode.Type || 'Unknown Node'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Subtree Statistics */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Subtree Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{subtreeStats.totalNodes}</div>
                <div className="text-xs text-gray-600 mt-1">Total Nodes</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-indigo-600">{subtreeStats.evaluationNodes}</div>
                <div className="text-xs text-gray-600 mt-1">Evaluation Nodes</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{subtreeStats.maxDepth}</div>
                <div className="text-xs text-gray-600 mt-1">Max Depth</div>
              </div>
            </div>
          </div>
          
          {/* Path to Root */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Path to Root Rating
            </h3>
            <div className="space-y-2">
              {pathToRoot.map((pathNode, index) => (
                <div key={index} className="flex items-center gap-3">
                  {/* Depth indicator */}
                  <div className="flex items-center" style={{ marginLeft: `${pathNode.depth * 20}px` }}>
                    {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                  
                  {/* Node info */}
                  <div className={`flex-1 rounded-lg p-3 border-2 ${
                    pathNode.node === selectedNode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {pathNode.node.levelName || pathNode.node.name || pathNode.node.Type || 'Unknown'}
                        </div>
                        {pathNode.node.RefId && (
                          <div className="text-xs text-gray-500 mt-1">
                            RefId: {pathNode.node.RefId}
                            {pathNode.node.Type && ` • ${pathNode.node.Type}`}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 ml-4">
                        {pathNode.rating !== null && pathNode.rating !== undefined && !isNaN(pathNode.rating) && (
                          <>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getRatingBgColor(pathNode.rating)} ${getRatingColor(pathNode.rating)}`}>
                              {(pathNode.rating * 100).toFixed(1)}%
                            </div>
                            
                            {/* Rating bar */}
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-gradient-to-r from-red-500 via-amber-400 to-green-500"
                                style={{ width: `${pathNode.rating * 100}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Selected Node Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Node Details</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-700 min-w-[120px]">Name:</span>
                <span className="text-gray-900">{selectedNode.levelName || selectedNode.name || 'N/A'}</span>
              </div>
              
              {selectedNode.Type && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[120px]">Type:</span>
                  <span className="font-mono text-purple-600">{selectedNode.Type}</span>
                </div>
              )}
              
              {selectedNode.RefId && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[120px]">Reference ID:</span>
                  <span className="font-mono text-blue-600">{selectedNode.RefId}</span>
                </div>
              )}
              
              {selectedNode.Value && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[120px]">Value:</span>
                  <span className="font-mono text-xs text-gray-700 bg-white px-2 py-1 rounded">
                    {selectedNode.Value}
                  </span>
                </div>
              )}
              
              {(selectedNode as any).rating !== null && (selectedNode as any).rating !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[120px]">Rating:</span>
                  <span className={`font-semibold ${getRatingColor((selectedNode as any).rating)}`}>
                    {((selectedNode as any).rating * 100).toFixed(2)}%
                  </span>
                </div>
              )}
              
              {selectedNode.children && (
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[120px]">Children:</span>
                  <span className="text-gray-900">{selectedNode.children.length} child nodes</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
