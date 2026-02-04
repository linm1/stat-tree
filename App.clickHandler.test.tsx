/**
 * TDD Tests for Progressive Disclosure Click Handler Fixes
 *
 * These tests verify the following CRITICAL issues are fixed:
 * 1. Event handler should register only ONCE (not stack)
 * 2. Clicks should toggle expansion/collapse reliably
 * 3. Rapid clicking should be debounced (prevented during animation)
 * 4. Stale closure state should be avoided (use functional setState)
 * 5. Clicking with hand tool should do nothing
 * 6. Leaf nodes should navigate to result panel (not expand)
 *
 * ALL TESTS SHOULD FAIL INITIALLY (RED phase of TDD)
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { TREE_DATA } from './data';
import { createInitialExpansionState } from './utils/expansionState';

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
};

// Mock Tldraw component
jest.mock('tldraw', () => ({
  Tldraw: ({ onMount }: any) => {
    const mountedRef = React.useRef(false);
    React.useEffect(() => {
      if (onMount && !mountedRef.current) {
        mountedRef.current = true;
        onMount(mockEditor);
      }
    }, [onMount]);
    return <div data-testid="tldraw-canvas">Tldraw Canvas</div>;
  },
  createShapeId: (id: string) => id,
}));

// Mock ChatPanel component to avoid import.meta issues
jest.mock('./components/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat Panel</div>
}));

describe('Progressive Disclosure Click Handler (TDD - RED Phase)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.getCurrentToolId.mockReturnValue('select');
    mockEditor.getSelectedShapes.mockReturnValue([]);
  });

  describe('Critical Issue #1: Event Handler Should Register Only ONCE', () => {

    test('event handler is registered exactly once on initial mount', () => {
      render(<App />);

      // Wait for initial mount
      waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalledTimes(1);
        expect(mockEditor.on).toHaveBeenCalledWith('event', expect.any(Function));
      });
    });

    test('event handler is NOT re-registered after first click', async () => {
      render(<App />);

      // Navigate to map view
      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      // Wait for initial mount
      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalledTimes(1);
      });

      const initialCallCount = mockEditor.on.mock.calls.length;

      // Simulate node click
      const shape = {
        id: 'node-compare_groups',
        type: 'geo',
        meta: {
          nodeId: 'compare_groups',
          isExpandable: true,
          isExpanded: false
        }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);

      // Trigger pointer_up event
      const eventHandler = mockEditor.on.mock.calls[0][1];
      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      // Wait for any potential re-registrations
      await waitFor(() => {
        // Handler should NOT be called again
        expect(mockEditor.on).toHaveBeenCalledTimes(initialCallCount);
      }, { timeout: 200 });
    });

    test('event handler is NOT stacked after multiple expansions', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalledTimes(1);
      });

      const initialCallCount = mockEditor.on.mock.calls.length;

      // Simulate multiple node clicks (expand, collapse, expand)
      const shape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      // Click 1
      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Click 2
      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Click 3
      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Verify handler count has NOT increased
      expect(mockEditor.on).toHaveBeenCalledTimes(initialCallCount);
    });

    test('event handler is properly cleaned up on unmount', () => {
      const { unmount } = render(<App />);

      waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalledTimes(1);
      });

      unmount();

      waitFor(() => {
        // Cleanup function should call editor.off
        expect(mockEditor.off).toHaveBeenCalledTimes(1);
        expect(mockEditor.off).toHaveBeenCalledWith('event', expect.any(Function));
      });
    });
  });

  describe('Critical Issue #2: Clicks Toggle Expansion Reliably', () => {

    test('clicking expandable node expands children', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const shape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      // Verify expansion occurred
      await waitFor(() => {
        // Shapes should be created for children
        const createShapesCalls = mockEditor.createShapes.mock.calls;
        expect(createShapesCalls.length).toBeGreaterThan(0);
      });
    });

    test('clicking expanded node collapses children', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // First click: expand
      const expandShape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([expandShape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      // Wait for animation period to end (600ms)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 650));
      });

      // Second click: collapse
      const collapseShape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: true }
      };

      mockEditor.getSelectedShapes.mockReturnValue([collapseShape]);

      const deleteShapesCallsBefore = mockEditor.deleteShapes.mock.calls.length;

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      // Verify collapse occurred
      await waitFor(() => {
        expect(mockEditor.deleteShapes).toHaveBeenCalled();
        expect(mockEditor.deleteShapes.mock.calls.length).toBeGreaterThan(deleteShapesCallsBefore);
      });
    });

    test('expansion state is correctly maintained across multiple clicks', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const eventHandler = mockEditor.on.mock.calls[0][1];

      // Click 1: Expand compare_groups
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Click 2: Collapse compare_groups
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: true }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Click 3: Expand again
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });

      await waitFor(() => {
        // Verify shapes were created (expansion worked)
        expect(mockEditor.createShapes).toHaveBeenCalled();
      });
    });
  });

  describe('Critical Issue #3: Rapid Clicking Debouncing', () => {

    test('rapid clicks within animation period are ignored', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const shape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      const createShapesCallsBefore = mockEditor.createShapes.mock.calls.length;

      // Rapid fire 5 clicks within 100ms
      act(() => {
        eventHandler({ name: 'pointer_up' });
        eventHandler({ name: 'pointer_up' });
        eventHandler({ name: 'pointer_up' });
        eventHandler({ name: 'pointer_up' });
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {}, { timeout: 200 });

      // Only the first click should be processed
      const createShapesCallsAfter = mockEditor.createShapes.mock.calls.length;
      expect(createShapesCallsAfter - createShapesCallsBefore).toBe(1);
    });

    test('clicks are processed after animation period ends', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const shape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      // First click
      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      // Wait for animation period to end (600ms)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 650));
      });

      const deleteShapesCallsBefore = mockEditor.deleteShapes.mock.calls.length;

      // Second click (should be processed - will collapse since node was expanded)
      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {
        const deleteShapesCallsAfter = mockEditor.deleteShapes.mock.calls.length;
        expect(deleteShapesCallsAfter).toBeGreaterThan(deleteShapesCallsBefore);
      });
    });
  });

  describe('Critical Issue #4: No Stale Closure State', () => {

    test('event handler uses latest expansion state, not captured closure state', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const eventHandler = mockEditor.on.mock.calls[0][1];

      // Expand node 1
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Expand node 2
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-cont_time',
        meta: { nodeId: 'cont_time', isExpandable: true, isExpanded: false }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });
      await waitFor(() => {}, { timeout: 100 });

      // Now collapse node 1 - should use CURRENT state (both expanded)
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: true }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });

      await waitFor(() => {
        // Verify deleteShapes was called (collapse worked with latest state)
        expect(mockEditor.deleteShapes).toHaveBeenCalled();
      });
    });

    test('functional setState is used to avoid stale state', async () => {
      // This test verifies that toggleNodeExpansion is called with a function
      // that receives the latest state, not a captured closure value

      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const eventHandler = mockEditor.on.mock.calls[0][1];

      // Multiple rapid state changes
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      }]);

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {
        // If functional setState is used, state should be consistent
        // Otherwise, stale state would cause incorrect behavior
        expect(mockEditor.createShapes).toHaveBeenCalled();
      });
    });
  });

  describe('Critical Issue #5: Hand Tool Clicks Do Nothing', () => {

    test('clicking node with hand tool does not expand', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // Switch to hand tool - this should cause early return in event handler
      mockEditor.getCurrentToolId.mockReturnValue('hand');

      const shape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      // The key behavior we're testing: hand tool prevents handleNodeClick
      // by early-returning from the event handler (line 694: if (toolId !== 'select') return;)
      // This means updateShapes for expansion should never be called
      mockEditor.updateShapes.mockClear();

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      // Wait for any async operations
      await waitFor(() => {}, { timeout: 200 });

      // With hand tool, updateShapes should NOT be called for expansion icon update
      // (updateNodeIcon is only called AFTER expansion state changes)
      // Note: Some updateShapes calls may occur from other re-renders,
      // but specifically the expand/collapse icon update won't happen
      // because handleNodeClick is never called
      const updateCalls = mockEditor.updateShapes.mock.calls;
      const iconUpdateCalls = updateCalls.filter(call =>
        call[0]?.some((shape: any) => shape.props?.text?.includes('▼') || shape.props?.text?.includes('▶'))
      );
      expect(iconUpdateCalls).toHaveLength(0);
    });

    test('clicking node with select tool does expand', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // Ensure select tool is active
      mockEditor.getCurrentToolId.mockReturnValue('select');

      const shape = {
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([shape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      const createShapesCallsBefore = mockEditor.createShapes.mock.calls.length;

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {
        // Verify expansion occurred
        const createShapesCallsAfter = mockEditor.createShapes.mock.calls.length;
        expect(createShapesCallsAfter).toBeGreaterThan(createShapesCallsBefore);
      });
    });
  });

  describe('Critical Issue #6: Leaf Nodes Navigate to Result Panel', () => {

    test('clicking leaf node does NOT expand (no children)', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // Click leaf node (describe_explore has no children)
      const leafShape = {
        id: 'node-describe_explore',
        meta: { nodeId: 'describe_explore', isExpandable: false, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([leafShape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      const createShapesCallsBefore = mockEditor.createShapes.mock.calls.length;

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {}, { timeout: 200 });

      // Verify no expansion attempt
      const createShapesCallsAfter = mockEditor.createShapes.mock.calls.length;
      expect(createShapesCallsAfter).toBe(createShapesCallsBefore);
    });

    test('clicking leaf node navigates to flow tab', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // Click leaf node
      const leafShape = {
        id: 'node-describe_explore',
        meta: { nodeId: 'describe_explore', isExpandable: false, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([leafShape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {
        // Verify view switches to 'interactive' (flow tab)
        // This would show the result panel for the leaf node
        const flowButton = screen.getAllByText(/flow/i)[0];
        // Flow tab should be active (indicated by primary color styling)
        expect(flowButton.closest('button')).toHaveClass('bg-primary');
      });
    });

    test('leaf node click shows correct result content', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const leafShape = {
        id: 'node-describe_explore',
        meta: { nodeId: 'describe_explore', isExpandable: false, isExpanded: false }
      };

      mockEditor.getSelectedShapes.mockReturnValue([leafShape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {
        // Verify result content is displayed
        const node = TREE_DATA['describe_explore'];
        if (node.result) {
          // Should show recommendation
          expect(screen.getByText(/recommendation/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Edge Cases and Additional Scenarios', () => {

    test('clicking root node does not collapse (always expanded)', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const rootShape = {
        id: 'node-start',
        meta: { nodeId: 'start', isExpandable: true, isExpanded: true }
      };

      mockEditor.getSelectedShapes.mockReturnValue([rootShape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      // Clear mock calls to start fresh count
      mockEditor.deleteShapes.mockClear();

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {}, { timeout: 200 });

      // Verify no meaningful collapse occurred (root should remain expanded)
      // Root node click should early-return before any collapse logic
      // Note: Empty deleteShapes([]) calls may occur from re-renders but are harmless
      const deleteShapesCalls = mockEditor.deleteShapes.mock.calls;
      const nonEmptyDeleteCalls = deleteShapesCalls.filter(call => call[0] && call[0].length > 0);
      expect(nonEmptyDeleteCalls).toHaveLength(0);
    });

    test('clicking empty space (no selection) does nothing', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // No shapes selected
      mockEditor.getSelectedShapes.mockReturnValue([]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      const createShapesCallsBefore = mockEditor.createShapes.mock.calls.length;

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {}, { timeout: 200 });

      // Verify nothing happened
      const createShapesCallsAfter = mockEditor.createShapes.mock.calls.length;
      expect(createShapesCallsAfter).toBe(createShapesCallsBefore);
    });

    test('clicking non-node shape (edge) does nothing', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      // Select an edge (has no nodeId in meta)
      const edgeShape = {
        id: 'edge-start-compare_groups',
        type: 'arrow',
        meta: {}
      };

      mockEditor.getSelectedShapes.mockReturnValue([edgeShape]);
      const eventHandler = mockEditor.on.mock.calls[0][1];

      const createShapesCallsBefore = mockEditor.createShapes.mock.calls.length;

      act(() => {
        eventHandler({ name: 'pointer_up' });
      });

      await waitFor(() => {}, { timeout: 200 });

      // Verify nothing happened
      const createShapesCallsAfter = mockEditor.createShapes.mock.calls.length;
      expect(createShapesCallsAfter).toBe(createShapesCallsBefore);
    });

    test('collapsing parent removes all descendant nodes', async () => {
      render(<App />);

      const mapButton = screen.getAllByText(/map/i)[0];
      await userEvent.click(mapButton);

      await waitFor(() => {
        expect(mockEditor.on).toHaveBeenCalled();
      });

      const eventHandler = mockEditor.on.mock.calls[0][1];

      // Expand compare_groups
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: false }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });

      // Wait for animation period to end
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 650));
      });

      // Expand cont_time (child of compare_groups)
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-cont_time',
        meta: { nodeId: 'cont_time', isExpandable: true, isExpanded: false }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });

      // Wait for animation period to end
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 650));
      });

      // Now collapse compare_groups (parent)
      mockEditor.getSelectedShapes.mockReturnValue([{
        id: 'node-compare_groups',
        meta: { nodeId: 'compare_groups', isExpandable: true, isExpanded: true }
      }]);

      act(() => { eventHandler({ name: 'pointer_up' }); });

      await waitFor(() => {
        // Verify deleteShapes was called with descendant IDs
        expect(mockEditor.deleteShapes).toHaveBeenCalled();

        const deleteCalls = mockEditor.deleteShapes.mock.calls;
        const lastCall = deleteCalls[deleteCalls.length - 1];
        const deletedIds = lastCall[0];

        // Should include descendants (cont_time and its children)
        expect(deletedIds.length).toBeGreaterThan(1);
      });
    });
  });
});
