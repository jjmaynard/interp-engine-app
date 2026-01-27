'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, Maximize2, Minimize2, ZoomIn, ZoomOut, Expand, Minimize } from 'lucide-react';

interface HorizontalTreeProps {
  tree: any;
}

export function HorizontalTreeDiagram({ tree }: HorizontalTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['node-0']));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Collect all node IDs for expand/collapse all
  const getAllNodeIds = (node: any, prefix = 'node', result: string[] = []): string[] => {
    result.push(prefix);
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any, index: number) => {
        getAllNodeIds(child, `${prefix}-${index}`, result);
      });
    }
    return result;
  };
  
  const allNodeIds = useMemo(() => getAllNodeIds(tree, 'node-0'), [tree]);
  
  const expandAll = () => {
    setExpandedNodes(new Set(allNodeIds));
  };
  
  const collapseAll = () => {
    setExpandedNodes(new Set(['node-0']));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getRatingColor = (rating: number | null | undefined): string => {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return '#9ca3af';
    }
    if (rating >= 0.8) return '#10b981'; // green
    if (rating >= 0.6) return '#84cc16'; // lime
    if (rating >= 0.4) return '#fbbf24'; // amber
    if (rating >= 0.2) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const TreeNode = ({ node, depth = 0, nodeId = 'node-0' }: { node: any; depth?: number; nodeId?: string }) => {
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;
    const rating = node.rating;
    const isOperator = node.Type && !node.RefId && !node.rule_refid;

    if (isOperator && hasChildren) {
      // Skip rendering operator nodes, just render their children
      return (
        <>
          {node.children.map((child: any, index: number) => (
            <TreeNode
              key={`${nodeId}-${index}`}
              node={child}
              depth={depth}
              nodeId={`${nodeId}-${index}`}
            />
          ))}
        </>
      );
    }

    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 py-1">
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={() => toggleNode(nodeId)}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Connector line */}
          <div 
            className="w-8 h-0.5 flex-shrink-0"
            style={{ 
              backgroundColor: depth === 0 ? '#94a3b8' : getRatingColor(rating),
              marginLeft: `${depth * 24}px`
            }}
          />

          {/* Node content */}
          <div
            className="flex-1 px-4 py-2 rounded-lg border-2 bg-white shadow-sm min-w-[250px] max-w-[400px]"
            style={{
              borderColor: getRatingColor(rating),
              borderLeftWidth: '4px',
              borderLeftColor: getRatingColor(rating)
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {node.levelName || node.name || node.Type || 'Unknown'}
                </div>
                {node.RefId && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    RefId: {node.RefId}
                  </div>
                )}
              </div>

              {rating !== null && rating !== undefined && !isNaN(rating) && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${rating * 100}%`,
                        backgroundColor: getRatingColor(rating)
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-12 text-right" style={{ color: getRatingColor(rating) }}>
                    {(rating * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-6">
            {node.children.map((child: any, index: number) => (
              <TreeNode
                key={`${nodeId}-${index}`}
                node={child}
                depth={depth + 1}
                nodeId={`${nodeId}-${index}`}
              />
            ))}
          </div>
        )}
      </div>
    );
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
            <h3 className="text-lg font-bold text-gray-900">Horizontal Tree View</h3>
            <p className="text-sm text-gray-600">Left-to-right collapsible tree structure</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse all buttons */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={expandAll}
                className="px-3 py-2 hover:bg-white rounded transition-colors flex items-center gap-1.5 text-sm font-medium"
                title="Expand all nodes"
              >
                <Expand className="w-4 h-4" />
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 hover:bg-white rounded transition-colors flex items-center gap-1.5 text-sm font-medium"
                title="Collapse all nodes"
              >
                <Minimize className="w-4 h-4" />
                Collapse All
              </button>
            </div>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-medium min-w-[60px] text-center">
                {(zoom * 100).toFixed(0)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen toggle */}
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

      {/* Scrollable tree area */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease'
          }}
        >
          {tree && <TreeNode node={tree} />}
        </div>
      </div>

      {/* Legend */}
      <div className={`${isFullscreen ? 'bg-white border-t border-gray-200' : ''} p-4 flex-shrink-0`}>
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-gradient-to-r from-green-500 to-red-500"></div>
            <span>Rating (High → Low)</span>
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
