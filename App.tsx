
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
  calculateArrowBend,
  getArrowStyle,
  DEFAULT_LAYOUT,
  LayoutNode
} from './utils/treeLayout';

// --- Tldraw Map Component ---

// Maximum depth to render in the map view
// Level 1: START ("What's your question?")
// Level 2: COMPARE GROUPS | DESCRIBE/EXPLORE (separate nodes)
// Level 3: Continuous, Binary, Count, Time-to-Event, Ordinal (the 5 outcome branches)
// Level 4+: Deeper branches (time point, group count, etc.)
//
// Note: describe_explore is a result node (leaf) at Level 2
const MAX_MAP_DEPTH = 4;

interface TldrawMapViewProps {
  data: TreeData;
  onNodeClick: (id: string) => void;
}

const TldrawMapView: React.FC<TldrawMapViewProps> = ({ data, onNodeClick }) => {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const [currentTool, setCurrentTool] = useState<string>('select');

  const handleMount = (editor: Editor) => {
    // Store editor reference
    editorRef.current = editor;

    // Track tool changes
    const handleToolChange = () => {
      const toolId = editor.getCurrentToolId();
      setCurrentTool(toolId);
    };

    editor.on('event', handleToolChange);
    handleToolChange(); // Set initial tool
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
      fill: string = 'none'
    ) => {
      const shapeId = makeId(id);
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
          dash: 'solid',
          size: 'm',
          font: 'mono',
          text,
          align: 'middle',
          verticalAlign: 'middle',
        },
        meta: {
          nodeId: id
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
      totalSiblings: number
    ): void => {
      const startNode = shapes.find(s => s.id === startId);
      const endNode = shapes.find(s => s.id === endId);

      if (!startNode || !endNode) {
        return;
      }

      // Calculate connection points (centers)
      const parentCenterX = startNode.x + startNode.props.w / 2;
      const parentBottomY = startNode.y + startNode.props.h;
      const childCenterX = endNode.x + endNode.props.w / 2;
      const childTopY = endNode.y;

      // Midpoint Y position (40% of the gap)
      const midGap = DEFAULT_LAYOUT.yGap * 0.4;
      const midY = parentBottomY + midGap;

      // Get arrow style based on level
      const style = getArrowStyle(level);

      // Create unique base ID for this edge
      const baseId = `edge-${startId.id || startId}-${endId.id || endId}`;

      // Create 3 line segments for orthogonal path:
      // 1. Vertical line from parent bottom to midpoint
      shapes.push({
        id: createShapeId(`${baseId}-v1`),
        type: 'arrow',
        props: {
          start: { x: parentCenterX, y: parentBottomY },
          end: { x: parentCenterX, y: midY },
          bend: 0,
          color: style.color,
          size: 's',
          dash: style.dash,
          arrowheadStart: 'none',
          arrowheadEnd: 'none',
        },
      });

      // 2. Horizontal line from parent X to child X at midpoint
      shapes.push({
        id: createShapeId(`${baseId}-h`),
        type: 'arrow',
        props: {
          start: { x: parentCenterX, y: midY },
          end: { x: childCenterX, y: midY },
          bend: 0,
          color: style.color,
          size: 's',
          dash: style.dash,
          arrowheadStart: 'none',
          arrowheadEnd: 'none',
          text: label || '',
          font: 'mono',
        },
      });

      // 3. Vertical line from midpoint to child top (with arrowhead)
      shapes.push({
        id: createShapeId(`${baseId}-v2`),
        type: 'arrow',
        props: {
          start: { x: childCenterX, y: midY },
          end: { x: childCenterX, y: childTopY },
          bend: 0,
          color: style.color,
          size: 's',
          dash: style.dash,
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
        },
      });
    };

    // --- 4. Recursive function to create nodes from layout ---
    const createNodesFromLayout = (layoutNode: LayoutNode, maxDepth: number = MAX_MAP_DEPTH): void => {
      // Determine node color and fill based on node ID and layer
      // Layer 1: start (black, solid)
      // Layer 2: compare_groups (blue, solid), describe_explore (green, solid - result node)
      // Layer 3: 5 outcome branches (violet, semi)
      let color = 'grey';
      let fill = 'none';

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

      // Get node text from TREE_DATA
      const nodeText = data[layoutNode.id]?.question || layoutNode.id;

      // Create the node shape
      const nodeId = createNode(
        layoutNode.id,
        nodeText,
        layoutNode.x,
        layoutNode.y,
        color,
        fill
      );

      // STOP RECURSION at max depth - don't create children beyond this level
      if (layoutNode.level >= maxDepth) {
        return;
      }

      // Recursively create children and arrows
      layoutNode.children.forEach((child, index) => {
        // Create child node first (with maxDepth parameter)
        createNodesFromLayout(child, maxDepth);

        // Create curved arrow to child
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
          layoutNode.children.length
        );
      });
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

    // Create all nodes and arrows from layout
    createNodesFromLayout(layout);

    // --- 6. Render to canvas ---
    editor.createShapes(shapes);

    // Zoom to fit with improved timing and insets
    setTimeout(() => {
      editor.zoomToFit({
        animation: { duration: 200 },
        insets: { top: 50, right: 50, bottom: 50, left: 50 }
      });
    }, 100);

    // --- 7. Interaction handlers ---
    editor.on('event', (e) => {
      if (e.name === 'pointer_up') {
        const selected = editor.getSelectedShapes();
        if (selected.length === 1) {
          const shape = selected[0] as any;
          if (shape.meta && shape.meta.nodeId) {
            onNodeClick(shape.meta.nodeId);
          }
        }
      }
    });
  };

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
    <div className="w-full h-[700px] border-2 border-ink shadow-brutal bg-white relative">
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
            
            <TldrawMapView data={TREE_DATA} onNodeClick={handleJumpToNode} />
            
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
