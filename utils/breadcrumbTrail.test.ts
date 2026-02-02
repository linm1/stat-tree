/**
 * Tests for Breadcrumb Trail (Phase 9)
 *
 * Tests breadcrumb path calculation and navigation
 */

import {
  getExpandedPath,
  handleBreadcrumbClick,
  truncateBreadcrumbText
} from './breadcrumbTrail';
import { TREE_DATA } from '../data';
import { ExpansionState } from './expansionState';

describe('Breadcrumb Trail - getExpandedPath', () => {
  it('returns only root when nothing expanded', () => {
    const state: ExpansionState = {
      expandedNodes: new Set<string>(),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    expect(path).toEqual(['start']);
  });

  it('returns path to first expanded child', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'compare_groups']),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    expect(path).toEqual(['start', 'compare_groups']);
  });

  it('returns deep path when multiple levels expanded', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'compare_groups', 'cont_time', 'cont_single_groups']),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    expect(path).toEqual(['start', 'compare_groups', 'cont_time', 'cont_single_groups']);
  });

  it('follows only first expanded child at each level', () => {
    const state: ExpansionState = {
      expandedNodes: new Set([
        'start',
        'compare_groups',
        'cont_time',     // First expanded child
        'bin_time'       // Another expanded child (sibling)
      ]),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    // Should follow the first path found (cont_time), not bin_time
    expect(path).toContain('cont_time');
  });

  it('stops at leaf node (result node)', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'describe_explore']),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    expect(path).toEqual(['start', 'describe_explore']);
  });

  it('handles very deep expansion (6+ levels)', () => {
    const state: ExpansionState = {
      expandedNodes: new Set([
        'start',
        'compare_groups',
        'cont_time',
        'cont_single_groups',
        'cont_single_2g',
        'cont_ttest'
      ]),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    expect(path.length).toBe(6);
    expect(path[0]).toBe('start');
    expect(path[path.length - 1]).toBe('cont_ttest');
  });

  it('handles root expanded but no children', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start']),
      collapsedSubtrees: new Set<string>()
    };

    const path = getExpandedPath(state, TREE_DATA);

    expect(path).toEqual(['start']);
  });
});

describe('Breadcrumb Trail - handleBreadcrumbClick', () => {
  it('collapses all nodes after clicked node', () => {
    const state: ExpansionState = {
      expandedNodes: new Set([
        'start',
        'compare_groups',
        'cont_time',
        'cont_single_groups',
        'cont_single_2g'
      ]),
      collapsedSubtrees: new Set<string>()
    };

    const path = ['start', 'compare_groups', 'cont_time', 'cont_single_groups', 'cont_single_2g'];
    const clickedNodeId = 'cont_time'; // Click on middle node

    const result = handleBreadcrumbClick(clickedNodeId, path, state);

    // Nodes after cont_time should be removed
    expect(result.expandedNodes.has('cont_time')).toBe(true);
    expect(result.expandedNodes.has('cont_single_groups')).toBe(false);
    expect(result.expandedNodes.has('cont_single_2g')).toBe(false);

    // Nodes before should remain
    expect(result.expandedNodes.has('start')).toBe(true);
    expect(result.expandedNodes.has('compare_groups')).toBe(true);
  });

  it('clicking root collapses everything except root', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
      collapsedSubtrees: new Set<string>()
    };

    const path = ['start', 'compare_groups', 'cont_time'];
    const result = handleBreadcrumbClick('start', path, state);

    expect(result.expandedNodes.has('start')).toBe(true);
    expect(result.expandedNodes.has('compare_groups')).toBe(false);
    expect(result.expandedNodes.has('cont_time')).toBe(false);
  });

  it('clicking last node in path does nothing', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
      collapsedSubtrees: new Set<string>()
    };

    const path = ['start', 'compare_groups', 'cont_time'];
    const result = handleBreadcrumbClick('cont_time', path, state);

    // Last node: nothing should change
    expect(result.expandedNodes).toEqual(state.expandedNodes);
  });

  it('returns new state (immutability)', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
      collapsedSubtrees: new Set<string>()
    };

    const path = ['start', 'compare_groups', 'cont_time'];
    const result = handleBreadcrumbClick('compare_groups', path, state);

    expect(result).not.toBe(state);
    expect(result.expandedNodes).not.toBe(state.expandedNodes);
  });

  it('handles node not in path gracefully', () => {
    const state: ExpansionState = {
      expandedNodes: new Set(['start', 'compare_groups', 'cont_time']),
      collapsedSubtrees: new Set<string>()
    };

    const path = ['start', 'compare_groups', 'cont_time'];
    const result = handleBreadcrumbClick('bin_time', path, state); // Not in path

    // Should return unchanged state
    expect(result.expandedNodes.size).toBe(state.expandedNodes.size);
  });

  it('handles deep collapse correctly', () => {
    const state: ExpansionState = {
      expandedNodes: new Set([
        'start',
        'compare_groups',
        'cont_time',
        'cont_single_groups',
        'cont_single_2g',
        'cont_ttest'
      ]),
      collapsedSubtrees: new Set<string>()
    };

    const path = ['start', 'compare_groups', 'cont_time', 'cont_single_groups', 'cont_single_2g', 'cont_ttest'];
    const result = handleBreadcrumbClick('compare_groups', path, state);

    // Only start and compare_groups should remain
    expect(result.expandedNodes.size).toBe(2);
    expect(result.expandedNodes.has('start')).toBe(true);
    expect(result.expandedNodes.has('compare_groups')).toBe(true);
  });
});

describe('Breadcrumb Trail - truncateBreadcrumbText', () => {
  it('returns full text if under max length', () => {
    const text = 'Short text';
    const result = truncateBreadcrumbText(text, 30);

    expect(result).toBe('Short text');
  });

  it('truncates text longer than max length', () => {
    const text = 'This is a very long text that should be truncated';
    const result = truncateBreadcrumbText(text, 20);

    expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    expect(result).toContain('...');
  });

  it('uses default max length of 30', () => {
    const text = 'This is a moderately long text that might need truncation';
    const result = truncateBreadcrumbText(text);

    expect(result.length).toBeLessThanOrEqual(33); // 30 + '...'
  });

  it('handles empty string', () => {
    const result = truncateBreadcrumbText('', 20);
    expect(result).toBe('');
  });

  it('handles single character', () => {
    const result = truncateBreadcrumbText('A', 20);
    expect(result).toBe('A');
  });

  it('truncates exactly at max length', () => {
    const text = 'Exactly twenty chars'; // 20 chars
    const result = truncateBreadcrumbText(text, 20);

    expect(result).toBe('Exactly twenty chars');
  });

  it('truncates one char over max', () => {
    const text = 'Twenty one characters'; // 21 chars
    const result = truncateBreadcrumbText(text, 20);

    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(23);
  });
});

describe('Breadcrumb Trail - Integration', () => {
  it('breadcrumb click updates path correctly', () => {
    const initialState: ExpansionState = {
      expandedNodes: new Set([
        'start',
        'compare_groups',
        'cont_time',
        'cont_single_groups'
      ]),
      collapsedSubtrees: new Set<string>()
    };

    // Get current path
    const path = getExpandedPath(initialState, TREE_DATA);
    expect(path).toEqual(['start', 'compare_groups', 'cont_time', 'cont_single_groups']);

    // Click on cont_time
    const newState = handleBreadcrumbClick('cont_time', path, initialState);

    // Get new path
    const newPath = getExpandedPath(newState, TREE_DATA);
    expect(newPath).toEqual(['start', 'compare_groups', 'cont_time']);
  });

  it('handles multiple breadcrumb clicks in sequence', () => {
    let state: ExpansionState = {
      expandedNodes: new Set([
        'start',
        'compare_groups',
        'cont_time',
        'cont_single_groups',
        'cont_single_2g'
      ]),
      collapsedSubtrees: new Set<string>()
    };

    // First click: go to cont_time
    let path = getExpandedPath(state, TREE_DATA);
    state = handleBreadcrumbClick('cont_time', path, state);
    path = getExpandedPath(state, TREE_DATA);
    expect(path).toEqual(['start', 'compare_groups', 'cont_time']);

    // Second click: go to compare_groups
    state = handleBreadcrumbClick('compare_groups', path, state);
    path = getExpandedPath(state, TREE_DATA);
    expect(path).toEqual(['start', 'compare_groups']);

    // Third click: go to start
    state = handleBreadcrumbClick('start', path, state);
    path = getExpandedPath(state, TREE_DATA);
    expect(path).toEqual(['start']);
  });
});
