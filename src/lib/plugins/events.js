import { Plugin, PluginKey } from 'prosemirror-state';

export default function makeEventsPlugin(callbacks) {
  let { onBlur, onFocus, onSelect, onInput } = callbacks;

  return new Plugin({
    key: new PluginKey('events'),

    props: {
      onBlur: (view, event) => onBlur(event),
      onFocus: (view, event) => onFocus(event)
    },

    state: {
      init: (config, state) => ({ selection: state.selection }),

      apply: (tr, state, oldDocState, newDocState) => {
        let selection;

        selection = newDocState.selection;

        if (!state.selection.eq(selection)) {
          // Run callback in microtask queue so that the current transaction
          //  has been applied, if done immediately then view won't have updated
          //  yet
          Promise.resolve().then(() => onSelect(selection));
        }

        if (tr.docChanged) {
          Promise.resolve().then(onInput);
        }

        return { selection };
      }
    }
  });
}
