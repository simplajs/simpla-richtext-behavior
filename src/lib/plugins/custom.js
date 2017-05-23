import { Plugin as ProseMirrorPlugin, PluginKey } from 'prosemirror-state';
import { keymap as makeKeymapPlugin } from 'prosemirror-keymap';
import { inputRules as makeInputRulesPlugin } from 'prosemirror-inputrules';
import { jsonIsEqual } from '../utils';
import * as definitions from './custom-definitions';

class StatePlugin extends ProseMirrorPlugin {
  constructor({ definition, onChange }) {
    const { type, name, isApplicable, isApplied, getMeta } = definition;

    const getState = docState => {
      return {
        name,
        type,
        applicable: isApplicable(docState),
        applied: isApplied(docState),
        meta: getMeta ? getMeta(docState) : null
      };
    };

    super({
      key: new PluginKey(name),

      state: {
        init: (config, docState) => {
          let state = getState(docState);

          onChange(state);

          return state;
        },

        apply: (tr, currentState, oldDocState, newDocState) => {
          let state = getState(newDocState);

          if (!jsonIsEqual(currentState, state)) {
            onChange(state);
            return state;
          }

          return currentState;
        }
      }
    });

    this.name = name;
    this.type = type;
    this.definition = definition;
  }
}

export default ({ plugins, onChange, schema }) => {
  return plugins.map(plugin => {
    let definition = definitions[plugin],
        pmPlugins = [new StatePlugin({ definition, onChange })];

    if (definition.keymap) {
      pmPlugins.push(makeKeymapPlugin(definition.keymap));
    }

    if (definition.getInputRules) {
      pmPlugins.push(
        makeInputRulesPlugin({
          rules: definition.getInputRules({ schema })
        })
      );
    }

    return pmPlugins;
  });
};
