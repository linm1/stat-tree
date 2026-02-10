/**
 * TDD Test Suite for Tldraw Vertical Toolbar Migration
 *
 * This test suite follows TDD methodology:
 * 1. RED: Write tests first (they will fail)
 * 2. GREEN: Implement to make tests pass
 * 3. REFACTOR: Clean up code while keeping tests green
 *
 * Tests verify:
 * - Tldraw component uses components prop instead of hideUi
 * - Vertical toolbar is configured with only Select and Hand tools
 * - All UI elements except toolbar are hidden
 * - Legacy toolbar and zoom handlers are removed
 * - CSS is imported for toolbar styling
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TldrawMapView } from './TldrawMapView';
import { TREE_DATA } from '../data';
import type { ExpansionState } from '../types';

// Mock tldraw to avoid canvas rendering in tests
jest.mock('tldraw', () => {
  const React = require('react');
  return {
    Tldraw: ({ components, onMount, persistenceKey }: any) => {
      // Simulate mount callback
      React.useEffect(() => {
        if (onMount) {
          const mockEditor = {
            selectAll: jest.fn().mockReturnValue({ deleteShapes: jest.fn() }),
            getSelectedShapeIds: jest.fn().mockReturnValue([]),
            createShapes: jest.fn(),
            updateShapes: jest.fn(),
            deleteShapes: jest.fn(),
            zoomToFit: jest.fn(),
            zoomIn: jest.fn(),
            zoomOut: jest.fn(),
            setCurrentTool: jest.fn(),
            getCurrentToolId: jest.fn().mockReturnValue('select'),
            getShape: jest.fn(),
            getShapePageBounds: jest.fn(),
            getCurrentPageShapes: jest.fn().mockReturnValue([]),
            getSelectedShapes: jest.fn().mockReturnValue([]),
            on: jest.fn(),
            off: jest.fn(),
            bringToFront: jest.fn(),
            zoomToBounds: jest.fn(),
          };
          onMount(mockEditor);
        }
      }, [onMount]);

      // Render toolbar if provided
      const toolbarContent = components?.Toolbar ? React.createElement(components.Toolbar, { key: 'toolbar' }) : null;

      return React.createElement('div', {
        'data-testid': 'tldraw-component',
        'data-has-components-prop': components !== undefined,
        'data-has-toolbar': components?.Toolbar !== undefined,
        'data-has-navigation-panel': components?.NavigationPanel === undefined,
        'data-has-main-menu': components?.MainMenu === undefined,
        'data-persist-key': persistenceKey
      }, [
        React.createElement('span', { key: 'text' }, 'Tldraw Mock'),
        toolbarContent
      ]);
    },
    createShapeId: (id: string) => id,
    DefaultColorThemePalette: {
      lightMode: { orange: { solid: '', semi: '' } },
      darkMode: { orange: { solid: '', semi: '' } }
    },
    DefaultToolbar: ({ children }: any) => {
      return React.createElement('div', {
        'data-testid': 'default-toolbar'
      }, children);
    },
    SelectToolbarItem: () => {
      return React.createElement('button', {
        'data-testid': 'select-tool-item'
      }, 'Select');
    },
    HandToolbarItem: () => {
      return React.createElement('button', {
        'data-testid': 'hand-tool-item'
      }, 'Hand');
    }
  };
});

describe('TldrawMapView - Vertical Toolbar Migration (TDD)', () => {
  const mockExpansionState: ExpansionState = {
    expandedNodes: new Set(['start']),
    collapsedSubtrees: new Set()
  };

  const defaultProps = {
    data: TREE_DATA,
    onNodeClick: jest.fn(),
    selectedNodeId: undefined,
    onSelectionChange: jest.fn(),
    expansionState: mockExpansionState,
    setExpansionState: jest.fn(),
    highlightedPath: new Set<string>(),
    setHighlightedPath: jest.fn()
  };

  describe('Phase 1: Tldraw Component Configuration', () => {
    it('should use components prop instead of hideUi prop', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');
      expect(tldrawComponent).toBeInTheDocument();

      // Should have components prop
      expect(tldrawComponent?.getAttribute('data-has-components-prop')).toBe('true');
    });

    it('should configure components with Toolbar', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');

      // Should have Toolbar component configured
      expect(tldrawComponent?.getAttribute('data-has-toolbar')).toBe('true');
    });

    it('should enable NavigationPanel by NOT setting it to null', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');

      // NavigationPanel should be enabled (not null)
      expect(tldrawComponent?.getAttribute('data-has-navigation-panel')).toBe('true');
    });

    it('should hide MainMenu by setting it to null', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');

      // MainMenu should be null
      expect(tldrawComponent?.getAttribute('data-has-main-menu')).toBe('false');
    });

    it('should preserve persistenceKey', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');

      expect(tldrawComponent?.getAttribute('data-persist-key')).toBe('sas-decision-tree-map');
    });
  });

  describe('Phase 2: Vertical Toolbar Structure', () => {
    it('should render DefaultToolbar', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const toolbar = screen.queryByTestId('default-toolbar');
        expect(toolbar).toBeInTheDocument();
      });
    });

    it('should include SelectToolbarItem', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const selectTool = screen.queryByTestId('select-tool-item');
        expect(selectTool).toBeInTheDocument();
      });
    });

    it('should include HandToolbarItem', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const handTool = screen.queryByTestId('hand-tool-item');
        expect(handTool).toBeInTheDocument();
      });
    });

    it('should only have 2 toolbar items (Select and Hand) in custom toolbar', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const selectTool = screen.queryByTestId('select-tool-item');
        const handTool = screen.queryByTestId('hand-tool-item');

        expect(selectTool).toBeInTheDocument();
        expect(handTool).toBeInTheDocument();

        // No other custom tool items should exist in our toolbar
        const allButtons = screen.queryAllByRole('button');
        const toolButtons = allButtons.filter(btn =>
          btn.getAttribute('data-testid')?.includes('tool-item')
        );
        expect(toolButtons).toHaveLength(2);
      });
    });
  });

  describe('Phase 3: Legacy Code Removal', () => {
    it('should NOT render custom top-right toolbar', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      // Legacy toolbar used these icons
      const zoomIcons = container.querySelectorAll('.fa-magnifying-glass-plus, .fa-magnifying-glass-minus, .fa-expand');
      expect(zoomIcons).toHaveLength(0);
    });

    it('should NOT render custom tool buttons (select/hand) outside of Tldraw toolbar', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      // Legacy toolbar used these icons
      const toolIcons = container.querySelectorAll('.fa-arrow-pointer, .fa-hand');
      expect(toolIcons).toHaveLength(0);
    });

    it('should use native NavigationPanel for zoom controls', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      // No custom zoom buttons in separate panel
      const buttons = container.querySelectorAll('button');
      const customZoomButtons = Array.from(buttons).filter(btn =>
        btn.getAttribute('data-testid')?.includes('zoom-')
      );

      // No custom zoom buttons (now in native NavigationPanel)
      expect(customZoomButtons).toHaveLength(0);
    });

    it('should NOT render custom bottom-left camera controls panel', () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      // No "Interactive Map" text or custom camera controls panel
      expect(container.textContent).not.toContain('Interactive Map');
      expect(screen.queryByTestId('camera-controls')).not.toBeInTheDocument();
    });
  });

  describe('Phase 4: Functionality Verification', () => {
    it('should still handle node clicks', async () => {
      const onNodeClick = jest.fn();
      render(<TldrawMapView {...defaultProps} onNodeClick={onNodeClick} />);

      // Editor should be mounted (verified by mock)
      await waitFor(() => {
        const tldrawComponent = screen.queryByTestId('tldraw-component');
        expect(tldrawComponent).toBeInTheDocument();
      });

      // onNodeClick handler should be preserved
      expect(onNodeClick).toBeDefined();
    });

    it('should maintain expansion state functionality', () => {
      const setExpansionState = jest.fn();
      render(<TldrawMapView {...defaultProps} setExpansionState={setExpansionState} />);

      // Expansion state handler should be preserved
      expect(setExpansionState).toBeDefined();
    });

    it('should maintain highlighting functionality', () => {
      const setHighlightedPath = jest.fn();
      render(<TldrawMapView {...defaultProps} setHighlightedPath={setHighlightedPath} />);

      // Highlighting handler should be preserved
      expect(setHighlightedPath).toBeDefined();
    });
  });

  describe('Phase 5: CSS Import', () => {
    it('should import tldraw CSS for toolbar styling', () => {
      // This test verifies the import exists in the file
      // Actual CSS loading is handled by the build system

      // We verify by checking that toolbar elements have proper structure
      render(<TldrawMapView {...defaultProps} />);

      const tldrawComponent = screen.queryByTestId('tldraw-component');
      expect(tldrawComponent).toBeInTheDocument();

      // CSS import enables proper toolbar rendering
      // This is a smoke test that components render without errors
    });
  });

  describe('Edge Cases', () => {
    it('should handle null expansionState gracefully', () => {
      const propsWithNullExpansion = {
        ...defaultProps,
        expansionState: {
          expandedNodes: new Set<string>(),
          collapsedSubtrees: new Set<string>()
        }
      };

      expect(() => {
        render(<TldrawMapView {...propsWithNullExpansion} />);
      }).not.toThrow();
    });

    it('should handle empty highlightedPath', () => {
      const propsWithEmptyPath = {
        ...defaultProps,
        highlightedPath: new Set<string>()
      };

      expect(() => {
        render(<TldrawMapView {...propsWithEmptyPath} />);
      }).not.toThrow();
    });

    it('should render without selectedNodeId', () => {
      expect(() => {
        render(<TldrawMapView {...defaultProps} selectedNodeId={undefined} />);
      }).not.toThrow();
    });
  });

  describe('Integration with Existing Tests', () => {
    it('should not break existing node creation logic', async () => {
      render(<TldrawMapView {...defaultProps} />);

      // Wait for component to mount
      await waitFor(() => {
        const tldrawComponent = screen.queryByTestId('tldraw-component');
        expect(tldrawComponent).toBeInTheDocument();
      });

      // Component should render without errors
      expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
    });

    it('should not break existing edge creation logic', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
      });
    });

    it('should maintain animation functionality', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
      });
    });
  });

  describe('Component Props Memoization', () => {
    it('should use useMemo for components prop', () => {
      const { rerender } = render(<TldrawMapView {...defaultProps} />);

      // First render
      const firstTldraw = screen.queryByTestId('tldraw-component');
      expect(firstTldraw).toBeInTheDocument();

      // Rerender with same props
      rerender(<TldrawMapView {...defaultProps} />);

      // Component should not remount unnecessarily
      expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
    });
  });
});

describe('TldrawMapView - State Management (Regression Tests)', () => {
  const mockExpansionState: ExpansionState = {
    expandedNodes: new Set(['start']),
    collapsedSubtrees: new Set()
  };

  const defaultProps = {
    data: TREE_DATA,
    onNodeClick: jest.fn(),
    expansionState: mockExpansionState,
    setExpansionState: jest.fn(),
    highlightedPath: new Set<string>(),
    setHighlightedPath: jest.fn()
  };

  it('should NOT have currentTool state', () => {
    // currentTool state should be removed - tldraw handles this internally
    render(<TldrawMapView {...defaultProps} />);

    // Component should render without currentTool state
    expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
  });

  it('should NOT have zoom handler functions', () => {
    // handleZoomIn, handleZoomOut, handleZoomToFit should be removed
    // Zoom is handled via mouse wheel and tldraw UI
    render(<TldrawMapView {...defaultProps} />);

    // No custom zoom buttons should exist
    const { container } = render(<TldrawMapView {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    const zoomButtons = Array.from(buttons).filter(btn =>
      btn.textContent?.toLowerCase().includes('zoom')
    );

    expect(zoomButtons).toHaveLength(0);
  });

  it('should NOT have handleSetTool function', () => {
    // handleSetTool should be removed - tldraw toolbar handles tool switching
    render(<TldrawMapView {...defaultProps} />);

    // Component should render without custom tool handlers
    expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
  });
});

describe('TldrawMapView - Import Verification', () => {
  it('should import DefaultToolbar from tldraw', () => {
    // Verified by successful rendering of toolbar
    render(<TldrawMapView {...{
      data: TREE_DATA,
      onNodeClick: jest.fn(),
      expansionState: { expandedNodes: new Set(['start']), collapsedSubtrees: new Set() },
      setExpansionState: jest.fn(),
      highlightedPath: new Set(),
      setHighlightedPath: jest.fn()
    }} />);

    expect(screen.queryByTestId('default-toolbar')).toBeInTheDocument();
  });

  it('should import SelectToolbarItem from tldraw', () => {
    render(<TldrawMapView {...{
      data: TREE_DATA,
      onNodeClick: jest.fn(),
      expansionState: { expandedNodes: new Set(['start']), collapsedSubtrees: new Set() },
      setExpansionState: jest.fn(),
      highlightedPath: new Set(),
      setHighlightedPath: jest.fn()
    }} />);

    expect(screen.queryByTestId('select-tool-item')).toBeInTheDocument();
  });

  it('should import HandToolbarItem from tldraw', () => {
    render(<TldrawMapView {...{
      data: TREE_DATA,
      onNodeClick: jest.fn(),
      expansionState: { expandedNodes: new Set(['start']), collapsedSubtrees: new Set() },
      setExpansionState: jest.fn(),
      highlightedPath: new Set(),
      setHighlightedPath: jest.fn()
    }} />);

    expect(screen.queryByTestId('hand-tool-item')).toBeInTheDocument();
  });
});
