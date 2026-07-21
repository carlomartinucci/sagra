import { renderHook, fireEvent } from '@testing-library/react';
import useDetectKeypress from './useDetectKeypress';

const typeKeys = (text: string, init: any = {}) => {
  for (const key of text) {
    fireEvent.keyDown(document, { key, ...init });
  }
};

const fireBeforeInput = (data: string, inputType = 'insertText') => {
  // jsdom's InputEvent doesn't reliably support inputType, so build a plain
  // event carrying the same fields the hook reads.
  const event = new Event('beforeinput', { bubbles: true }) as any;
  event.inputType = inputType;
  event.data = data;
  fireEvent(document, event);
};

test('detects the word typed on a hardware keyboard', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  typeKeys('pizza');
  expect(callback).toHaveBeenCalledTimes(1);
});

test('detects the word regardless of case (Caps Lock, auto-capitalization)', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  typeKeys('PIZZA');
  expect(callback).toHaveBeenCalledTimes(1);
});

test('detects capitals typed with Shift held', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  typeKeys('Pizza'.charAt(0), { shiftKey: true });
  typeKeys('izza');
  expect(callback).toHaveBeenCalledTimes(1);
});

test('ignores keys pressed with ctrl, alt or meta modifiers', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  typeKeys('pizza', { ctrlKey: true });
  typeKeys('pizza', { altKey: true });
  typeKeys('pizza', { metaKey: true });
  expect(callback).not.toHaveBeenCalled();
});

test('does not fire on unrelated text', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  typeKeys('pasta al forno');
  expect(callback).not.toHaveBeenCalled();
});

test('fires again after a match (buffers reset)', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  typeKeys('pizza');
  typeKeys('pizza');
  expect(callback).toHaveBeenCalledTimes(2);
});

test('detects virtual keyboards that only emit beforeinput (keydown "Unidentified")', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  for (const char of 'pizza') {
    fireEvent.keyDown(document, { key: 'Unidentified' });
    fireBeforeInput(char);
  }
  expect(callback).toHaveBeenCalledTimes(1);
});

test('detects IME composition (insertCompositionText with cumulative data)', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  for (const partial of ['p', 'pi', 'piz', 'pizz', 'pizza']) {
    fireEvent.keyDown(document, { key: 'Unidentified' });
    fireBeforeInput(partial, 'insertCompositionText');
  }
  expect(callback).toHaveBeenCalledTimes(1);
});

test('fires once when keydown and beforeinput both report the same keystroke', () => {
  const callback = jest.fn();
  renderHook(() => useDetectKeypress('pizza', callback));

  // Typing inside a focused text input produces both events per keystroke.
  for (const char of 'pizza') {
    fireEvent.keyDown(document, { key: char });
    fireBeforeInput(char);
  }
  expect(callback).toHaveBeenCalledTimes(1);
});
