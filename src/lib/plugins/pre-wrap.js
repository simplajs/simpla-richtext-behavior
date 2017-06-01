import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const BLOCKS = ['p', 'h1', 'h2'];

function createStyleElement(tag) {
  let sheet = document.createElement('style');

  sheet.innerHTML =
    BLOCKS.map(block => `${tag}.ProseMirror ${block}`).join(',') +
    '{ white-space: pre-wrap; }';

  return sheet;
}

function getStyleWidget(tag) {
  return Decoration.widget(
    0,
    createStyleElement(tag),
    { key: 'pre-wrap-styles' }
  );
}

export default function getPreWrapBlocks({ element }) {
  const tag = element.tagName.toLowerCase();

  return new Plugin({
    props: {
      decorations(state) {
        return DecorationSet.create(state.doc, [
          getStyleWidget(tag)
        ]);
      }
    }
  });
}
