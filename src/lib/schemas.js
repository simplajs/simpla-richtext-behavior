import { marks, nodes } from 'prosemirror-schema-basic';
import {
  bulletList as unorderedListSpec,
  orderedList as orderedListSpec,
  listItem as listItemSpec
} from 'prosemirror-schema-list';

const sharedListSpec = { content: 'list_item+', group: 'block' };

const underlineNode = {
  parseDOM: [
    { tag: 'u' },
    {
      style: 'font-style',
      getAttrs: value => {
        if (value === 'underline') {
          return true;
        }
      }
    }
  ],

  toDOM: () => ['u']
};

const imgNode = {
  attrs: {
    src: {},
    alt: { default: null },
    title: { default: null },
    alignment: { default: 'center' }
  },
  group: 'block',
  draggable: true,
  parseDOM: [
    {
      tag: 'img[src]',
      getAttrs(dom) {
        let attrs = {
          src: dom.getAttribute('src'),
          title: dom.getAttribute('title'),
          alt: dom.getAttribute('alt')
        };

        if (dom.style.float === 'left' || dom.style.float === 'right') {
          attrs.alignment = dom.style.float;
        }

        return attrs;
      }
    }
  ],
  toDOM(node) {
    let { src, alt, title, alignment } = node.attrs, style = '';

    switch (alignment) {
    case 'center':
      style = 'display: block; margin-left: auto; margin-right: auto;';
      break;
    case 'left':
    case 'right':
      style = `float: ${alignment};`;
      break;
    }

    return ['img', { src, alt, title, style, 'data-alignment': alignment }];
  }
};

export const italic = { marks: { italic: marks.em } };
export const bold = { marks: { bold: marks.strong } };
export const link = { marks: { link: marks.link } };
export const underline = { marks: { underline: underlineNode } };

export const blockquote = { nodes: { blockquote: nodes.blockquote } };
export const heading = { nodes: { heading: nodes.heading } };
export const image = { nodes: { image: imgNode } };
export const list = {
  nodes: {
    orderedList: Object.assign({}, sharedListSpec, orderedListSpec),
    unorderedList: Object.assign({}, sharedListSpec, unorderedListSpec),
    list_item: Object.assign({ content: 'paragraph block*' }, listItemSpec)
  }
};

export const inline = {
  nodes: {
    doc: { content: 'inline*' },
    text: nodes.text,
    hardBreak: nodes.hard_break
  }
};

export const block = {
  nodes: {
    doc: { content: 'block+' },
    text: nodes.text,
    hardBreak: nodes.hard_break,
    paragraph: nodes.paragraph
  }
};
