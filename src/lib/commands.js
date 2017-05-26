import { NodeSelection } from 'prosemirror-state';
import { splitListItem as baseSplitListItem } from 'prosemirror-schema-list';
import {
  convertMarkCommand,
  convertNodeCommand,
  currentBlockIs,
  markIsApplied,
  ifThenElse,
  wrappedIn
} from './utils';
import {
  toggleMark as pmToggleMark,
  wrapIn as pmWrapIn,
  chainCommands,
  setBlockType,
  exitCode,
  lift
} from 'prosemirror-commands';

const DEFAULT_BLOCK_TYPE = 'paragraph';
const respondWith = value => () => () => () => value;

/**
 * Command to set the current text block to the given node
 * @param  {string}   name   Name of node to set current block to
 * @param  {object=}  attrs  Optional attributes to apply to node
 * @return {Function}        Command to apply to state
 */
export const setBlockTo = convertNodeCommand(setBlockType);

/**
 * Command to reset the current text block to the default block type
 * @param  {object=}  attrs  Optional attributes to apply to node default node
 * @return {Function}        Command to apply to state
 */
export const resetBlock = () => setBlockTo(DEFAULT_BLOCK_TYPE);

/**
 * Command to toggle between the given block type and the default block type
 * @param  {string}   name   Name of node to toggle block to
 * @param  {object=}  attrs  Optional attributes to apply to block node
 * @return {Function}        Command to apply to state
 */
export const toggleBlock = ifThenElse(currentBlockIs, resetBlock, setBlockTo);

/**
 * Command to toggle the given mark
 * @param  {string} name    Name of the mark to toggle
 * @param  {object=} attrs  Options to apply to the mark if toggling with apply
 * @return {Function}       Command to apply to state
 */
export const toggleMark = convertMarkCommand(pmToggleMark);

/**
 * Insert br at current cursor
 * @return {Function}     Command to apply to state
 */
export function insertBr() {
  return chainCommands(exitCode, (state, dispatch) => {
    dispatch(
      state.tr
        .replaceSelectionWith(state.schema.nodes.hardBreak.create())
        .scrollIntoView()
    );
    return true;
  });
}

/**
 * Apply mark with given name and attrs at current selection / cursor
 * @param  {string}   mark  Name of mark to apply
 * @param  {object=}  attrs Optional attributes to pass to mark
 * @return {Function}       Command to apply to state
 */
export const applyMark = ifThenElse(
  markIsApplied,
  respondWith(false),
  toggleMark
);

/**
 * Remove mark with given name
 * @param  {string}   mark  Name of mark to remove
 * @return {Function}       Command to apply to state
 */
export const removeMark = ifThenElse(
  markIsApplied,
  toggleMark,
  respondWith(false)
);

/**
 * Curried function which wraps the selected block in the given node, with
 *  given attributes
 * @param  {string}   node  Name of node to wrap block in
 * @param  {Object=}  attrs Optional attributes to pass to the node
 * @return {Function}       Command to apply to state
 */
export const wrapIn = ifThenElse(
  wrappedIn,
  respondWith(false),
  convertNodeCommand(pmWrapIn)
);

/**
 * Curried function which unwraps the selected block of the given node. If
 *  selected block is not wrapped by given node, nothing happens
 * @param  {string}   node  Name of node to wrap block in
 * @return {Function}       Command to apply to state
 */
export const unwrapFrom = ifThenElse(
  wrappedIn,
  () => () => lift,
  respondWith(false)
);

/**
 * Curried function which toggles the wrapping of the given node around the current
 *  selection.
 * @param  {string}   node  Name of node to wrap block in
 * @param  {Object=}  attrs Optional attributes to pass to the node if wrapping
 * @return {Function}       Command to apply to state
 */
export const toggleWrapping = ifThenElse(wrappedIn, unwrapFrom, wrapIn);

/**
 * Split the current list item into two list items. Curried function with arity
 *  of 2.
 */
export const splitListItem = convertNodeCommand(baseSplitListItem);

/**
 * Replace current block with a block of the given node
 * @param  {String}  node   Node to replace current block with
 * @param  {Object=} attrs  Optional attributes to give to node
 * @return {Function}       Command to apply to state
 */
const replaceCurrentBlock = node => attrs => (state, dispatch) => {
  let nodeType = state.schema.nodes[node],
      tr = state.tr.replaceSelectionWith(nodeType.createAndFill(attrs));

  dispatch(
    tr.setSelection(NodeSelection.create(tr.doc, state.selection.from))
  );

  return true;
};

/**
 * Insert block of given node type before current block
 * @param  {String}  node   Block node to insert
 * @param  {Object=} attrs  Optional attributes to give to node
 * @return {Function}       Command to apply to state
 */
const insertBlockBefore = node => attrs => (state, dispatch) => {
  let nodeType = state.schema.nodes[node],
      { from } = state.selection;

  dispatch(state.tr.insert(from - 1, nodeType.createAndFill(attrs)));

  return true;
}

/**
 * Embed the given node into the current state. Embeds can replace current blocks
 *  or swap the current block to the given node
 * @param  {string}   node  Name of node to embed
 * @param  {Object=}  attrs Optional attributes to pass to the node if wrapping
 * @return {Function}       Command to apply to state
 */
export const embed = ifThenElse(currentBlockIs, replaceCurrentBlock, insertBlockBefore);
