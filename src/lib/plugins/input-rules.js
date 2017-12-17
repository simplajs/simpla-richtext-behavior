import { inputRules } from 'prosemirror-inputrules';
import {
  ellipsis,
  emDash,
  blockQuoteRule,
  orderedListRule,
  bulletListRule,
  codeBlockRule,
  headingRule,
  smartQuotes
} from '../input-rules.js';

export default function buildInputRules(schema) {
  let rules = smartQuotes.concat(ellipsis, emDash);

  if (schema.nodes.blockquote) {
    rules.push(blockQuoteRule(schema.nodes.blockquote));
  }

  if (schema.nodes.ordered_list) {
    rules.push(orderedListRule(schema.nodes.ordered_list));
  }

  if (schema.nodes.bullet_list) {
    rules.push(bulletListRule(schema.nodes.bullet_list));
  }

  if (schema.nodes.code_block) {
    rules.push(codeBlockRule(schema.nodes.code_block));
  }

  if (schema.nodes.heading) {
    rules.push(headingRule(schema.nodes.heading, 6));
  }

  return inputRules({ rules });
}
