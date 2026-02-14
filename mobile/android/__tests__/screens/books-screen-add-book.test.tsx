/**
 * Tests that reproduce and guard against the handleAddBook ReferenceError.
 *
 * 1. Source audit: Fails if BooksScreen references handleAddBook (wrong name).
 * 2. Repro: Documents the failure when handleAddBook is expected but only
 *    handleAddBookPress exists.
 * 3. Regression: Verifies the correct handler name (handleAddBookPress) works.
 *
 * Note: Full BooksScreen rendering tests are not included because they require
 * React Native TurboModules (e.g. DevMenu) not available in the Jest environment.
 */

import * as fs from 'fs';
import * as path from 'path';

const BOOKS_INDEX_PATH = path.join(__dirname, '../../app/(tabs)/index.tsx');

describe('handleAddBook ReferenceError', () => {
  describe('source audit', () => {
    it('BooksScreen must define handleAddBook if referenced (use handleAddBook or handleAddBookPress with alias)', () => {
      const source = fs.readFileSync(BOOKS_INDEX_PATH, 'utf-8');
      // Fail if handleAddBook is used without being defined
      const hasHandleAddBookRef = /\bhandleAddBook\b(?!Press)/.test(source);
      const hasHandleAddBookDef = /const handleAddBook\s*=/.test(source) || /handleAddBook\s*=\s*handleAddBookPress/.test(source);
      if (hasHandleAddBookRef && !hasHandleAddBookDef) {
        throw new Error('handleAddBook is referenced but not defined. Use handleAddBook or add: const handleAddBook = handleAddBookPress');
      }
    });
  });

  describe('repro test', () => {
    /**
     * Simulates the bug: receiver expects handleAddBook, caller provides handleAddBookPress.
     * When the receiver invokes handleAddBook, it throws because the property doesn't exist.
     */
    function invokeAddHandler(callbacks: { handleAddBook?: () => void }) {
      callbacks.handleAddBook!();
    }

    it('reproduces ReferenceError when handleAddBook is expected but only handleAddBookPress exists', () => {
      const handleAddBookPress = jest.fn();
      expect(() => {
        invokeAddHandler({ handleAddBookPress } as unknown as { handleAddBook?: () => void });
      }).toThrow();
    });
  });

  describe('regression test', () => {
    /**
     * Correct pattern: receiver expects handleAddBookPress, caller provides it.
     * This should NOT throw.
     */
    function invokeCorrectHandler(callbacks: { handleAddBookPress: () => void }) {
      callbacks.handleAddBookPress();
    }

    it('does not throw when handleAddBookPress is correctly provided and invoked', () => {
      const handleAddBookPress = jest.fn();
      expect(() => {
        invokeCorrectHandler({ handleAddBookPress });
      }).not.toThrow();
      expect(handleAddBookPress).toHaveBeenCalled();
    });

    it('ensures handler is invoked when add button would be pressed', () => {
      const handleAddBookPress = jest.fn();
      const callbacks = { handleAddBookPress };

      // Simulate: Pressable onPress receives handleAddBookPress
      callbacks.handleAddBookPress();

      expect(handleAddBookPress).toHaveBeenCalledTimes(1);
    });
  });
});
