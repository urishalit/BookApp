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

  it('must use MemberPicker with value, onChange, and renderTrigger for per-book member selection', () => {
    expect(source).toMatch(/MemberPicker/);
    expect(source).toMatch(/value=\{[^}]*memberId[^}]*\}/);
    expect(source).toMatch(/onChange=\{[^}]*setMemberId/);
    expect(source).toMatch(/renderTrigger=/);
  });

  it('must persist last selected member for next book in batch (setMemberId before advance, no reset in advanceToNext)', () => {
    const handleSubmitMatch = source.match(/const handleSubmit\s*=\s*useCallback\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\},\s*\[/);
    expect(handleSubmitMatch).not.toBeNull();
    const handleSubmitBody = handleSubmitMatch![1];
    expect(handleSubmitBody).toMatch(/setMemberId\s*\(\s*effectiveMemberId\s*\)/);
    const advanceCallIndex = handleSubmitBody.indexOf('advanceToNext()');
    const setMemberCallIndex = handleSubmitBody.indexOf('setMemberId(effectiveMemberId)');
    expect(setMemberCallIndex).toBeGreaterThan(-1);
    expect(advanceCallIndex).toBeGreaterThan(setMemberCallIndex);

    const advanceToNextMatch = source.match(/const advanceToNext\s*=\s*useCallback\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\},\s*\[/);
    expect(advanceToNextMatch).not.toBeNull();
    const advanceToNextBody = advanceToNextMatch![1];
    expect(advanceToNextBody).not.toMatch(/setMemberId\s*\(\s*undefined\s*\)/);
  });
});

describe('MemberPicker source audit', () => {
  const PICKER_PATH = path.join(__dirname, '../../components/member-picker.tsx');
  const source = fs.readFileSync(PICKER_PATH, 'utf-8');

  it('must support controlled mode with value, onChange, and renderTrigger props', () => {
    expect(source).toMatch(/value\?: string/);
    expect(source).toMatch(/onChange\?: \(member: Member\) => void/);
    expect(source).toMatch(/renderTrigger\?:/);
  });
});
