import getKeymapPlugin from './keymap';
import getCustomPlugins from './custom';
import getPlaceholderPlugin from './placeholder';
import getEventsPlugin from './events';
import getEditablePlugin from './editable';
import {
  inputRules as makeInputRules,
  allInputRules
} from 'prosemirror-inputrules';

function getInputRules(opts = {}) {
  let { rules = allInputRules } = opts;

  return makeInputRules({ rules });
}

export {
  getKeymapPlugin,
  getCustomPlugins,
  getEventsPlugin,
  getPlaceholderPlugin,
  getEditablePlugin,
  getInputRules
};
