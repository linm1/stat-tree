/**
 * Integration tests for node icon utilities
 */

import { describe, test, expect } from '@jest/globals';
import { EXPAND_ICON, COLLAPSE_ICON, addIconToText } from './nodeIcons';
import { hasChildren } from './expansionState';
import { TREE_DATA } from '../data';

describe('Node Icon Utilities - Integration Tests', () => {
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

  describe('Icon constants', () => {
    test('EXPAND_ICON is right-pointing triangle', () => {
      expect(EXPAND_ICON).toBe('\u25B6');
      expect(EXPAND_ICON.charCodeAt(0)).toBe(9654);
    });

    test('COLLAPSE_ICON is down-pointing triangle', () => {
      expect(COLLAPSE_ICON).toBe('\u25BC');
      expect(COLLAPSE_ICON.charCodeAt(0)).toBe(9660);
    });

    test('icons are distinct', () => {
      expect(EXPAND_ICON).not.toBe(COLLAPSE_ICON);
    });
  });

  describe('Integration with hasChildren from expansionState', () => {
    test('can determine expandability and add correct icon', () => {
      const nodeId = 'start';
      const isExpandable = hasChildren(nodeId, TREE_DATA);
      const text = TREE_DATA[nodeId].question;

      expect(isExpandable).toBe(true);

      const collapsedText = addIconToText(text, isExpandable, false);
      const expandedText = addIconToText(text, isExpandable, true);

      expect(collapsedText).toContain(EXPAND_ICON);
      expect(expandedText).toContain(COLLAPSE_ICON);
    });

    test('leaf nodes get no icon', () => {
      const nodeId = 'describe_explore';
      const isExpandable = hasChildren(nodeId, TREE_DATA);
      const text = TREE_DATA[nodeId].question;

      expect(isExpandable).toBe(false);

      const displayText = addIconToText(text, isExpandable, false);
      expect(displayText).toBe(text);
      expect(displayText).not.toContain(EXPAND_ICON);
      expect(displayText).not.toContain(COLLAPSE_ICON);
    });
  });
});
