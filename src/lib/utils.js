import { NodeSelection } from 'prosemirror-state';
import { toggleMark, toggleBlock, toggleWrapping } from './commands';

/**
 * Takes an array of schema specs and merges them into one spec.
 * @param  {Array<Object>} specs Schema specifictation
 * @return {Object}              Single merged schema
 */
export function mergeSchemaSpecs(specs) {
  return specs.reduce(
    (merged, spec) => {
      return {
        nodes: Object.assign({}, merged.nodes, spec.nodes),
        marks: Object.assign({}, merged.marks, spec.marks)
      };
    },
    { nodes: {}, marks: {} }
  );
}

/**
 * Flattens out the given multi-dimensional list of items
 * @param  {Array} items    Items to flatten out
 * @return {Array}          Single dimensional array of items
 */
export function flatten(items) {
  return items.reduce((flattened, item) => {
    if (Array.isArray(item)) {
      return flattened.concat(flatten(item));
    }

    return [...flattened, item];
  }, []);
}

/**
 * Find marks in the current selection
 * @param  {string} name  Name of mark to try find
 * @param  {State}  state Current prosemirror state
 * @return {Mark}         Mark if found, null otherwise
 */
export const findMark = name => state => {
  let found = null,
      { doc, selection, schema } = state,
      { from, to } = selection,
      type = schema.marks[name];

  doc.nodesBetween(from, to, ({ marks }) => {
    for (var i = 0, k = marks.length; !found && i < k; i++) {
      if (marks[i].type === type) {
        found = marks[i];
      }
    }

    return !found;
  });

  return found;
};

/**
 * Whether or not mark is applied
 * @param {string} name Name of mark to check
 * @return {function}   Function which takes a state param. Returns true if
 *                       can be applied, false otherwise
 */
export const markIsApplied = name => state => !!findMark(name)(state);

/**
 * Whether or not mark can be toggled
 * @param {string} name Name of mark to check
 * @return {function}   Function which takes a state param. Returns true if
 *                       applied, false otherwise
 */
export const canToggleMark = name => toggleMark(name)();

/**
 * Get the current block relative to the current selection
 * @param  {number} depth Depth relative to the current selection
 * @return {Function}     Function which takes the current state
 */
export const getBlock = depth => state => {
  let { $from, $to } = state.selection,
      absoluteDepth = depth >= 0 ? depth + $from.depth : depth;

  if (state.selection instanceof NodeSelection) {
    return state.selection.node;
  }

  if (!$from.depth || $to.pos > $from.end()) {
    return null;
  }

  return $from.node(absoluteDepth);
};

/**
 * Get the current block the selection is in
 * @param   {EditorState} state State of editor
 * @return  {Node}              Node of current block or null if not in block
 */
export const getCurrentBlock = getBlock(0);

/**
 * Get the parent block of the current selection
 * @param   {EditorState} state State of editor
 * @return  {Node}              Node of parent block or null if no parent block
 */
export const getParentBlock = getBlock(-1);

/**
 * Check current block matches given node name
 * @param {string} node Name of node to check
 * @return {function}   Function which takes a state param. Returns true if current
 *                        node matches name, false otherwise
 */
export const currentBlockIs = node => state => {
  let block = getCurrentBlock(state);
  return !!(block && block.type === state.schema.nodes[node]);
};

/**
 * Check if current block is wrapped in the given node
 * @param  {string} node Name of node to check for
 * @return {Function}    Function which takes state of editor as argument. Returns
 *                         true if state's selected block is wrapped in given node
 */
export const wrappedIn = node => state => {
  let block = getParentBlock(state);
  return !!(block && block.type === state.schema.nodes[node]);
};

/**
 * Check if can toggle block on or off based on the given node
 * @param   {string}  node  Name of node to use for block
 * @return  {Function}      Function which takes state of editor as argument.
 *                            Returns true if block can be toggled
 */
export const canToggleBlock = node => toggleBlock(node)();

/**
 * Check if current block can be wrapped in given node
 * @param   {string}  node  Name of node to check for
 * @return  {Function}      Function which takes state of editor as argument.
 *                            Returns true if block can be wrapped in given node
 */
export const canToggleWrapping = node => toggleWrapping(node)();

/**
 * Check if values of 'a' and 'b' are equal. Expects only valid JSON types.
 * @param  {mixed} a First object to compare
 * @param  {mixed} b Object to compare with a
 * @return {boolean} Boolean if a and b are deep equal, false otherwise
 */
export function jsonIsEqual(a, b) {
  let objectName = window.toString.call(a),
      isSameAsIn = other => (item, i) => jsonIsEqual(item, other[i]),
      hasSameIn = (a, b) => key => {
        return key in a && key in b && jsonIsEqual(a[key], b[key]);
      },
      keysOfA;

  if (objectName !== toString.call(b)) {
    return false;
  }

  switch (objectName) {
  case '[object String]':
  case '[object Number]':
  case '[object Boolean]':
  case '[object Null]':
  case '[object Undefined]':
    return a === b;
  }

  if (Array.isArray(a)) {
    return a.length === b.length && a.every(isSameAsIn(b));
  }

  // At this point we assume it's an object
  keysOfA = Object.keys(a);

  if (keysOfA.length !== Object.keys(b).length) {
    return false;
  }

  return keysOfA.every(hasSameIn(a, b));
}

/**
 * Changes the RegExp to accept both regular spaces and non-breaking spaces.
 * @param  {RegExp} regexp Source regexp to swap spaces out of
 * @return {RegExp}        RegExp which accepts spaces and non-breaking spaces
 */
export function acceptNbsp(regexp) {
  return new RegExp(regexp.toString().replace(' ', '( |\u00a0)').slice(1, -1));
}

/**
 * Functional if...then...else. Condition function should be arity of 2 and take
 *  a node / mark name then take a state. WhenTrue and WhenFalse should both be
 *  arity 3; taking first a node / mark name, then options and finally a state.
 *  whenTrue will run if condition returns true, whenFalse if otherwise
 * @param  {Function} condition Curried function of arity 2
 * @param  {Function} whenTrue  Curried function of arity 3
 * @param  {Function} whenFalse Curried function of arity 3
 * @return {Function}           Curried Function with arity 3, taking name, then
 *                                options then state and dispatch.
 */
export const ifThenElse = (condition, whenTrue, whenFalse) => name => opts => (
  state,
  dispatch
) => {
  let command = condition(name)(state) ? whenTrue : whenFalse;
  return command(name)(opts)(state, dispatch);
};

/**
 * Convert the give ProseMirror command to a curried functional command. Expects
 *  given ProseMirror command to be arity 2, first taking name and optionally attributes
 *  then taking state and optionally dispatch. Will also convert the given name
 *  to a node / mark based on the given collection
 *  e.g. convertPmCommand('marks')(toggleMark)('link')({ href: 'https://google.com '})
 * @param  {string} collection Either nodes or marks
 * @return {Function}          Function to take pmCommand
 */
const convertPmCommand = collection => command => name => attrs => (
  state,
  dispatch
) => {
  return command(state.schema[collection][name], attrs)(state, dispatch);
};

/**
 * Convert given ProseMirror mark command to functional command
 * @see convertPmCommand
 */
export const convertMarkCommand = convertPmCommand('marks');

/**
 * Convert given ProseMirror node command to functional command
 * @see convertPmCommand
 */
export const convertNodeCommand = convertPmCommand('nodes');

/**
 * Checks if the current node block is empty
 * @param  {EditorState}  state ProseMirror editor state
 * @return {Boolean}            True if current node has empty contents. False otherwise
 */
const isEmptyBlock = state => {
  let block = getCurrentBlock(state);

  return block.content.size === 0;
};

/**
 * Checks if the given node can replace the current selection
 * @param  {string} node Name of node to check
 * @return {Function}    Function which takes a state and return true if can
 *                         replace current selection with given node, false otherwise
 */
const canReplace = node => state => {
  let $from = state.selection.$from, nodeType = state.schema.nodes[node];

  for (let d = $from.depth; d >= 0; d--) {
    let index = $from.index(d);

    if ($from.node(d).canReplaceWith(index, index, nodeType)) {
      return true;
    }
  }
};

/**
 * Check if current selection is at the given depth
 * @param  {number}  depth  Integer to check current depth
 * @return {Function}       Function which takes state and return true if selection
 *                            is at current depth, false otherwise
 */
const atDepth = depth => state => {
  let { $from } = state.selection;
  return $from.depth === depth;
};

/**
 * Checks if given node can be embedded given the current state
 * @param  {string} node Name of node to check
 * @return {Function}    Function which takes a state and return true if can
 *                         embed given node into given state
 */
export const canEmbed = node => state => {
  return atDepth(1)(state) && isEmptyBlock(state) && canReplace(node)(state);
};

/**
 * Find the node using the given getter and return it's attributes
 * @param  {Function} getter Function which should take a state and return a node
 *                            or null
 * @return {Function}        Function which takes a state and returns attributes
 *                            or null
 */
export const attrsFor = getter => state => {
  let node = getter(state);
  return node ? node.attrs : null;
};

/**
 * Make a private key for use as an object property name. If Symbols are supported,
 *  it will use a Symbol. Otherwise it'll use the given description with a `__`
 *  prefix and integer suffix
 * @param  {[type]} description [description]
 * @return {[type]}             [description]
 */
export const privateKey = (() => {
  let map = {};

  return (description) => {
    if (window.Symbol) {
      return Symbol(description);
    }

    map[description] = map[description] ? map[description] + 1 : 0;

    return `__${description}$${map[description]}`;
  }
})();
