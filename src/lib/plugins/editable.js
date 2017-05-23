import { Plugin, PluginKey } from 'prosemirror-state';

export default function getEditablePlugin(options = {}) {
  let { editable = false } = options;

  return new Plugin({
    key: new PluginKey('editable'),

    props: {
      editable(state) {
        return this.getState(state).editable;
      }
    },

    state: {
      init() {
        return { editable };
      },

      apply(tr, currentState) {
        let editable = tr.getMeta(this.key);

        if (typeof editable !== 'undefined') {
          return { editable }
        }

        return currentState;
      }
    }
  });
}
