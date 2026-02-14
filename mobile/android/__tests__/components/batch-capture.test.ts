/**
 * Tests for batch-capture-utils.ts (canProceedToWizard, getActionOnCameraCancel)
 *
 * Verifies that navigation to wizard is blocked when no photos are captured.
 * Verifies cancel behavior: goBack when no photos, showChoice when has photos.
 * Mutation: invert return values → test should fail.
 */

import { canProceedToWizard, getActionOnCameraCancel } from '@/lib/batch-capture-utils';

describe('canProceedToWizard', () => {
  it('should return false when photoUris is empty', () => {
    expect(canProceedToWizard([])).toBe(false);
  });

  it('should return true when photoUris has at least one item', () => {
    expect(canProceedToWizard(['uri1'])).toBe(true);
  });

  it('should return true for multiple photos', () => {
    expect(canProceedToWizard(['uri1', 'uri2', 'uri3'])).toBe(true);
  });
});

describe('getActionOnCameraCancel', () => {
  it('should return goBack when photoUris is empty', () => {
    expect(getActionOnCameraCancel([])).toBe('goBack');
  });

  it('should return showChoice when photoUris has one item', () => {
    expect(getActionOnCameraCancel(['uri1'])).toBe('showChoice');
  });

  it('should return showChoice when photoUris has multiple items', () => {
    expect(getActionOnCameraCancel(['a', 'b', 'c'])).toBe('showChoice');
  });
});
