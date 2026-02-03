
import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  FileText,
  Map as MapIcon,
  Play
} from 'lucide-react';
import { Tldraw, Editor, createShapeId } from 'tldraw';
import { TREE_DATA } from './data';
import { SASCard } from './components/SASCard';
import { DecisionNode, TreeData } from './types';
import { ChatPanel } from './components/ChatPanel';
import {
  calculateNodePositions,
  getArrowStyleWithHighlight,
  DEFAULT_LAYOUT,
  LayoutNode
} from './utils/treeLayout';
import { truncateText } from './utils/textHelpers';
import { addIconToText } from './utils/nodeIcons';
import {
  ExpansionState,
  createInitialExpansionState,
  toggleNodeExpansion,
  isNodeVisible,
  hasChildren
} from './utils/expansionState';
import { calculatePathToNode, getHighlightedEdges } from './utils/pathHighlighting';
import { calculateBoundsWithChildren } from './utils/animations';

// --- Tldraw Map Component ---

// Maximum depth to render in the map view
// Level 1: START ("What's your question?")
// Level 2: COMPARE GROUPS | DESCRIBE/EXPLORE (separate nodes)
// Level 3: Continuous, Binary, Count, Time-to-Event, Ordinal (the 5 outcome branches)
// Level 4+: Deeper branches (time point, group count, etc.)
//
// Note: describe_explore is a result node (leaf) at Level 2
const MAX_MAP_DEPTH = 6;

interface TldrawMapViewProps {
  data: TreeData;
  onNodeClick: (id: string) => void;
  selectedNodeId?: string; // External selection from Interactive Flow
  onSelectionChange?: (nodeId: string) => void; // Notify parent of map selection
}

const TldrawMapView: React.FC<TldrawMapViewProps> = ({
  data,
  onNodeClick,
  selectedNodeId,
  onSelectionChange
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const layoutRef = useRef<LayoutNode | null>(null);
  const handlerRegisteredRef = useRef<boolean>(false);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [expansionState, setExpansionState] = useState<ExpansionState>(
    createInitialExpansionState()
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Path highlighting state
  const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set(['start']));
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());

  // Sync highlighted path when external selection changes (from Interactive Flow)
  useEffect(() => {
    if (selectedNodeId) {
      // Calculate full path from root to selected node
      const fullPath = calculatePathToNode(selectedNodeId, data);
      setHighlightedPath(new Set(fullPath));
      setHighlightedEdges(getHighlightedEdges(fullPath));
    }
  }, [selectedNodeId, data]);

  // Re-apply highlighting when highlighted path changes
  useEffect(() => {
    if (editorRef.current && isMounted) {
      reapplyHighlighting();
    }
  }, [highlightedPath, highlightedEdges, isMounted]);

  const handleMount = (editor: Editor) => {
    // Store editor reference
    editorRef.current = editor;

    // Only set mounted if not already mounted (prevent re-registration)
    if (!handlerRegisteredRef.current) {
      setIsMounted(true);
    }

    // Set initial tool state
    setCurrentTool(editor.getCurrentToolId());
    // --- 1. Initialize shape collection and helpers ---
    const shapes: any[] = [];
    const makeId = (id: string) => createShapeId(`node-${id}`);

    // --- 2. Create node helper function ---
    const createNode = (
      id: string,
      text: string,
      x: number,
      y: number,
      color: string = 'grey',
      fill: string = 'none',
      isExpandable: boolean = false,
      isExpanded: boolean = false,
      dash: 'solid' | 'dashed' = 'solid'
    ) => {
      const shapeId = makeId(id);

      // Add expand/collapse icon to text if node is expandable
      let displayText = truncateText(text);
      if (isExpandable) {
        displayText = addIconToText(truncateText(text), isExpandable, isExpanded);
      }

      shapes.push({
        id: shapeId,
        type: 'geo',
        x,
        y,
        props: {
          w: DEFAULT_LAYOUT.nodeWidth,
          h: DEFAULT_LAYOUT.nodeHeight,
          geo: 'rectangle',
          color,
          fill,
          dash,
          size: 's',
          font: 'sans',
          text: displayText,
          align: 'middle',
          verticalAlign: 'middle',
        },
        meta: {
          nodeId: id,
          isExpandable,
          isExpanded
        }
      });
      return shapeId;
    };

    // --- 3. Create orthogonal edge (right-angle connector) ---
    const createOrthogonalEdge = (
      startId: any,
      endId: any,
      label: string | undefined,
      level: number,
      siblingIndex: number,
      totalSiblings: number,
      parentNodeId: string,
      childNodeId: string
    ): void => {
      const startNode = shapes.find(s => s.id === startId);
      const endNode = shapes.find(s => s.id === endId);

      if (!startNode || !endNode) {
        return;
      }

      // Calculate connection points for LEFT-TO-RIGHT layout
      // Parent connects from RIGHT center, child connects from LEFT center
      const parentRightX = startNode.x + startNode.props.w;
      const parentCenterY = startNode.y + startNode.props.h / 2;
      const childLeftX = endNode.x;
      const childCenterY = endNode.y + endNode.props.h / 2;

      // Midpoint X position (40% of the gap)
      const midGap = DEFAULT_LAYOUT.levelGap * 0.4;
      const midX = parentRightX + midGap;

      // Check if this edge should be highlighted (both parent and child are on highlighted path)
      const isHighlighted = highlightedPath.has(parentNodeId) && highlightedPath.has(childNodeId);

      // Get arrow style based on level and highlight state
      const style = getArrowStyleWithHighlight(level, isHighlighted);

      // Use correct size based on highlighting: 'm' if highlighted, 's' otherwise
      const edgeSize = isHighlighted ? 'm' : 's';

      // Create unique base ID for this edge
      const baseId = `edge-${startId.id || startId}-${endId.id || endId}`;

      // Create 3 line segments for orthogonal path (H-V-H pattern):
      // 1. Horizontal line from parent right to midpoint X
      shapes.push({
        id: createShapeId(`${baseId}-h1`),
        type: 'arrow',
        props: {
          start: { x: parentRightX, y: parentCenterY },
          end: { x: midX, y: parentCenterY },
          bend: 0,
          color: style.color,
          size: edgeSize,
          dash: style.dash,
          arrowheadStart: 'none',
          arrowheadEnd: 'none',
        },
      });

      // 2. Vertical line from parent Y to child Y at midpoint X
      // Only create if there's meaningful vertical distance (avoid zero-length segments)
      if (Math.abs(parentCenterY - childCenterY) > 2) {
        shapes.push({
          id: createShapeId(`${baseId}-v`),
          type: 'arrow',
          props: {
            start: { x: midX, y: parentCenterY },
            end: { x: midX, y: childCenterY },
            bend: 0,
            color: style.color,
            size: edgeSize,
            dash: style.dash,
            arrowheadStart: 'none',
            arrowheadEnd: 'none',
          },
        });
      }

      // 3. Horizontal line from midpoint X to child left (with arrowhead and label)
      shapes.push({
        id: createShapeId(`${baseId}-h2`),
        type: 'arrow',
        props: {
          start: { x: midX, y: childCenterY },
          end: { x: childLeftX, y: childCenterY },
          bend: 0,
          color: style.color,
          size: edgeSize,
          dash: style.dash,
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
          text: '',
          font: 'mono',
        },
      });
    };

    // --- 4. Recursive function to create nodes from layout ---
    const createNodesFromLayout = (layoutNode: LayoutNode, maxDepth: number = MAX_MAP_DEPTH): void => {
      // Phase 2: Check visibility before creating node
      if (!isNodeVisible(layoutNode.id, layoutNode, expansionState, data)) {
        return; // Skip this node and its children
      }

      // Determine node color and fill based on node ID and layer
      // Layer 1: start (black, solid)
      // Layer 2: compare_groups (blue, solid), describe_explore (green, solid - result node)
      // Layer 3: 5 outcome branches (violet, semi)
      let color = 'grey';
      let fill = 'none';
      let dash: 'solid' | 'dashed' = 'solid';

      // Check if node is on highlighted path
      const isOnHighlightedPath = highlightedPath.has(layoutNode.id);

      if (layoutNode.id === 'start') {
        // Layer 1: Root node
        color = 'black';
        fill = 'solid';
      } else if (layoutNode.id === 'compare_groups') {
        // Layer 2: Compare Groups path
        color = 'blue';
        fill = 'solid';
      } else if (layoutNode.id === 'describe_explore') {
        // Layer 2: Describe/Explore path (result node)
        color = 'green';
        fill = 'solid';
      } else if (['cont_time', 'bin_time', 'count_check', 'tte_type', 'ord_type'].includes(layoutNode.id)) {
        // Layer 3: The 5 outcome branches (now directly under compare_groups)
        color = 'violet';
        fill = 'semi';
      }

      // Apply highlighting border if node is on highlighted path
      if (isOnHighlightedPath) {
        dash = 'dashed';
        color = 'orange'; // Amber color for highlighting
      }

      // Get node text from TREE_DATA
      const nodeText = data[layoutNode.id]?.question || layoutNode.id;

      // Check if node has children (is expandable)
      const isExpandableNode = hasChildren(layoutNode.id, data);

      // Phase 3: Check if node is expanded
      const isExpanded = expansionState.expandedNodes.has(layoutNode.id);

      // Create the node shape with highlighting dash style
      const nodeId = createNode(
        layoutNode.id,
        nodeText,
        layoutNode.x,
        layoutNode.y,
        color,
        fill,
        isExpandableNode,
        isExpanded,
        dash
      );

      // STOP RECURSION at max depth - don't create children beyond this level
      if (layoutNode.level >= maxDepth) {
        return;
      }

      // Phase 2: Only process children if this node is expanded
      if (expansionState.expandedNodes.has(layoutNode.id)) {
        layoutNode.children.forEach((child, index) => {
          // Create child node first (with maxDepth parameter)
          createNodesFromLayout(child, maxDepth);

          // Phase 2: Create edge only if child is visible
          if (isNodeVisible(child.id, child, expansionState, data)) {
            const childNodeId = makeId(child.id);

            // Get arrow label from options
            const label = data[layoutNode.id]?.options?.find(
              opt => opt.nextNodeId === child.id
            )?.label;

            createOrthogonalEdge(
              nodeId,
              childNodeId,
              label,
              child.level,
              index,
              layoutNode.children.length,
              layoutNode.id,
              child.id
            );
          }
        });
      }
    };

    // --- 5. Build the tree using layout utilities ---
    editor.selectAll().deleteShapes(editor.getSelectedShapeIds());

    // Calculate optimal layout positions
    // FIX: Start at level 1 (not 0) to prevent off-by-one error in maxDepth check
    const layout = calculateNodePositions(
      'start',
      data,
      DEFAULT_LAYOUT.startX,
      DEFAULT_LAYOUT.startY,
      1,  // Changed from 0 to 1 to fix level counting bug
      DEFAULT_LAYOUT
    );

    // Store layout in ref for incremental updates
    layoutRef.current = layout;

    // Create all nodes and arrows from layout
    createNodesFromLayout(layout);

    // --- 6. Render to canvas ---
    editor.createShapes(shapes);

    // Zoom to fit with improved timing
    setTimeout(() => {
      editor.zoomToFit({
        animation: { duration: 200 }
      });
    }, 100);
  };

  // Helper function: Find layout node by ID in tree
  const findLayoutNode = (nodeId: string, layout: LayoutNode | null): LayoutNode | null => {
    if (!layout) return null;
    if (layout.id === nodeId) return layout;

    for (const child of layout.children) {
      const found = findLayoutNode(nodeId, child);
      if (found) return found;
    }

    return null;
  };

  // Helper function: Get all descendant node IDs
  const getAllDescendants = (nodeId: string, treeData: TreeData): string[] => {
    const node = treeData[nodeId];
    if (!node.options || node.options.length === 0) return [];

    const descendants: string[] = [];
    for (const option of node.options) {
      const childId = option.nextNodeId;
      descendants.push(childId);
      descendants.push(...getAllDescendants(childId, treeData));
    }

    return descendants;
  };

  // Helper function: Update node icon (expand/collapse indicator)
  const updateNodeIcon = (nodeId: string, isExpanded: boolean) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const shapeId = createShapeId(`node-${nodeId}`);
    const shape = editor.getShape(shapeId);

    if (!shape || !shape.props || typeof shape.props !== 'object') return;
    if (!('text' in shape.props)) return;

    const text = shape.props.text as string;
    const icon = isExpanded ? '▼' : '▶';

    // Replace icon in text
    const newText = text.replace(/^[▶▼]\s/, `${icon} `);

    editor.updateShapes([{
      id: shapeId,
      type: 'geo',
      props: { text: newText }
    }]);
  };

  // Helper function: Re-apply highlighting to all visible shapes
  const reapplyHighlighting = () => {
    if (!editorRef.current || !editorRef.current.getCurrentPageShapes) return;

    const editor = editorRef.current;
    const allShapes = editor.getCurrentPageShapes();
    const updates: any[] = [];

    allShapes.forEach((shape: any) => {
      // Update nodes
      if (shape.type === 'geo' && shape.meta?.nodeId) {
        const nodeId = shape.meta.nodeId;
        const isHighlighted = highlightedPath.has(nodeId);

        if (isHighlighted) {
          updates.push({
            id: shape.id,
            type: 'geo',
            props: {
              dash: 'dashed',
              color: 'orange'
            }
          });
        } else {
          // Reset to default styling (remove highlighting)
          let defaultColor = 'grey';
          if (nodeId === 'start') {
            defaultColor = 'black';
          } else if (nodeId === 'compare_groups') {
            defaultColor = 'blue';
          } else if (nodeId === 'describe_explore') {
            defaultColor = 'green';
          } else if (['cont_time', 'bin_time', 'count_check', 'tte_type', 'ord_type'].includes(nodeId)) {
            defaultColor = 'violet';
          }

          updates.push({
            id: shape.id,
            type: 'geo',
            props: {
              dash: 'solid',
              color: defaultColor
            }
          });
        }
      }

      // Update edges
      if (shape.type === 'arrow' && shape.id.includes('edge')) {
        // Extract parent and child node IDs from edge ID
        // Format: edge-node-{parentId}-node-{childId}-{segment}
        const edgeId = shape.id as string;

        // Parse parent and child node IDs from shape ID
        // Shape ID format: edge-node-{parentId}-node-{childId}-{segment}
        const cleanedId = edgeId.replace(/-h1$|-h2$|-v$/g, '');
        const match = cleanedId.match(/edge-node-(.+?)-node-(.+)$/);
        let isEdgeHighlighted = false;
        if (match) {
          const [, parentId, childId] = match;
          isEdgeHighlighted = highlightedPath.has(parentId) && highlightedPath.has(childId);
        }

        if (isEdgeHighlighted) {
          updates.push({
            id: shape.id,
            type: 'arrow',
            props: {
              color: 'orange',
              size: 'm'
            }
          });
        } else {
          // Reset to default
          updates.push({
            id: shape.id,
            type: 'arrow',
            props: {
              color: shape.props.color !== 'orange' ? shape.props.color : 'grey',
              size: 's'
            }
          });
        }
      }
    });

    if (updates.length > 0) {
      editor.updateShapes(updates);
    }
  };

  // Helper function: Animate shapes in with staggered fade
  const animateShapesIn = (shapeIds: string[]) => {
    if (!editorRef.current || shapeIds.length === 0) return;

    const editor = editorRef.current;

    // Stagger fade-in animation
    shapeIds.forEach((id, index) => {
      setTimeout(() => {
        const shape = editor.getShape(id);
        if (shape) {
          editor.updateShapes([{
            id,
            type: shape.type,
            opacity: 1
          }]);
        }
      }, index * 50);
    });
  };

  // Helper function: Zoom to node bounds (smart zoom includes children)
  const focusOnNode = (nodeId: string, includeChildren: boolean = true) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;

    // Use smart zoom that includes children bounds
    if (includeChildren) {
      const boundsWithChildren = calculateBoundsWithChildren(nodeId, editor, data);
      if (boundsWithChildren) {
        editor.zoomToBounds(boundsWithChildren, {
          animation: { duration: 500 }
        });
        return;
      }
    }

    // Fallback: zoom to just the node
    const shapeId = createShapeId(`node-${nodeId}`);
    const shape = editor.getShape(shapeId);

    if (!shape) return;

    const bounds = editor.getShapePageBounds(shape);
    if (!bounds) return;

    const paddedBounds = {
      x: bounds.x - 100,
      y: bounds.y - 100,
      w: bounds.w + 200,
      h: bounds.h + 200
    };

    editor.zoomToBounds(paddedBounds, {
      animation: { duration: 500 }
    });
  };

  // Helper function: Create node shape (for incremental updates)
  const createNodeShape = (
    id: string,
    text: string,
    x: number,
    y: number,
    color: string,
    isExpandable: boolean,
    isExpanded: boolean
  ) => {
    const shapeId = createShapeId(`node-${id}`);
    let displayText = truncateText(text);
    if (isExpandable) {
      displayText = addIconToText(displayText, isExpandable, isExpanded);
    }

    return {
      id: shapeId,
      type: 'geo',
      x,
      y,
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
      meta: {
        nodeId: id,
        isExpandable,
        isExpanded
      }
    };
  };

  // Helper function: Create orthogonal edge shape with highlighting support
  const createOrthogonalEdgeShape = (
    startId: any,
    endId: any,
    edgeRouting: { horizontal: { x1: number; x2: number; y: number }; vertical: { x: number; y1: number; y2: number } } | null,
    parentNodeId: string,
    childNodeId: string
  ) => {
    const shapes: any[] = [];

    if (edgeRouting) {
      // Check if edge should be highlighted
      const isHighlighted = highlightedPath.has(parentNodeId) && highlightedPath.has(childNodeId);
      const edgeColor = isHighlighted ? 'orange' : 'grey';
      const edgeSize = isHighlighted ? 'm' : 's';

      // Horizontal segment
      shapes.push({
        id: createShapeId(`edge-h-${endId}`),
        type: 'arrow',
        props: {
          start: { x: edgeRouting.horizontal.x1, y: edgeRouting.horizontal.y },
          end: { x: edgeRouting.horizontal.x2, y: edgeRouting.horizontal.y },
          bend: 0,
          color: edgeColor,
          size: edgeSize,
          arrowheadStart: 'none',
          arrowheadEnd: 'none'
        }
      });

      // Vertical segment
      shapes.push({
        id: createShapeId(`edge-v-${endId}`),
        type: 'arrow',
        props: {
          start: { x: edgeRouting.vertical.x, y: edgeRouting.vertical.y1 },
          end: { x: edgeRouting.vertical.x, y: edgeRouting.vertical.y2 },
          bend: 0,
          color: edgeColor,
          size: edgeSize,
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow'
        }
      });
    }

    return shapes;
  };

  // Incremental shape update function
  const updateShapesForExpansionChange = (
    clickedNodeId: string,
    newExpansionState: ExpansionState
  ) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const node = data[clickedNodeId];

    const isExpanded = newExpansionState.expandedNodes.has(clickedNodeId);

    if (isExpanded) {
      // EXPANDING: Add children shapes
      const childShapes: any[] = [];

      node.options?.forEach(opt => {
        const childNode = data[opt.nextNodeId];
        const childLayout = findLayoutNode(opt.nextNodeId, layoutRef.current);

        if (!childLayout) return;

        // Create child shape
        const childShape = createNodeShape(
          childLayout.id,
          childNode.question,
          childLayout.x,
          childLayout.y,
          'grey',
          hasChildren(opt.nextNodeId, data),
          false
        );

        childShapes.push(childShape);

        // Calculate edge routing manually for incremental creation
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

          const edgeRouting = {
            horizontal: { x1: parentRightX, x2: midX, y: parentCenterY },
            vertical: { x: midX, y1: parentCenterY, y2: childCenterY }
          };

          // Create edge with highlighting support
          const edgeShapes = createOrthogonalEdgeShape(
            createShapeId(`node-${clickedNodeId}`),
            childLayout.id,
            edgeRouting,
            clickedNodeId,
            opt.nextNodeId
          );

          childShapes.push(...edgeShapes);
        }
      });

      // Create all shapes at once
      editor.createShapes(childShapes);

      // Re-apply highlighting after creating new shapes
      setTimeout(() => reapplyHighlighting(), 50);

      // Animate new shapes
      const shapeIds = childShapes
        .filter(s => s.type === 'geo')
        .map(s => s.id);
      animateShapesIn(shapeIds);

      // Zoom to expanded content
      setTimeout(() => focusOnNode(clickedNodeId), 100);

    } else {
      // COLLAPSING: Remove descendant shapes
      const descendants = getAllDescendants(clickedNodeId, data);
      const shapeIdsToDelete = descendants.flatMap(id =>
        [
          createShapeId(`node-${id}`),
          createShapeId(`edge-${id}`),
          createShapeId(`edge-h-${id}`),
          createShapeId(`edge-v-${id}`)
        ]
      );

      editor.deleteShapes(shapeIdsToDelete);

      // Zoom to parent
      setTimeout(() => focusOnNode(clickedNodeId), 100);
    }

    // Update expand/collapse icon on clicked node
    updateNodeIcon(clickedNodeId, isExpanded);
  };

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    const node = data[nodeId];

    // Ignore clicks during animation
    if (isAnimating) return;

    // Update highlighted path when any node is clicked
    const fullPath = calculatePathToNode(nodeId, data);
    setHighlightedPath(new Set(fullPath));
    setHighlightedEdges(getHighlightedEdges(fullPath));

    // Notify parent of selection change (for bidirectional sync)
    if (onSelectionChange) {
      onSelectionChange(nodeId);
    }

    // Prevent collapsing root node (always expanded)
    if (nodeId === 'start' && expansionState.expandedNodes.has('start')) {
      return;
    }

    // Check if expandable
    if (!node.options || node.options.length === 0) {
      onNodeClick(nodeId); // Leaf node - show result panel
      return;
    }

    // Set animating flag
    setIsAnimating(true);

    // Update expansion state using functional update to access latest state
    setExpansionState(prevState => {
      const newState = toggleNodeExpansion(nodeId, prevState, data);

      // Schedule shape update AFTER state is committed
      requestAnimationFrame(() => {
        updateShapesForExpansionChange(nodeId, newState);
      });

      return newState;
    });

    // Reset animation flag after animation completes
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Register event handler once using useEffect
  useEffect(() => {
    if (!isMounted || !editorRef.current || handlerRegisteredRef.current) return;

    const editor = editorRef.current;

    // Event handler using LATEST state via functional setState
    const handleEvent = (e: any) => {
      // Track tool changes
      const toolId = editor.getCurrentToolId();
      setCurrentTool(toolId);

      // Handle pointer_up events
      if (e.name !== 'pointer_up') return;

      // Check if select tool is active
      if (toolId !== 'select') return;

      const selected = editor.getSelectedShapes();
      if (selected.length !== 1) return;

      const shape = selected[0] as any;
      if (!shape.meta || !shape.meta.nodeId) return;

      handleNodeClick(shape.meta.nodeId);
    };

    // Register listener
    editor.on('event', handleEvent);
    handlerRegisteredRef.current = true;

    // Cleanup function - CRITICAL!
    return () => {
      editor.off('event', handleEvent);
      handlerRegisteredRef.current = false;
    };
  }, [isMounted]); // Run when isMounted changes to true

  // Control button handlers
  const handleZoomToFit = () => {
    if (editorRef.current) {
      editorRef.current.zoomToFit({ animation: { duration: 300 } });
    }
  };

  const handleZoomIn = () => {
    if (editorRef.current) {
      editorRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (editorRef.current) {
      editorRef.current.zoomOut();
    }
  };

  const handleSetTool = (tool: 'select' | 'hand') => {
    if (editorRef.current) {
      editorRef.current.setCurrentTool(tool);
      setCurrentTool(tool);
    }
  };

  return (
    <div className="w-full min-h-[600px] h-[calc(100vh-300px)] max-h-[1200px] border-2 border-ink shadow-brutal bg-white relative">
        <Tldraw
            onMount={handleMount}
            hideUi={true}
            persistenceKey="sas-decision-tree-map" // Ensure state persists correctly
        />

        {/* Control Toolbar */}
        <div className="absolute top-4 right-4 bg-white border-1 border-ink shadow-brutal p-1 z-[1000] flex flex-col gap-1">
          <button
            onClick={handleZoomToFit}
            className="px-3 py-2 hover:bg-accent transition-colors border-1 border-transparent hover:border-ink"
            title="Fit Window"
          >
            <i className="fa-solid fa-expand text-ink"></i>
          </button>

          <button
            onClick={handleZoomIn}
            className="px-3 py-2 hover:bg-accent transition-colors border-1 border-transparent hover:border-ink"
            title="Zoom In"
          >
            <i className="fa-solid fa-magnifying-glass-plus text-ink"></i>
          </button>

          <button
            onClick={handleZoomOut}
            className="px-3 py-2 hover:bg-accent transition-colors border-1 border-transparent hover:border-ink"
            title="Zoom Out"
          >
            <i className="fa-solid fa-magnifying-glass-minus text-ink"></i>
          </button>

          <div className="h-px bg-ink/20 w-full"></div>

          <button
            onClick={() => handleSetTool('select')}
            className={`px-3 py-2 transition-colors border-1 ${
              currentTool === 'select'
                ? 'bg-primary border-ink'
                : 'border-transparent hover:bg-accent hover:border-ink'
            }`}
            title="Select Tool"
          >
            <i className="fa-solid fa-arrow-pointer text-ink"></i>
          </button>

          <button
            onClick={() => handleSetTool('hand')}
            className={`px-3 py-2 transition-colors border-1 ${
              currentTool === 'hand'
                ? 'bg-primary border-ink'
                : 'border-transparent hover:bg-accent hover:border-ink'
            }`}
            title="Pan Tool"
          >
            <i className="fa-solid fa-hand text-ink"></i>
          </button>
        </div>

        <div className="absolute bottom-4 left-4 bg-white/90 p-2 border-1 border-ink pointer-events-none z-[1000] font-mono text-xs">
            <p className="font-bold">INTERACTIVE MAP</p>
            <p>Click nodes to navigate • Pan/Zoom to explore</p>
        </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [history, setHistory] = useState<string[]>(['start']);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  // Default to 'map' as requested
  const [viewMode, setViewMode] = useState<'interactive' | 'map'>('map');

  const currentNodeId = history[history.length - 1];
  const currentNode: DecisionNode = TREE_DATA[currentNodeId] || TREE_DATA['start'];

  const handleSelectOption = (nextNodeId: string) => {
    setHistory(prev => [...prev, nextNodeId]);
  };

  const handleGoBack = () => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleReset = () => {
    setHistory(['start']);
    setViewMode('interactive');
  };

  const handleJumpToNode = (id: string) => {
    setHistory(['start', id]);
    setViewMode('interactive');
  };

  const breadcrumbs = useMemo(() => {
    return history.map(id => TREE_DATA[id]?.question || id);
  }, [history]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b-1 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-ink p-2 border-1 border-ink text-primary">
              <MapIcon size={20} />
            </div>
            <h1 className="font-bold text-ink text-lg font-mono hidden sm:block">
              SAS Clinical Decision Tree
            </h1>
            <h1 className="font-bold text-ink text-lg font-mono sm:hidden">
              SAS DT
            </h1>

            <div className="hidden md:flex border-1 border-ink p-0.5 bg-ink ml-4">
              <button 
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase transition-all font-mono ${viewMode === 'map' ? 'bg-primary text-ink' : 'text-white hover:text-primary'}`}
              >
                <MapIcon size={12} />
                <span>Map</span>
              </button>
              <button 
                onClick={() => setViewMode('interactive')}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase transition-all font-mono ${viewMode === 'interactive' ? 'bg-primary text-ink' : 'text-white hover:text-primary'}`}
              >
                <Play size={12} />
                <span>Flow</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex md:hidden border-1 border-ink p-0.5 bg-ink mr-2">
              <button 
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase transition-all font-mono ${viewMode === 'map' ? 'bg-primary text-ink' : 'text-white hover:text-primary'}`}
              >
                <MapIcon size={12} />
              </button>
              <button 
                onClick={() => setViewMode('interactive')}
                className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase transition-all font-mono ${viewMode === 'interactive' ? 'bg-primary text-ink' : 'text-white hover:text-primary'}`}
              >
                <Play size={12} />
              </button>
            </div>

            <button onClick={handleReset} className="brutal-btn p-2 hover:bg-accent transition-colors">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setIsAboutOpen(true)} className="brutal-btn p-2 hover:bg-accent transition-colors">
              <HelpCircle size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        
        {viewMode === 'interactive' ? (
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumbs */}
            {history.length > 1 && (
              <nav className="mb-8 flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-ink/40 overflow-x-auto whitespace-nowrap pb-2">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <button 
                      onClick={() => setHistory(prev => prev.slice(0, idx + 1))}
                      className={`hover:text-ink transition-colors ${idx === breadcrumbs.length - 1 ? 'text-ink' : ''}`}
                    >
                      {crumb}
                    </button>
                    {idx < breadcrumbs.length - 1 && <i className="fa-solid fa-chevron-right text-[8px]"></i>}
                  </React.Fragment>
                ))}
              </nav>
            )}

            {/* Content View */}
            {!currentNode.result ? (
              <div className="space-y-12">
                <div className="border-l-4 border-ink pl-6 py-2">
                  {history.length > 1 && (
                    <button 
                      onClick={handleGoBack}
                      className="mb-4 flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-ink/60 hover:text-ink"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  )}
                  <h2 className="text-4xl font-bold text-ink mb-4 font-mono leading-none tracking-tighter">
                    {currentNode.question}
                  </h2>
                  {currentNode.description && (
                    <p className="text-base text-ink font-medium leading-relaxed max-w-2xl">
                      {currentNode.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentNode.options?.map((option) => (
                    <button
                      key={option.nextNodeId}
                      onClick={() => handleSelectOption(option.nextNodeId)}
                      className="group text-left p-6 bg-white border-1 border-ink shadow-brutal hover:bg-accent hover:shadow-brutal-lg transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-bold text-ink uppercase font-mono tracking-tight leading-none">
                          {option.label}
                        </h4>
                        <i className="fa-solid fa-arrow-right text-ink transform group-hover:translate-x-1 transition-transform"></i>
                      </div>
                      {option.description && (
                        <p className="text-xs text-ink/70 font-medium leading-tight">
                          {option.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Result View */
              <div className="space-y-8">
                <div className="bg-white border-1 border-ink p-8 shadow-brutal">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="bg-ink text-primary px-2 py-0.5 text-[10px] font-mono font-bold uppercase border-1 border-ink">
                      Recommendation
                    </span>
                  </div>
                  
                  <h2 className="text-4xl font-bold text-ink mb-6 font-mono tracking-tighter uppercase leading-none">
                    {currentNode.question}
                  </h2>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {currentNode.result.procedures.map(proc => (
                      <span key={proc} className="bg-primary px-3 py-1 border-1 border-ink text-ink font-mono font-bold text-xs">
                        {proc}
                      </span>
                    ))}
                  </div>

                  <div className="bg-soft border-1 border-ink p-6 flex gap-4">
                    <BookOpen size={24} className="flex-shrink-0 text-ink" />
                    <div>
                      <h4 className="font-mono font-bold text-xs uppercase mb-1">Statistical Briefing</h4>
                      <p className="text-sm text-ink font-medium italic leading-relaxed">
                        {currentNode.result.briefing}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {currentNode.result.examples.map((example, idx) => (
                    <SASCard 
                      key={idx}
                      title={example.title}
                      code={example.code}
                      description={example.description}
                      procedures={currentNode.result?.procedures || []}
                    />
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <button onClick={handleReset} className="brutal-btn-primary brutal-btn px-10 py-4 font-mono font-bold uppercase tracking-tight text-ink flex items-center gap-3">
                    <RotateCcw size={20} />
                    New Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Enhanced Full Map View (Tldraw) */
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-6 border-l-4 border-ink pl-6">
              <h2 className="text-4xl font-bold text-ink mb-2 font-mono tracking-tighter uppercase">Hierarchical Map</h2>
              <p className="text-ink/60 font-mono font-bold text-xs uppercase">Visualized Logic Paths & Decision Nodes (Infinite Canvas)</p>
            </div>
            
            <TldrawMapView
              data={TREE_DATA}
              onNodeClick={handleJumpToNode}
              selectedNodeId={currentNodeId}
            />
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-soft border-1 border-ink p-4 shadow-brutal font-mono">
                <h5 className="font-bold text-[10px] uppercase mb-2">Map Controls</h5>
                <p className="text-[9px] text-ink/70">Click nodes to jump. Drag empty space to pan. Mouse wheel to zoom.</p>
              </div>
              <div className="bg-white border-1 border-ink p-4 shadow-brutal font-mono">
                <h5 className="font-bold text-[10px] uppercase mb-2">Logic flow</h5>
                <p className="text-[9px] text-ink/70">The tree flows from top-level Objectives to Outcome Types, then specifically branches into Longitudinal or Cross-sectional designs.</p>
              </div>
              <div className="bg-primary border-1 border-ink p-4 shadow-brutal font-mono">
                <h5 className="font-bold text-[10px] uppercase mb-2">Analysis types</h5>
                <p className="text-[9px] text-ink/70">Continuous outcomes focus on Means; Binary/Count on Proportions and Rates; Time-to-Event on Hazard Ratios.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Chat Panel */}
      <ChatPanel 
        currentNode={currentNode} 
        history={history} 
        breadcrumbs={breadcrumbs} 
      />

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setIsAboutOpen(false)} />
          <div className="bg-white border-1 border-ink p-10 max-w-xl relative z-10 shadow-brutal-lg">
            <h3 className="text-2xl font-bold text-ink mb-6 font-mono uppercase tracking-tighter">Decision Algorithm</h3>
            <ul className="space-y-4 mb-8">
              {[
                "Categorize Endpoint Type (Cont, Bin, TTE)",
                "Identify Experimental Design (Repeated vs Single)",
                "Evaluate Statistical Assumptions (Normality, Variance)",
                "Select Optimal SAS Syntax Pattern"
              ].map((step, i) => (
                <li key={i} className="flex gap-4 font-mono text-xs uppercase font-bold text-ink">
                  <span className="bg-primary px-1.5 py-0.5 border-1 border-ink h-fit">{i+1}</span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ul>
            <div className="p-5 bg-soft border-1 border-ink text-[11px] text-ink font-bold uppercase tracking-wide flex gap-4">
              <i className="fa-solid fa-circle-exclamation text-base"></i>
              <p>Verify all choices against your specific Statistical Analysis Plan (SAP) before production execution.</p>
            </div>
            <button 
              onClick={() => setIsAboutOpen(false)}
              className="mt-8 w-full py-4 brutal-btn-primary brutal-btn font-mono font-bold uppercase text-ink"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t-1 border-ink py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 font-mono font-bold text-ink uppercase text-xs">
            <FileText size={16} />
            Trial-Stats Decision Engine v1.0
          </div>
          <div className="flex gap-10 font-mono font-bold text-[10px] uppercase text-ink/60">
            <a href="#" className="hover:text-ink">SAS Docs</a>
            <a href="#" className="hover:text-ink">FDA Guidelines</a>
            <a href="#" className="hover:text-ink">Expert Review</a>
          </div>
          <p className="font-mono font-bold text-[10px] uppercase text-ink/40">Ink & Paper Design</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
