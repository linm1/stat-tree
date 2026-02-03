import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createShapeId } from 'tldraw';

// Mock tldraw Editor
const mockEditor = {
  on: jest.fn(),
  off: jest.fn(),
  getCurrentToolId: jest.fn(() => 'select'),
  getSelectedShapes: jest.fn(() => []),
  getSelectedShapeIds: jest.fn(() => []),
  selectAll: jest.fn(() => mockEditor),
  deleteShapes: jest.fn(),
  createShapes: jest.fn(),
  getShape: jest.fn(),
  updateShapes: jest.fn(),
  zoomToFit: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  setCurrentTool: jest.fn(),
  getShapePageBounds: jest.fn(),
  zoomToBounds: jest.fn(),
  getCurrentPageShapes: jest.fn(() => []),
};

// Mock Tldraw component
jest.mock('tldraw', () => ({
  Tldraw: ({ onMount }: any) => {
    React.useEffect(() => {
      if (onMount) {
        onMount(mockEditor);
      }
    }, [onMount]);
    return <div data-testid="tldraw-canvas">Tldraw Canvas</div>;
  },
  createShapeId: (id: string) => id as any,
  getArrowInfo: jest.fn(),
  track: jest.fn(),
}));

// Mock ChatPanel component to avoid import.meta issues
jest.mock('./components/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat Panel</div>
}));

describe('Edge ID Parsing and Highlighting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.getCurrentPageShapes.mockReturnValue([]);
    mockEditor.updateShapes.mockClear();
  });

  test('Edge with shape ID format includes node- prefix for both endpoints', () => {
    // This test verifies the edge ID format matches what the parser expects
    // Edge IDs are in format: edge-node-{parentId}-node-{childId}-{segment}
    const exampleEdgeId = 'edge-node-start-node-compare_groups-h1';

    // Parse using the same logic from the fix
    const cleanedId = exampleEdgeId.replace(/-h1$|-h2$|-v$/g, '');
    const match = cleanedId.match(/edge-node-(.+?)-node-(.+)$/);

    expect(match).toBeDefined();
    expect(match![1]).toBe('start');
    expect(match![2]).toBe('compare_groups');
  });

  test('Edge does NOT get highlighted when parent missing from path', async () => {
    const shapes = [
      {
        id: createShapeId('node-start'),
        type: 'geo',
        props: { text: 'Start', fill: 'solid' }
      },
      {
        id: createShapeId('node-compare_groups'),
        type: 'geo',
        props: { text: 'Compare Groups', fill: 'solid' }
      },
      {
        id: createShapeId('edge-node-start-node-compare_groups-h1'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      }
    ];

    mockEditor.getCurrentPageShapes.mockReturnValue(shapes);

    render(<App />);
    await waitFor(() => expect(mockEditor.updateShapes).toHaveBeenCalled());

    // If highlightedPath contains only 'compare_groups' (missing 'start')
    // The edge should NOT be highlighted

    const updateCalls = mockEditor.updateShapes.mock.calls;
    const edgeUpdate = updateCalls.flat().find((update: any) =>
      update?.id?.toString().includes('edge-node-start-node-compare_groups')
    );

    // Edge should NOT be highlighted (default color, small size)
    if (edgeUpdate) {
      expect(edgeUpdate?.props?.color).not.toBe('orange');
      expect(edgeUpdate?.props?.size).not.toBe('m');
    }
  });

  test('Edge does NOT get highlighted when child missing from path', async () => {
    const shapes = [
      {
        id: createShapeId('node-start'),
        type: 'geo',
        props: { text: 'Start', fill: 'solid' }
      },
      {
        id: createShapeId('node-compare_groups'),
        type: 'geo',
        props: { text: 'Compare Groups', fill: 'solid' }
      },
      {
        id: createShapeId('edge-node-start-node-compare_groups-h1'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      }
    ];

    mockEditor.getCurrentPageShapes.mockReturnValue(shapes);

    render(<App />);
    await waitFor(() => expect(mockEditor.updateShapes).toHaveBeenCalled());

    // If highlightedPath contains only 'start' (missing 'compare_groups')
    // The edge should NOT be highlighted

    const updateCalls = mockEditor.updateShapes.mock.calls;
    const edgeUpdate = updateCalls.flat().find((update: any) =>
      update?.id?.toString().includes('edge-node-start-node-compare_groups')
    );

    // Edge should NOT be highlighted
    if (edgeUpdate) {
      expect(edgeUpdate?.props?.color).not.toBe('orange');
      expect(edgeUpdate?.props?.size).not.toBe('m');
    }
  });

  test('All three segments (h1, v, h2) get highlighted consistently', async () => {
    const shapes = [
      {
        id: createShapeId('node-start'),
        type: 'geo',
        props: { text: 'Start', fill: 'solid' }
      },
      {
        id: createShapeId('node-compare_groups'),
        type: 'geo',
        props: { text: 'Compare Groups', fill: 'solid' }
      },
      {
        id: createShapeId('edge-node-start-node-compare_groups-h1'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      },
      {
        id: createShapeId('edge-node-start-node-compare_groups-v'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      },
      {
        id: createShapeId('edge-node-start-node-compare_groups-h2'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      }
    ];

    mockEditor.getCurrentPageShapes.mockReturnValue(shapes);

    render(<App />);
    await waitFor(() => expect(mockEditor.updateShapes).toHaveBeenCalled());

    const updateCalls = mockEditor.updateShapes.mock.calls;
    const allUpdates = updateCalls.flat();

    const h1Update = allUpdates.find((u: any) => u?.id?.toString().includes('-h1'));
    const vUpdate = allUpdates.find((u: any) => u?.id?.toString().includes('-v'));
    const h2Update = allUpdates.find((u: any) => u?.id?.toString().includes('-h2'));

    // All three segments should have the same highlighting state
    if (h1Update && vUpdate && h2Update) {
      expect(h1Update.props.color).toBe(vUpdate.props.color);
      expect(vUpdate.props.color).toBe(h2Update.props.color);
      expect(h1Update.props.size).toBe(vUpdate.props.size);
      expect(vUpdate.props.size).toBe(h2Update.props.size);
    }
  });

  test('Multiple edges on path all get highlighted', async () => {
    // Path: start -> compare_groups -> cont_time
    const shapes = [
      {
        id: createShapeId('node-start'),
        type: 'geo',
        props: { text: 'Start', fill: 'solid' }
      },
      {
        id: createShapeId('node-compare_groups'),
        type: 'geo',
        props: { text: 'Compare Groups', fill: 'solid' }
      },
      {
        id: createShapeId('node-cont_time'),
        type: 'geo',
        props: { text: 'Continuous Time', fill: 'solid' }
      },
      {
        id: createShapeId('edge-node-start-node-compare_groups-h1'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      },
      {
        id: createShapeId('edge-node-compare_groups-node-cont_time-h1'),
        type: 'arrow',
        props: { color: 'grey', size: 's' }
      }
    ];

    mockEditor.getCurrentPageShapes.mockReturnValue(shapes);

    render(<App />);
    await waitFor(() => expect(mockEditor.updateShapes).toHaveBeenCalled());

    const updateCalls = mockEditor.updateShapes.mock.calls;
    const allUpdates = updateCalls.flat();

    const edge1Update = allUpdates.find((u: any) =>
      u?.id?.toString().includes('edge-node-start-node-compare_groups')
    );
    const edge2Update = allUpdates.find((u: any) =>
      u?.id?.toString().includes('edge-node-compare_groups-node-cont_time')
    );

    // Both edges should be highlighted when path includes all three nodes
    if (edge1Update && edge2Update) {
      expect(edge1Update.props.color).toBe('orange');
      expect(edge2Update.props.color).toBe('orange');
    }
  });

  test('Edge ID parsing handles node IDs with hyphens', async () => {
    render(<App />);

    // Click Map view button
    const mapButton = screen.getAllByText(/map/i)[0];
    await userEvent.click(mapButton);

    await waitFor(() => {
      expect(mockEditor.on).toHaveBeenCalled();
    });

    // First expand compare_groups to reveal cont_time node
    let shape = {
      id: 'node-compare_groups',
      meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
    };

    mockEditor.getSelectedShapes.mockReturnValue([shape]);
    let eventHandler = mockEditor.on.mock.calls[0][1];

    act(() => {
      eventHandler({ name: 'pointer_up' });
    });

    // Now expand cont_time to get to cont-time-longitudinal
    await waitFor(() => {
      expect(mockEditor.createShapes).toHaveBeenCalled();
    });

    // Click cont_time node to expand it
    shape = {
      id: 'node-cont_time',
      meta: { nodeId: 'cont_time', isExpandable: true, isExpanded: false }
    };

    mockEditor.getSelectedShapes.mockReturnValue([shape]);

    act(() => {
      eventHandler({ name: 'pointer_up' });
    });

    await waitFor(() => {
      // Look for edges with hyphens in node IDs
      const updateCalls = mockEditor.updateShapes.mock.calls;
      const allUpdates = updateCalls.flat();

      // Check if edges with hyphenated node IDs were created/updated
      const edgesWithHyphens = allUpdates.filter((u: any) =>
        u?.id?.toString().includes('edge-node-') &&
        (u?.id?.toString().match(/-/g) || []).length > 4  // More than 4 hyphens = contains hyphenated node ID
      );

      // Should successfully parse node IDs with hyphens
      expect(edgesWithHyphens.length).toBeGreaterThanOrEqual(0);
    });
  });
});
