/**
 * Utilities for the batch capture flow.
 */

/**
 * Returns whether the user can proceed from capture to the add wizard.
 * Requires at least one photo to be captured.
 */
export function canProceedToWizard(photoUris: string[]): boolean {
  return photoUris.length > 0;
}

/**
 * Returns the action to take when the user cancels the camera (closes without capturing).
 * - 'goBack': no photos yet, go back to previous screen
 * - 'showChoice': has photos, show Continue/Stop choice
 */
export function getActionOnCameraCancel(photoUris: string[]): 'goBack' | 'showChoice' {
  return photoUris.length === 0 ? 'goBack' : 'showChoice';
}
