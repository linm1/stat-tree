import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Tldraw, Editor, createShapeId } from 'tldraw';
import { TreeData, ExpansionState } from '../types';
import {
  calculateNodePositions,
  DEFAULT_LAYOUT,
  LayoutNode
} from '../utils/treeLayout';
import { truncateText } from '../utils/textHelpers';
import { addIconToText } from '../utils/nodeIcons';
import {
  toggleNodeExpansion,
  isNodeVisible,
  hasChildren,
  getAllDescendants
} from '../utils/expansionState';
import { calculatePathToNode, getHighlightedEdges } from '../utils/pathHighlighting';
import { isEdgeOnHighlightedPath, shouldDeleteEdgeOnCollapse } from '../utils/edgeIdParser';
import { calculateBoundsWithChildren } from '../utils/animations';

const MAX_MAP_DEPTH = 6;

export interface TldrawMapViewProps {
  data: TreeData;
  onNodeClick: (id: string) => void;
  selectedNodeId?: string;
  onSelectionChange?: (nodeId: string) => void;
  expansionState: ExpansionState;
  setExpansionState: React.Dispatch<React.SetStateAction<ExpansionState>>;
  highlightedPath: Set<string>;
  setHighlightedPath: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const TldrawMapView: React.FC<TldrawMapViewProps> = ({
  data,
  onNodeClick,
  selectedNodeId,
  onSelectionChange,
  expansionState,
  setExpansionState,
  highlightedPath,
  setHighlightedPath
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const layoutRef = useRef<LayoutNode | null>(null);
  const handlerRegisteredRef = useRef<boolean>(false);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const isAnimatingRef = useRef(false);
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());
  const highlightedPathRef = useRef<Set<string>>(highlightedPath);
  const highlightedEdgesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    highlightedPathRef.current = highlightedPath;
  }, [highlightedPath]);

  useEffect(() => {
    if (selectedNodeId) {
      const fullPath = calculatePathToNode(selectedNodeId, data);
      const newPath = new Set(fullPath);
      const newEdges = getHighlightedEdges(fullPath);
      setHighlightedPath(newPath);
      setHighlightedEdges(newEdges);
    }
  }, [selectedNodeId, data, setHighlightedPath]);

  useEffect(() => {
    if (editorRef.current && isMounted) {
      reapplyHighlighting();
    }
  }, [highlightedPath, highlightedEdges, isMounted]);

  const reapplyHighlighting = () => {
    if (!editorRef.current || !editorRef.current.getCurrentPageShapes) return;

    const editor = editorRef.current;
    const allShapes = editor.getCurrentPageShapes();
    const updates: any[] = [];
    const highlightedEdgeIds: string[] = [];

    allShapes.forEach((shape: any) => {
      if (shape.type === 'geo' && shape.meta?.nodeId) {
        const nodeId = shape.meta.nodeId;
        const isHighlighted = highlightedPathRef.current.has(nodeId);

        updates.push({
          id: shape.id,
          type: 'geo',
          props: {
            fill: isHighlighted ? 'solid' : 'none',
            color: isHighlighted ? 'orange' : 'grey',
            dash: 'solid'
          }
        });
      }

      if (shape.type === 'arrow' && shape.id.includes('edge')) {
        const isEdgeHighlighted = isEdgeOnHighlightedPath(
          shape.id as string,
          highlightedPathRef.current
        );

        if (isEdgeHighlighted) {
          updates.push({
            id: shape.id,
            type: 'arrow',
            props: { color: 'orange', dash: 'solid', size: 'm' }
          });
          highlightedEdgeIds.push(shape.id);
        } else {
          updates.push({
            id: shape.id,
            type: 'arrow',
            props: { color: 'grey', dash: 'dashed', size: 's' }
          });
        }
      }
    });

    if (updates.length > 0) {
      editor.updateShapes(updates);
      if (highlightedEdgeIds.length > 0) {
        editor.bringToFront(highlightedEdgeIds);
      }
    }
  };

  const findLayoutNode = (nodeId: string, layout: LayoutNode | null): LayoutNode | null => {
    if (!layout) return null;
    if (layout.id === nodeId) return layout;
    for (const child of layout.children) {
      const found = findLayoutNode(nodeId, child);
      if (found) return found;
    }
    return null;
  };

  const updateNodeIcon = (nodeId: string, isExpanded: boolean) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const shapeId = createShapeId(`node-${nodeId}`);
    const shape = editor.getShape(shapeId);
    if (!shape || !shape.props || typeof shape.props !== 'object') return;
    if (!('text' in shape.props)) return;

    const text = shape.props.text as string;
    const icon = isExpanded ? '\u25BC' : '\u25B6';
    const newText = text.replace(/^[\u25B6\u25BC]\s/, `${icon} `);

    editor.updateShapes([{ id: shapeId, type: 'geo', props: { text: newText } }]);
  };

  const focusOnNode = (nodeId: string, includeChildren: boolean = true) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    if (includeChildren) {
      const boundsWithChildren = calculateBoundsWithChildren(nodeId, editor, data);
      if (boundsWithChildren) {
        editor.zoomToBounds(boundsWithChildren, { animation: { duration: 500 } });
        return;
      }
    }

    const shapeId = createShapeId(`node-${nodeId}`);
    const shape = editor.getShape(shapeId);
    if (!shape) return;

    const bounds = editor.getShapePageBounds(shape);
    if (!bounds) return;

    editor.zoomToBounds(
      { x: bounds.x - 100, y: bounds.y - 100, w: bounds.w + 200, h: bounds.h + 200 },
      { animation: { duration: 500 } }
    );
  };

  const createNodeShape = (
    id: string, text: string, x: number, y: number,
    color: string, isExpandable: boolean, isExpanded: boolean
  ) => {
    const shapeId = createShapeId(`node-${id}`);
    let displayText = truncateText(text);
    if (isExpandable) {
      displayText = addIconToText(displayText, isExpandable, isExpanded);
    }

    return {
      id: shapeId,
      type: 'geo',
      x, y,
      props: {
        w: DEFAULT_LAYOUT.nodeWidth,
        h: DEFAULT_LAYOUT.nodeHeight,
        geo: 'rectangle',
        color,
        fill: 'none',
        dash: 'solid',
        size: 's',
        font: 'sans',
        text: displayText,
        align: 'middle',
        verticalAlign: 'middle',
      },
      meta: { nodeId: id, isExpandable, isExpanded }
    };
  };

  const createOrthogonalEdgeShape = (
    startId: any, endId: any,
    edgeRouting: {
      horizontal1: { x1: number; x2: number; y: number };
      vertical: { x: number; y1: number; y2: number };
      horizontal2: { x1: number; x2: number; y: number };
    } | null,
    parentNodeId: string, childNodeId: string
  ) => {
    const shapes: any[] = [];
    if (!edgeRouting) return shapes;

    const isHighlighted = highlightedPath.has(parentNodeId) && highlightedPath.has(childNodeId);
    const edgeColor = isHighlighted ? 'orange' : 'grey';
    const edgeDash = isHighlighted ? 'solid' : 'dashed';
    const edgeSize = isHighlighted ? 'm' : 's';
    const edgeBaseId = `edge-node-${parentNodeId}-node-${childNodeId}`;

    shapes.push({
      id: createShapeId(`${edgeBaseId}-h1`),
      type: 'arrow',
      props: {
        start: { x: edgeRouting.horizontal1.x1, y: edgeRouting.horizontal1.y },
        end: { x: edgeRouting.horizontal1.x2, y: edgeRouting.horizontal1.y },
        bend: 0, color: edgeColor, size: edgeSize, dash: edgeDash,
        arrowheadStart: 'none', arrowheadEnd: 'none'
      }
    });

    if (Math.abs(edgeRouting.vertical.y1 - edgeRouting.vertical.y2) > 2) {
      shapes.push({
        id: createShapeId(`${edgeBaseId}-v`),
        type: 'arrow',
        props: {
          start: { x: edgeRouting.vertical.x, y: edgeRouting.vertical.y1 },
          end: { x: edgeRouting.vertical.x, y: edgeRouting.vertical.y2 },
          bend: 0, color: edgeColor, size: edgeSize, dash: edgeDash,
          arrowheadStart: 'none', arrowheadEnd: 'none'
        }
      });
    }

    shapes.push({
      id: createShapeId(`${edgeBaseId}-h2`),
      type: 'arrow',
      props: {
        start: { x: edgeRouting.horizontal2.x1, y: edgeRouting.horizontal2.y },
        end: { x: edgeRouting.horizontal2.x2, y: edgeRouting.horizontal2.y },
        bend: 0, color: edgeColor, size: edgeSize, dash: edgeDash,
        arrowheadStart: 'none', arrowheadEnd: 'arrow'
      }
    });

    return shapes;
  };

  const updateShapesForExpansionChange = (clickedNodeId: string, newExpansionState: ExpansionState) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const node = data[clickedNodeId];
    const isExpanded = newExpansionState.expandedNodes.has(clickedNodeId);

    if (isExpanded) {
      const childShapes: any[] = [];

      node.options?.forEach(opt => {
        const childNode = data[opt.nextNodeId];
        const childLayout = findLayoutNode(opt.nextNodeId, layoutRef.current);
        if (!childLayout) return;

        childShapes.push(createNodeShape(
          childLayout.id, childNode.question, childLayout.x, childLayout.y,
          'grey', hasChildren(opt.nextNodeId, data), false
        ));

        const parentShape = editor.getShape(createShapeId(`node-${clickedNodeId}`));
        if (parentShape && 'x' in parentShape && 'y' in parentShape) {
          const parentX = (parentShape as any).x;
          const parentY = (parentShape as any).y;
          const parentProps = (parentShape as any).props;

          const parentRightX = parentX + (parentProps?.w || DEFAULT_LAYOUT.nodeWidth);
          const parentCenterY = parentY + (parentProps?.h || DEFAULT_LAYOUT.nodeHeight) / 2;
          const childLeftX = childLayout.x;
          const childCenterY = childLayout.y + DEFAULT_LAYOUT.nodeHeight / 2;
          const midGap = DEFAULT_LAYOUT.levelGap * 0.4;
          const midX = parentRightX + midGap;

          const edgeShapes = createOrthogonalEdgeShape(
            createShapeId(`node-${clickedNodeId}`), childLayout.id,
            {
              horizontal1: { x1: parentRightX, x2: midX, y: parentCenterY },
              vertical: { x: midX, y1: parentCenterY, y2: childCenterY },
              horizontal2: { x1: midX, x2: childLeftX, y: childCenterY }
            },
            clickedNodeId, opt.nextNodeId
          );
          childShapes.push(...edgeShapes);
        }
      });

      editor.createShapes(childShapes);
      setTimeout(() => reapplyHighlighting(), 50);
      setTimeout(() => focusOnNode(clickedNodeId), 100);
    } else {
      const descendants = getAllDescendants(clickedNodeId, data);
      const descendantSet = new Set(descendants);
      const nodeShapeIds = descendants.map(id => createShapeId(`node-${id}`));

      let edgeShapeIds: any[] = [];
      if (editor.getCurrentPageShapes) {
        const allShapes = editor.getCurrentPageShapes();
        edgeShapeIds = allShapes
          .filter((shape: any) => {
            if (shape.type !== 'arrow' || !shape.id.includes('edge')) return false;
            return shouldDeleteEdgeOnCollapse(shape.id as string, clickedNodeId, descendantSet);
          })
          .map((shape: any) => shape.id);
      }

      editor.deleteShapes([...nodeShapeIds, ...edgeShapeIds]);
      setTimeout(() => focusOnNode(clickedNodeId), 100);
    }

    updateNodeIcon(clickedNodeId, isExpanded);
  };

  const handleNodeClick = (nodeId: string) => {
    const node = data[nodeId];
    if (isAnimatingRef.current) return;

    const fullPath = calculatePathToNode(nodeId, data);
    setHighlightedPath(new Set(fullPath));
    setHighlightedEdges(getHighlightedEdges(fullPath));

    if (onSelectionChange) onSelectionChange(nodeId);

    if (nodeId === 'start' && expansionState.expandedNodes.has('start')) return;

    if (!node.options || node.options.length === 0) {
      setTimeout(() => onNodeClick(nodeId), 400);
      return;
    }

    isAnimatingRef.current = true;
    setExpansionState(prevState => {
      const newState = toggleNodeExpansion(nodeId, prevState, data);
      requestAnimationFrame(() => updateShapesForExpansionChange(nodeId, newState));
      return newState;
    });
    setTimeout(() => { isAnimatingRef.current = false; }, 600);
  };

  const handleMount = (editor: Editor) => {
    editorRef.current = editor;
    if (!handlerRegisteredRef.current) setIsMounted(true);
    setCurrentTool(editor.getCurrentToolId());

    const shapes: any[] = [];
    const makeId = (id: string) => createShapeId(`node-${id}`);

    const createNode = (
      id: string, text: string, x: number, y: number,
      color: string = 'grey', fill: string = 'none',
      isExpandable: boolean = false, isExpanded: boolean = false,
      dash: 'solid' | 'dashed' = 'solid'
    ) => {
      const shapeId = makeId(id);
      let displayText = truncateText(text);
      if (isExpandable) {
        displayText = addIconToText(truncateText(text), isExpandable, isExpanded);
      }

      shapes.push({
        id: shapeId, type: 'geo', x, y,
        props: {
          w: DEFAULT_LAYOUT.nodeWidth, h: DEFAULT_LAYOUT.nodeHeight,
          geo: 'rectangle', color, fill, dash, size: 's', font: 'sans',
          text: displayText, align: 'middle', verticalAlign: 'middle',
        },
        meta: { nodeId: id, isExpandable, isExpanded }
      });
      return shapeId;
    };

    const createOrthogonalEdge = (
      startId: any, endId: any, label: string | undefined,
      level: number, siblingIndex: number, totalSiblings: number,
      parentNodeId: string, childNodeId: string
    ): void => {
      const startNode = shapes.find(s => s.id === startId);
      const endNode = shapes.find(s => s.id === endId);
      if (!startNode || !endNode) return;

      const parentRightX = startNode.x + startNode.props.w;
      const parentCenterY = startNode.y + startNode.props.h / 2;
      const childLeftX = endNode.x;
      const childCenterY = endNode.y + endNode.props.h / 2;
      const midGap = DEFAULT_LAYOUT.levelGap * 0.4;
      const midX = parentRightX + midGap;

      const isHighlighted = highlightedPath.has(parentNodeId) && highlightedPath.has(childNodeId);
      const edgeColor = isHighlighted ? 'orange' : 'grey';
      const edgeDash = isHighlighted ? 'solid' : 'dashed';
      const edgeSize = isHighlighted ? 'm' : 's';
      const baseId = `edge-node-${parentNodeId}-node-${childNodeId}`;

      shapes.push({
        id: createShapeId(`${baseId}-h1`), type: 'arrow',
        props: {
          start: { x: parentRightX, y: parentCenterY },
          end: { x: midX, y: parentCenterY },
          bend: 0, color: edgeColor, size: edgeSize, dash: edgeDash,
          arrowheadStart: 'none', arrowheadEnd: 'none',
        },
      });

      if (Math.abs(parentCenterY - childCenterY) > 2) {
        shapes.push({
          id: createShapeId(`${baseId}-v`), type: 'arrow',
          props: {
            start: { x: midX, y: parentCenterY },
            end: { x: midX, y: childCenterY },
            bend: 0, color: edgeColor, size: edgeSize, dash: edgeDash,
            arrowheadStart: 'none', arrowheadEnd: 'none',
          },
        });
      }

      shapes.push({
        id: createShapeId(`${baseId}-h2`), type: 'arrow',
        props: {
          start: { x: midX, y: childCenterY },
          end: { x: childLeftX, y: childCenterY },
          bend: 0, color: edgeColor, size: edgeSize, dash: edgeDash,
          arrowheadStart: 'none', arrowheadEnd: 'arrow', text: '', font: 'mono',
        },
      });
    };

    const createNodesFromLayout = (layoutNode: LayoutNode, maxDepth: number = MAX_MAP_DEPTH): void => {
      if (!isNodeVisible(layoutNode.id, layoutNode, expansionState, data)) return;

      let color = 'grey';
      let fill = 'none';
      const dash: 'solid' | 'dashed' = 'solid';

      if (highlightedPath.has(layoutNode.id)) {
        fill = 'solid';
        color = 'orange';
      }

      const nodeText = data[layoutNode.id]?.question || layoutNode.id;
      const isExpandableNode = hasChildren(layoutNode.id, data);
      const isExpanded = expansionState.expandedNodes.has(layoutNode.id);

      const nodeId = createNode(
        layoutNode.id, nodeText, layoutNode.x, layoutNode.y,
        color, fill, isExpandableNode, isExpanded, dash
      );

      if (layoutNode.level >= maxDepth) return;

      if (expansionState.expandedNodes.has(layoutNode.id)) {
        layoutNode.children.forEach((child, index) => {
          createNodesFromLayout(child, maxDepth);
          if (isNodeVisible(child.id, child, expansionState, data)) {
            const childNodeId = makeId(child.id);
            const label = data[layoutNode.id]?.options?.find(opt => opt.nextNodeId === child.id)?.label;
            createOrthogonalEdge(nodeId, childNodeId, label, child.level, index, layoutNode.children.length, layoutNode.id, child.id);
          }
        });
      }
    };

    editor.selectAll().deleteShapes(editor.getSelectedShapeIds());

    const layout = calculateNodePositions('start', data, DEFAULT_LAYOUT.startX, DEFAULT_LAYOUT.startY, 1, DEFAULT_LAYOUT);
    layoutRef.current = layout;
    createNodesFromLayout(layout);
    editor.createShapes(shapes);

    setTimeout(() => {
      editor.zoomToFit({ animation: { duration: 200 } });
    }, 100);
  };

  useEffect(() => {
    if (!isMounted || !editorRef.current || handlerRegisteredRef.current) return;

    const editor = editorRef.current;

    const handleEvent = (e: any) => {
      const toolId = editor.getCurrentToolId();
      setCurrentTool(toolId);

      if (e.name !== 'pointer_up') return;
      if (toolId !== 'select') return;

      const selected = editor.getSelectedShapes();
      if (selected.length !== 1) return;

      const shape = selected[0] as any;
      if (!shape.meta || !shape.meta.nodeId) return;

      handleNodeClick(shape.meta.nodeId);
    };

    editor.on('event', handleEvent);
    handlerRegisteredRef.current = true;

    return () => {
      editor.off('event', handleEvent);
      handlerRegisteredRef.current = false;
    };
  }, [isMounted]);

  const handleZoomToFit = () => editorRef.current?.zoomToFit({ animation: { duration: 300 } });
  const handleZoomIn = () => editorRef.current?.zoomIn();
  const handleZoomOut = () => editorRef.current?.zoomOut();
  const handleSetTool = (tool: 'select' | 'hand') => {
    if (editorRef.current) {
      editorRef.current.setCurrentTool(tool);
      setCurrentTool(tool);
    }
  };

  return (
    <div className="w-full min-h-[600px] h-[calc(100vh-300px)] max-h-[1200px] border-2 border-ink shadow-brutal bg-white relative">
      <Tldraw onMount={handleMount} hideUi={true} persistenceKey="sas-decision-tree-map" />

      <div className="absolute top-4 right-4 bg-white border-1 border-ink shadow-brutal p-1 z-[1000] flex flex-col gap-1">
        <button onClick={handleZoomToFit} className="px-3 py-2 hover:bg-accent transition-colors border-1 border-transparent hover:border-ink" title="Fit Window">
          <i className="fa-solid fa-expand text-ink"></i>
        </button>
        <button onClick={handleZoomIn} className="px-3 py-2 hover:bg-accent transition-colors border-1 border-transparent hover:border-ink" title="Zoom In">
          <i className="fa-solid fa-magnifying-glass-plus text-ink"></i>
        </button>
        <button onClick={handleZoomOut} className="px-3 py-2 hover:bg-accent transition-colors border-1 border-transparent hover:border-ink" title="Zoom Out">
          <i className="fa-solid fa-magnifying-glass-minus text-ink"></i>
        </button>
        <div className="h-px bg-ink/20 w-full"></div>
        <button onClick={() => handleSetTool('select')} className={`px-3 py-2 transition-colors border-1 ${currentTool === 'select' ? 'bg-primary border-ink' : 'border-transparent hover:bg-accent hover:border-ink'}`} title="Select Tool">
          <i className="fa-solid fa-arrow-pointer text-ink"></i>
        </button>
        <button onClick={() => handleSetTool('hand')} className={`px-3 py-2 transition-colors border-1 ${currentTool === 'hand' ? 'bg-primary border-ink' : 'border-transparent hover:bg-accent hover:border-ink'}`} title="Pan Tool">
          <i className="fa-solid fa-hand text-ink"></i>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-white/90 p-2 border-1 border-ink pointer-events-none z-[1000] font-mono text-xs">
        <p className="font-bold">INTERACTIVE MAP</p>
        <p>Click nodes to navigate - Pan/Zoom to explore</p>
      </div>
    </div>
  );
};
