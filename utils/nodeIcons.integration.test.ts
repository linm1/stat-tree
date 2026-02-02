/**
 * Integration tests for node icon utilities
 * Tests Phase 6 implementation with full execution coverage
 */

import { describe, test, expect } from '@jest/globals';
import {
  EXPAND_ICON,
  COLLAPSE_ICON,
  hasChildren,
  isExpandable,
  addIconToText,
  getNodeIcon,
  getNodeDisplayText
} from './nodeIcons';
import { TREE_DATA } from '../data';

describe('Node Icon Utilities - Integration Tests', () => {
  describe('hasChildren', () => {
    test('returns true for root node', () => {
      const result = hasChildren('start', TREE_DATA);
      expect(result).toBe(true);
    });

    test('returns true for compare_groups', () => {
      const result = hasChildren('compare_groups', TREE_DATA);
      expect(result).toBe(true);
    });

    test('returns false for result nodes', () => {
      const result = hasChildren('describe_explore', TREE_DATA);
      expect(result).toBe(false);
    });

    test('returns false for nonexistent node', () => {
      const result = hasChildren('nonexistent', TREE_DATA);
      expect(result).toBe(false);
    });

    test('returns false for empty string', () => {
      const result = hasChildren('', TREE_DATA);
      expect(result).toBe(false);
    });
  });

  describe('isExpandable', () => {
    test('returns true for node with options', () => {
      const node = TREE_DATA['start'];
      const result = isExpandable(node);
      expect(result).toBe(true);
    });

    test('returns false for node without options', () => {
      const node = TREE_DATA['describe_explore'];
      const result = isExpandable(node);
      expect(result).toBe(false);
    });

    test('returns false for node with empty options array', () => {
      const node: any = {
        id: 'test',
        question: 'Test',
        options: []
      };
      const result = isExpandable(node);
      expect(result).toBe(false);
    });
  });

  describe('addIconToText', () => {
    test('adds expand icon for collapsed expandable node', () => {
      const result = addIconToText('Test Node', true, false);
      expect(result).toBe(`${EXPAND_ICON} Test Node`);
    });

    test('adds collapse icon for expanded expandable node', () => {
      const result = addIconToText('Test Node', true, true);
      expect(result).toBe(`${COLLAPSE_ICON} Test Node`);
    });

    test('does not add icon for non-expandable node', () => {
      const result = addIconToText('Test Node', false, false);
      expect(result).toBe('Test Node');
    });

    test('handles empty text', () => {
      const result = addIconToText('', true, true);
      expect(result).toBe(`${COLLAPSE_ICON} `);
    });
  });

  describe('getNodeIcon', () => {
    test('returns collapse icon when expanded', () => {
      const result = getNodeIcon(true);
      expect(result).toBe(COLLAPSE_ICON);
    });

    test('returns expand icon when collapsed', () => {
      const result = getNodeIcon(false);
      expect(result).toBe(EXPAND_ICON);
    });
  });

  describe('getNodeDisplayText', () => {
    test('adds collapse icon for expanded node with children', () => {
      const expansionState = new Set(['start']);
      const result = getNodeDisplayText('start', 'Root', TREE_DATA, expansionState);
      expect(result).toBe(`${COLLAPSE_ICON} Root`);
    });

    test('adds expand icon for collapsed node with children', () => {
      const expansionState = new Set();
      const result = getNodeDisplayText('compare_groups', 'Compare', TREE_DATA, expansionState);
      expect(result).toBe(`${EXPAND_ICON} Compare`);
    });

    test('no icon for leaf node', () => {
      const expansionState = new Set();
      const result = getNodeDisplayText('describe_explore', 'Describe', TREE_DATA, expansionState);
      expect(result).toBe('Describe');
    });

    test('defaults to collapsed when no expansion state provided', () => {
      const result = getNodeDisplayText('start', 'Root', TREE_DATA);
      expect(result).toBe(`${EXPAND_ICON} Root`);
    });

    test('handles nonexistent node', () => {
      const result = getNodeDisplayText('nonexistent', 'Test', TREE_DATA);
      expect(result).toBe('Test');
    });
  });

  describe('Icon constants', () => {
    test('EXPAND_ICON is right-pointing triangle', () => {
      expect(EXPAND_ICON).toBe('▶');
      expect(EXPAND_ICON.charCodeAt(0)).toBe(9654);
    });

    test('COLLAPSE_ICON is down-pointing triangle', () => {
      expect(COLLAPSE_ICON).toBe('▼');
      expect(COLLAPSE_ICON.charCodeAt(0)).toBe(9660);
    });

    test('icons are distinct', () => {
      expect(EXPAND_ICON).not.toBe(COLLAPSE_ICON);
    });
  });

  describe('Real-world scenarios', () => {
    test('all parent nodes in TREE_DATA have children', () => {
      const parentNodes = [
        'start',
        'compare_groups',
        'cont_time',
        'bin_time',
        'count_check',
        'tte_type',
        'ord_type'
      ];

      parentNodes.forEach(nodeId => {
        const result = hasChildren(nodeId, TREE_DATA);
        expect(result).toBe(true);
      });
    });

    test('all result nodes have no children', () => {
      const resultNodes = Object.keys(TREE_DATA).filter(
        nodeId => TREE_DATA[nodeId].result !== undefined
      );

      resultNodes.forEach(nodeId => {
        const result = hasChildren(nodeId, TREE_DATA);
        expect(result).toBe(false);
      });
    });

    test('expansion state affects icon for all expandable nodes', () => {
      const expandableNodes = ['start', 'compare_groups', 'cont_time'];

      expandableNodes.forEach(nodeId => {
        const collapsedText = getNodeDisplayText(nodeId, 'Test', TREE_DATA, new Set());
        const expandedText = getNodeDisplayText(nodeId, 'Test', TREE_DATA, new Set([nodeId]));

        expect(collapsedText).toContain(EXPAND_ICON);
        expect(expandedText).toContain(COLLAPSE_ICON);
      });
    });
  });
});
