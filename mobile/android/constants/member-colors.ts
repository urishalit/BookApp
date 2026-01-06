/**
 * Predefined colors for family member profiles.
 * Each color is designed to be distinguishable and accessible.
 */
export const MEMBER_COLORS = [
  '#E57373', // Coral Red
  '#F06292', // Rose Pink
  '#BA68C8', // Orchid Purple
  '#9575CD', // Lavender
  '#7986CB', // Periwinkle
  '#64B5F6', // Sky Blue
  '#4FC3F7', // Light Blue
  '#4DD0E1', // Cyan
  '#4DB6AC', // Teal
  '#81C784', // Sage Green
  '#AED581', // Lime Green
  '#DCE775', // Yellow Green
  '#FFD54F', // Golden Yellow
  '#FFB74D', // Tangerine
  '#FF8A65', // Salmon
  '#A1887F', // Mocha
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

/**
 * Get a random member color
 */
export function getRandomMemberColor(): MemberColor {
  const index = Math.floor(Math.random() * MEMBER_COLORS.length);
  return MEMBER_COLORS[index];
}

/**
 * Get a suggested color based on existing members
 * Returns the least-used color from the palette
 */
export function getSuggestedColor(existingColors: string[]): MemberColor {
  const colorCounts = new Map<string, number>();
  
  // Initialize all colors with 0 count
  for (const color of MEMBER_COLORS) {
    colorCounts.set(color, 0);
  }
  
  // Count existing colors
  for (const color of existingColors) {
    const count = colorCounts.get(color) ?? 0;
    colorCounts.set(color, count + 1);
  }
  
  // Find the color with the lowest count
  let minColor = MEMBER_COLORS[0];
  let minCount = Infinity;
  
  for (const [color, count] of colorCounts) {
    if (count < minCount) {
      minCount = count;
      minColor = color as MemberColor;
    }
  }
  
  return minColor;
}

