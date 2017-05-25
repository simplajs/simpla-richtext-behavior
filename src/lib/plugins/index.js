export { default as getKeymapPlugin } from './keymap';
export { default as getCustomPlugins } from './custom';
export { default as getPlaceholderPlugin } from './placeholder';
export { default as getEventsPlugin } from './events';
export { default as getEditablePlugin } from './editable';
export { history as getHistoryPlugin } from 'prosemirror-history';
import {
  inputRules as makeInputRules,
  allInputRules
} from 'prosemirror-inputrules';

export function getInputRules(opts = {}) {
  let { rules = allInputRules } = opts;

  return makeInputRules({ rules });
}
