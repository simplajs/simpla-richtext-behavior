import { keymap as makeKeymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { insertBr } from '../commands';

export default function getKeymapPlugin({ inline }) {
  return makeKeymap(
    Object.assign({}, baseKeymap, {
      'Mod-z': undo,
      'Shift-Mod-z': redo,
      [inline ? 'Enter' : 'Mod-Enter']: insertBr()
    })
  );
}
