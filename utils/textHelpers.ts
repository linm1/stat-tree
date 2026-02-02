export const truncateText = (text: string, maxLen: number = 40): string =>
  text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
