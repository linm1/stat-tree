/**
 * Integration tests for animation functions that execute actual code
 * Tests Phase 5 implementation with proper execution coverage
 */

import { describe, test, expect } from '@jest/globals';
import {
  easeInOutQuad,
  calculateBounds,
  addPaddingToBounds
} from './animations';

describe('Animation Functions - Integration Tests', () => {
  describe('easeInOutQuad', () => {
    test('returns 0 at start', () => {
      expect(easeInOutQuad(0)).toBe(0);
    });

    test('returns 1 at end', () => {
      expect(easeInOutQuad(1)).toBe(1);
    });

    test('returns 0.5 at midpoint', () => {
      expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 5);
    });

    test('ease-in phase (0 to 0.5)', () => {
      expect(easeInOutQuad(0.25)).toBeCloseTo(0.125, 5);
    });

    test('ease-out phase (0.5 to 1)', () => {
      expect(easeInOutQuad(0.75)).toBeCloseTo(0.875, 5);
    });

    test('is symmetric', () => {
      const val1 = easeInOutQuad(0.3);
      const val2 = 1 - easeInOutQuad(0.7);
      expect(Math.abs(val1 - val2)).toBeLessThan(0.0001);
    });
  });

  describe('calculateBounds', () => {
    test('returns zero bounds for empty array', () => {
      const bounds = calculateBounds([]);

      expect(bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0
      });
    });

    test('calculates bounds for single shape', () => {
      const shapes = [
        { x: 100, y: 200, w: 300, h: 150 }
      ];

      const bounds = calculateBounds(shapes);

      expect(bounds).toEqual({
        minX: 100,
        minY: 200,
        maxX: 400,
        maxY: 350,
        width: 300,
        height: 150
      });
    });

    test('calculates bounds for multiple shapes', () => {
      const shapes = [
        { x: 100, y: 100, w: 200, h: 80 },
        { x: 400, y: 50, w: 200, h: 80 },
        { x: 400, y: 200, w: 200, h: 80 }
      ];

      const bounds = calculateBounds(shapes);

      expect(bounds).toEqual({
        minX: 100,
        minY: 50,
        maxX: 600,
        maxY: 280,
        width: 500,
        height: 230
      });
    });

    test('handles negative coordinates', () => {
      const shapes = [
        { x: -100, y: -50, w: 200, h: 100 },
        { x: 50, y: 50, w: 100, h: 100 }
      ];

      const bounds = calculateBounds(shapes);

      expect(bounds).toEqual({
        minX: -100,
        minY: -50,
        maxX: 150,
        maxY: 150,
        width: 250,
        height: 200
      });
    });

    test('handles overlapping shapes', () => {
      const shapes = [
        { x: 0, y: 0, w: 200, h: 200 },
        { x: 50, y: 50, w: 100, h: 100 } // Fully contained
      ];

      const bounds = calculateBounds(shapes);

      expect(bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 200,
        maxY: 200,
        width: 200,
        height: 200
      });
    });
  });

  describe('addPaddingToBounds', () => {
    test('adds padding to all sides', () => {
      const bounds = {
        minX: 100,
        minY: 100,
        width: 200,
        height: 100
      };

      const paddedBounds = addPaddingToBounds(bounds, 50);

      expect(paddedBounds).toEqual({
        x: 50,
        y: 50,
        w: 300,
        h: 200
      });
    });

    test('handles zero padding', () => {
      const bounds = {
        minX: 100,
        minY: 100,
        width: 200,
        height: 100
      };

      const paddedBounds = addPaddingToBounds(bounds, 0);

      expect(paddedBounds).toEqual({
        x: 100,
        y: 100,
        w: 200,
        h: 100
      });
    });

    test('handles large padding', () => {
      const bounds = {
        minX: 100,
        minY: 100,
        width: 100,
        height: 100
      };

      const paddedBounds = addPaddingToBounds(bounds, 1000);

      expect(paddedBounds).toEqual({
        x: -900,
        y: -900,
        w: 2100,
        h: 2100
      });
    });

    test('handles negative coordinates', () => {
      const bounds = {
        minX: -50,
        minY: -50,
        width: 100,
        height: 100
      };

      const paddedBounds = addPaddingToBounds(bounds, 25);

      expect(paddedBounds).toEqual({
        x: -75,
        y: -75,
        w: 150,
        h: 150
      });
    });
  });

  describe('Integration scenarios', () => {
    test('calculate and pad bounds for typical node group', () => {
      // Simulate parent + 3 children
      const shapes = [
        { x: 100, y: 100, w: 200, h: 80 },  // Parent
        { x: 400, y: 50, w: 200, h: 80 },   // Child 1
        { x: 400, y: 150, w: 200, h: 80 },  // Child 2
        { x: 400, y: 250, w: 200, h: 80 }   // Child 3
      ];

      const bounds = calculateBounds(shapes);
      const paddedBounds = addPaddingToBounds(bounds, 100);

      expect(paddedBounds).toEqual({
        x: 0,
        y: -50,
        w: 700,
        h: 480
      });
    });

    test('calculate bounds for single node with standard padding', () => {
      const shapes = [
        { x: 100, y: 100, w: 200, h: 80 }
      ];

      const bounds = calculateBounds(shapes);
      const paddedBounds = addPaddingToBounds(bounds, 100);

      expect(paddedBounds).toEqual({
        x: 0,
        y: 0,
        w: 400,
        h: 280
      });
    });
  });
});
