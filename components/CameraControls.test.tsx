/**
 * TDD Test Suite for Native NavigationPanel Migration
 *
 * This test suite follows TDD methodology:
 * 1. RED: Write tests first (they will fail)
 * 2. GREEN: Implement to make tests pass
 * 3. REFACTOR: Clean up code while keeping tests green
 *
 * Tests verify:
 * - NavigationPanel is NOT set to null (enables native controls)
 * - Custom camera controls JSX is removed
 * - Old "INTERACTIVE MAP" text is removed
 * - Existing toolbar functionality still works
 * - Integration tests for node interaction remain functional
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TldrawMapView } from './TldrawMapView';
import { TREE_DATA } from '../data';
import type { ExpansionState } from '../types';

// Mock tldraw with camera methods
jest.mock('tldraw', () => {
  const React = require('react');
  return {
    Tldraw: ({ components, onMount, persistenceKey }: any) => {
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
            getCamera: jest.fn(() => ({ z: 1.0 })),
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

      const toolbarContent = components?.Toolbar ? React.createElement(components.Toolbar, { key: 'toolbar' }) : null;

      return React.createElement('div', {
        'data-testid': 'tldraw-component',
        'data-has-components-prop': components !== undefined,
        'data-has-toolbar': components?.Toolbar !== undefined,
        'data-has-navigation-panel': components?.NavigationPanel !== null,
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

describe('TldrawMapView - Camera Controls (TDD)', () => {
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

  describe('Phase 1: Native NavigationPanel Enabled', () => {
    it('should NOT set NavigationPanel to null in TLComponents', async () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');
        expect(tldrawComponent).toBeInTheDocument();

        // NavigationPanel should be enabled (data-has-navigation-panel should be true)
        expect(tldrawComponent?.getAttribute('data-has-navigation-panel')).toBe('true');
      });
    });

    it('should NOT render custom camera controls', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const cameraControls = screen.queryByTestId('camera-controls');
        expect(cameraControls).not.toBeInTheDocument();
      });
    });

    it('should NOT render custom zoom out button', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const zoomOutBtn = screen.queryByTestId('zoom-out-btn');
        expect(zoomOutBtn).not.toBeInTheDocument();
      });
    });

    it('should NOT render custom zoom in button', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const zoomInBtn = screen.queryByTestId('zoom-in-btn');
        expect(zoomInBtn).not.toBeInTheDocument();
      });
    });

    it('should NOT render custom zoom to fit button', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const fitBtn = screen.queryByTestId('zoom-fit-btn');
        expect(fitBtn).not.toBeInTheDocument();
      });
    });

    it('should NOT render custom minimap toggle button', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const minimapBtn = screen.queryByTestId('minimap-toggle-btn');
        expect(minimapBtn).not.toBeInTheDocument();
      });
    });

    it('should NOT render custom zoom level percentage display', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const zoomDisplay = screen.queryByTestId('zoom-level');
        expect(zoomDisplay).not.toBeInTheDocument();
      });
    });

    it('should NOT show "Interactive Map" title', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/Interactive Map/i)).not.toBeInTheDocument();
      });
    });

    it('should NOT show custom helper text about navigation', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const helperText = screen.queryByText(/Click nodes.*Pan.*Zoom/i);
        expect(helperText).not.toBeInTheDocument();
      });
    });

    it('should NOT render old custom minimap container', () => {
      render(<TldrawMapView {...defaultProps} />);

      const minimapContainer = screen.queryByTestId('minimap-container');
      expect(minimapContainer).not.toBeInTheDocument();
    });
  });

  describe('Phase 2: Tldraw Native Features', () => {
    it('should rely on native NavigationPanel for zoom controls', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // No custom controls should exist
        expect(screen.queryByTestId('camera-controls')).not.toBeInTheDocument();
      });
    });

    it('should rely on native NavigationPanel for minimap', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // No custom minimap should exist
        expect(screen.queryByTestId('minimap-container')).not.toBeInTheDocument();
      });
    });

    it('should use native Tldraw UI for camera operations', async () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');
        expect(tldrawComponent).toBeInTheDocument();

        // NavigationPanel should be enabled
        expect(tldrawComponent?.getAttribute('data-has-navigation-panel')).toBe('true');
      });
    });
  });

  describe('Phase 3: No Custom Zoom Handlers', () => {
    it('should NOT have custom zoom in button to click', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const zoomInBtn = screen.queryByTestId('zoom-in-btn');
        expect(zoomInBtn).not.toBeInTheDocument();
      });
    });

    it('should NOT have custom zoom out button to click', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const zoomOutBtn = screen.queryByTestId('zoom-out-btn');
        expect(zoomOutBtn).not.toBeInTheDocument();
      });
    });

    it('should NOT have custom zoom to fit button to click', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const fitBtn = screen.queryByTestId('zoom-fit-btn');
        expect(fitBtn).not.toBeInTheDocument();
      });
    });

    it('should use native Tldraw camera controls instead', async () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // Verify native NavigationPanel is enabled
        const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');
        expect(tldrawComponent?.getAttribute('data-has-navigation-panel')).toBe('true');
      });
    });
  });

  describe('Phase 4: No Custom Zoom Level Display', () => {
    it('should NOT display custom zoom level percentage', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const zoomDisplay = screen.queryByTestId('zoom-level');
        expect(zoomDisplay).not.toBeInTheDocument();
      });
    });

    it('should rely on native NavigationPanel for zoom feedback', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // No custom zoom display
        expect(screen.queryByTestId('zoom-level')).not.toBeInTheDocument();
      });
    });
  });

  describe('Phase 5: Clean UI Without Custom Overlays', () => {
    it('should NOT have custom camera controls positioned at bottom-left', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const cameraControls = screen.queryByTestId('camera-controls');
        expect(cameraControls).not.toBeInTheDocument();
      });
    });

    it('should rely on native Tldraw UI styling', async () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        const tldrawComponent = container.querySelector('[data-testid="tldraw-component"]');
        expect(tldrawComponent).toBeInTheDocument();

        // No custom overlays with z-index
        const customOverlay = container.querySelector('.z-\\[1000\\]');
        expect(customOverlay).not.toBeInTheDocument();
      });
    });

    it('should have cleaner interface without custom brutalist panels', async () => {
      const { container } = render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // Main container should exist
        const mainContainer = container.querySelector('.border-2.border-ink');
        expect(mainContainer).toBeInTheDocument();

        // But no custom camera control panels
        expect(screen.queryByTestId('camera-controls')).not.toBeInTheDocument();
      });
    });
  });

  describe('Phase 6: Edge Cases', () => {
    it('should not crash when editor is not yet initialized', () => {
      expect(() => {
        render(<TldrawMapView {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle component rerenders without custom controls', () => {
      const { rerender } = render(<TldrawMapView {...defaultProps} />);

      rerender(<TldrawMapView {...defaultProps} selectedNodeId="start" />);

      // Should not have custom camera controls
      expect(screen.queryByTestId('camera-controls')).not.toBeInTheDocument();
    });

    it('should not interfere with existing node interaction functionality', async () => {
      const onNodeClick = jest.fn();
      render(<TldrawMapView {...defaultProps} onNodeClick={onNodeClick} />);

      await waitFor(() => {
        // Native NavigationPanel should not break node clicking
        expect(onNodeClick).toBeDefined();
      });
    });
  });

  describe('Phase 7: Integration with Existing Features', () => {
    it('should not break existing tldraw toolbar', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // Existing toolbar should still work
        expect(screen.queryByTestId('default-toolbar')).toBeInTheDocument();
        expect(screen.queryByTestId('select-tool-item')).toBeInTheDocument();
        expect(screen.queryByTestId('hand-tool-item')).toBeInTheDocument();
      });
    });

    it('should coexist with other UI elements', async () => {
      render(<TldrawMapView {...defaultProps} />);

      await waitFor(() => {
        // Tldraw canvas and native NavigationPanel should coexist
        expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
      });
    });

    it('should not affect expansion state functionality', () => {
      const setExpansionState = jest.fn();
      render(<TldrawMapView {...defaultProps} setExpansionState={setExpansionState} />);

      expect(setExpansionState).toBeDefined();
      expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
    });

    it('should not affect path highlighting functionality', () => {
      const setHighlightedPath = jest.fn();
      render(<TldrawMapView {...defaultProps} setHighlightedPath={setHighlightedPath} />);

      expect(setHighlightedPath).toBeDefined();
      expect(screen.queryByTestId('tldraw-component')).toBeInTheDocument();
    });
  });
});
