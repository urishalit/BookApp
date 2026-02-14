/**
 * Tests for batch-wizard-utils.ts and add-batch-wizard source audit.
 *
 * Verifies getCurrentPhoto, hasNextPhoto, getNextIndex.
 * Mutation: getNextIndex return 0 → test should fail.
 *
 * Source audit: Ensures finishWizard:
 * - uses router.back() (GO_BACK, bubbles) instead of router.dismiss() (POP)
 * - has a ref guard (isFinishingRef) to prevent double navigation calls
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  getCurrentPhoto,
  hasNextPhoto,
  getNextIndex,
} from '@/lib/batch-wizard-utils';

describe('batch-wizard-utils', () => {
  describe('getCurrentPhoto', () => {
    it('should return photo at index 0', () => {
      expect(getCurrentPhoto(['a', 'b'], 0)).toBe('a');
    });

    it('should return photo at index 1', () => {
      expect(getCurrentPhoto(['a', 'b'], 1)).toBe('b');
    });

    it('should return undefined for empty array', () => {
      expect(getCurrentPhoto([], 0)).toBeUndefined();
    });

    it('should return undefined when index out of bounds', () => {
      expect(getCurrentPhoto(['a'], 1)).toBeUndefined();
    });
  });

  describe('hasNextPhoto', () => {
    it('should return true when more photos exist', () => {
      expect(hasNextPhoto(['a', 'b'], 0)).toBe(true);
    });

    it('should return false when on last photo', () => {
      expect(hasNextPhoto(['a'], 0)).toBe(false);
    });

    it('should return false when on last of multiple', () => {
      expect(hasNextPhoto(['a', 'b'], 1)).toBe(false);
    });
  });

  describe('getNextIndex', () => {
    it('should return 1 when current is 0', () => {
      expect(getNextIndex(0)).toBe(1);
    });

    it('should return 2 when current is 1', () => {
      expect(getNextIndex(1)).toBe(2);
    });
  });
});

describe('add-batch-wizard source audit', () => {
  const WIZARD_PATH = path.join(__dirname, '../../app/book/add-batch-wizard.tsx');
  const source = fs.readFileSync(WIZARD_PATH, 'utf-8');

  it('finishWizard must use router.back() instead of router.dismiss() to avoid POP error', () => {
    // Extract the finishWizard function body
    const fnMatch = source.match(/const finishWizard\s*=\s*useCallback\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![1];

    // Must NOT contain router.dismiss()
    expect(fnBody).not.toMatch(/router\.dismiss\(\)/);

    // Must contain router.back()
    expect(fnBody).toMatch(/router\.back\(\)/);
  });

  it('finishWizard must have a ref guard to prevent double navigation calls', () => {
    // Extract the finishWizard function body
    const fnMatch = source.match(/const finishWizard\s*=\s*useCallback\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![1];

    // Must check isFinishingRef.current and return early
    expect(fnBody).toMatch(/if\s*\(\s*isFinishingRef\.current\s*\)\s*return/);

    // Must set isFinishingRef.current = true before navigating
    expect(fnBody).toMatch(/isFinishingRef\.current\s*=\s*true/);
  });
});
