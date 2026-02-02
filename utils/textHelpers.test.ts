import { describe, it, expect } from '@jest/globals';
import { truncateText } from './textHelpers';

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    expect(truncateText('Short', 40)).toBe('Short');
  });

  it('truncates long text with ellipsis at maxLen', () => {
    const long = 'This is a very long text that exceeds forty characters limit';
    const result = truncateText(long, 40);
    expect(result).toBe('This is a very long text that exceeds...');
    expect(result.length).toBe(40);
  });

  it('handles exact length unchanged', () => {
    const exact = 'A'.repeat(40);
    expect(truncateText(exact, 40)).toBe(exact);
  });

  it('handles empty string', () => {
    expect(truncateText('', 40)).toBe('');
  });

  it('uses default maxLen of 40', () => {
    const long = 'A'.repeat(50);
    expect(truncateText(long).length).toBe(40);
  });
});
