import {
  MEMBER_COLORS,
  getRandomMemberColor,
  getSuggestedColor,
} from '../../constants/member-colors';

describe('Member Colors', () => {
  describe('MEMBER_COLORS', () => {
    it('should have at least 10 colors', () => {
      expect(MEMBER_COLORS.length).toBeGreaterThanOrEqual(10);
    });

    it('should contain valid hex color codes', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      for (const color of MEMBER_COLORS) {
        expect(color).toMatch(hexColorRegex);
      }
    });

    it('should have unique colors', () => {
      const uniqueColors = new Set(MEMBER_COLORS);
      expect(uniqueColors.size).toBe(MEMBER_COLORS.length);
    });
  });

  describe('getRandomMemberColor', () => {
    it('should return a color from the MEMBER_COLORS array', () => {
      const color = getRandomMemberColor();

      expect(MEMBER_COLORS).toContain(color);
    });

    it('should return different colors over multiple calls (probabilistic)', () => {
      const colors = new Set<string>();

      // Call 20 times - with 16 colors, we should get some variety
      for (let i = 0; i < 20; i++) {
        colors.add(getRandomMemberColor());
      }

      // Should have gotten at least 2 different colors in 20 attempts
      expect(colors.size).toBeGreaterThan(1);
    });
  });

  describe('getSuggestedColor', () => {
    it('should return a color from MEMBER_COLORS when no existing colors', () => {
      const suggested = getSuggestedColor([]);

      expect(MEMBER_COLORS).toContain(suggested);
    });

    it('should return an unused color when some colors are already used', () => {
      const usedColors = [MEMBER_COLORS[0], MEMBER_COLORS[1]];

      const suggested = getSuggestedColor(usedColors);

      // Should return a color that wasn't used
      expect(usedColors).not.toContain(suggested);
    });

    it('should return the least used color when all colors are used at least once', () => {
      // Use all colors once, except the last one
      const usedColors = [...MEMBER_COLORS.slice(0, -1)];

      const suggested = getSuggestedColor(usedColors);

      // Should return the unused color
      expect(suggested).toBe(MEMBER_COLORS[MEMBER_COLORS.length - 1]);
    });

    it('should return a color even when some colors are used multiple times', () => {
      // Use first color 3 times, second color 2 times
      const usedColors = [
        MEMBER_COLORS[0],
        MEMBER_COLORS[0],
        MEMBER_COLORS[0],
        MEMBER_COLORS[1],
        MEMBER_COLORS[1],
      ];

      const suggested = getSuggestedColor(usedColors);

      // Should not return one of the heavily used colors
      expect(suggested).not.toBe(MEMBER_COLORS[0]);
      expect(suggested).not.toBe(MEMBER_COLORS[1]);
    });

    it('should handle colors not in the palette gracefully', () => {
      const usedColors = ['#123456', '#ABCDEF']; // Colors not in MEMBER_COLORS

      const suggested = getSuggestedColor(usedColors);

      // Should still return a valid color from the palette
      expect(MEMBER_COLORS).toContain(suggested);
    });
  });
});

