/**
 * Node icon utilities for expand/collapse indicators
 */

/**
 * Unicode characters for expand/collapse icons
 */
export const EXPAND_ICON = '\u25B6'; // Right-pointing triangle
export const COLLAPSE_ICON = '\u25BC'; // Down-pointing triangle

/**
 * Add expand/collapse icon prefix to node text
 *
 * @param text - Original node text
 * @param isExpandableNode - Whether the node has children
 * @param isExpanded - Whether the node is currently expanded
 * @returns Text with icon prefix if expandable, original text otherwise
 */
export const addIconToText = (
  text: string,
  isExpandableNode: boolean,
  isExpanded: boolean
): string => {
  if (!isExpandableNode) {
    return text;
  }

  const icon = isExpanded ? COLLAPSE_ICON : EXPAND_ICON;
  return `${icon} ${text}`;
};
