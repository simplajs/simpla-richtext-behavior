import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model';
import {
  getCustomPlugins,
  getPlaceholderPlugin,
  getEventsPlugin,
  getInputRules,
  getKeymapPlugin,
  getEditablePlugin
} from './plugins';
import { flatten, mergeSchemaSpecs, privateKey } from './utils';
import * as schemas from './schemas';
import mitt from 'mitt';

const SETUP = privateKey('setup'),
      VIEW = privateKey('view'),
      PARSER = privateKey('parser'),
      SERIALIZER = privateKey('serializer'),
      EMITTER = privateKey('emitter'),
      WITH_PLUGIN = privateKey('withPlugin'),
      EDITABLE_KEY = privateKey('editableKey'),
      INLINE = privateKey('inline'),
      PLACEHOLDER = privateKey('placeholder'),
      ELEMENT = privateKey('element'),
      SELECTION = privateKey('selection'),
      TYPEOGRAPHER = privateKey('typographer'),
      PLUGINS = privateKey('plugins'),
      SELECTED_PLUGINS = privateKey('selectedPlugins');

export default class {
  constructor(element, options = {}) {
    const {
      plugins = [],
      inline = false,
      typeographer = false,
      placeholder = '',
      editable = false
    } = options;

    this[SELECTED_PLUGINS] = plugins;
    this[PLUGINS] = {};
    this[ELEMENT] = element;
    this[INLINE] = inline;
    this[TYPEOGRAPHER] = typeographer;
    this[PLACEHOLDER] = placeholder;
    this[EMITTER] = mitt();
    this[SETUP]({ editable });
  }

  [SETUP]({ editable } = {}) {
    let doc,
        schema,
        emit,
        state,
        customPlugins,
        editablePlugin,
        plugins;

    customPlugins = this[SELECTED_PLUGINS];
    this[PLUGINS] = customPlugins.reduce((asObj, name) => {
      asObj[name] = {};
      return {};
    }, {});

    emit = this[EMITTER].emit;

    schema = new Schema(
      mergeSchemaSpecs([
        this.inline ? schemas.inline : schemas.block,
        ...customPlugins.map(name => schemas[name])
      ])
    );

    this[PARSER] = DOMParser.fromSchema(schema);
    this[SERIALIZER] = DOMSerializer.fromSchema(schema);

    doc = this[PARSER].parse(this.element);

    editablePlugin = getEditablePlugin({ editable: editable || this.editable });
    this[EDITABLE_KEY] = editablePlugin.key;

    plugins = flatten([
      this.typeographer ? getInputRules() : [],
      editablePlugin,
      getCustomPlugins({
        schema,
        plugins: customPlugins,
        onChange: (plugin) => {
          this[PLUGINS][plugin.name] = plugin;
          emit('plugin', plugin);
        }
      }),
      getKeymapPlugin({ inline: this.inline }),
      getPlaceholderPlugin({ text: this.placeholder }),
      getEventsPlugin({
        onBlur: event => emit('blur', event),
        onFocus: event => emit('focus', event),
        onInput: () => emit('input'),
        onSelect: (selection) => {
          this[SELECTION] = selection ? this[VIEW].root.getSelection() : null;
          emit('select', { selection: this[SELECTION] });
        }
      })
    ]);

    state = EditorState.create({ doc, schema, plugins });

    if (this[VIEW]) {
      this[VIEW].updateState(state);
    } else {
      this[VIEW] = new EditorView({ mount: this.element }, { state });
    }
  }

  get editable() {
    return !!(this[VIEW] && this[VIEW].editable);
  }

  set editable(value) {
    let { state } = this[VIEW];

    this[VIEW].updateState(
      state.apply(state.tr.setMeta(this[EDITABLE_KEY], value))
    );
  }

  get inline() {
    return this[INLINE];
  }

  get placeholder() {
    return this[PLACEHOLDER];
  }

  get typeographer() {
    return this[TYPEOGRAPHER];
  }

  get selection() {
    return this[SELECTION];
  }

  get element() {
    return this[ELEMENT];
  }

  get plugins() {
    return this[PLUGINS];
  }

  /**
   * Listen to given event
   * @param  {string}   event    Name of event to listen to
   * @param  {Function} callback Function to call on event
   * @return {undefined}
   */
  on(event, callback) {
    this[EMITTER].on(event, callback);
  }

  /**
   * Stop listening to given event
   * @param  {string}   event    Name of event to stop listening to
   * @param  {Function} callback Previously passed callback to remove
   * @return {undefined}
   */
  off(event, callback) {
    this[EMITTER].off(event, callback);
  }

  /**
   * Focus on the editors element. Restores previous selection before blur
   * @return {undefined}
   */
  focus() {
    this[VIEW].focus();
  }

  /**
   * Set current HTML to given value. Will parse and sanitize any given HTML based
   *  on the current schema
   * @param  {string} value HTML string to set
   * @return {undefined}
   */
  setHTML(value) {
    let div = document.createElement('div'),
        { [VIEW]: view, [PARSER]: parser } = this,
        doc = view.state.doc,
        slice;

    div.innerHTML = value;
    slice = parser.parseSlice(div, { preserveWhitespace: true });

    view.dispatch(view.state.tr.replace(0, doc.content.size, slice));
  }

  /**
   * Get the current HTML value. Will return sanitized HTML that excludes ProseMirror
   *  objects such as custom views and widgets
   * @return {string} Sanitized HTML
   */
  getHTML() {
    let { [VIEW]: view, [SERIALIZER]: serializer } = this,
        fragment = serializer.serializeFragment(view.state.doc.content),
        div = document.createElement('div');

    div.appendChild(fragment);

    return div.innerHTML;
  }

  embed(item, options) {
    this[WITH_PLUGIN](item, 'embed', options);
  }

  /**
   * Format currently selected text
   * @throws {Error}  Throws error if formatter type not found
   * @param  {string}  name    Name of formatting to apply
   * @param  {Object=} options Options to pass to formatter e.g. link requires
   *                            a href option
   * @return {undefined}
   */
  format(name, options) {
    this[WITH_PLUGIN](name, 'apply', options);
  }

  /**
   * Remove given formatting from currently selected text
   * @throws {Error}  Throws error if formatter type not found
   * @param  {string}  name    Name of formatting to remove
   * @return {undefined}
   */
  removeFormat(name) {
    this[WITH_PLUGIN](name, 'remove');
  }

  /**
   * Toggle given formatting on currently selected text
   * @throws {Error}  Throws error if formatter type not found
   * @param  {string}  name    Name of formatting to apply / remove
   * @param  {Object=} options Options to pass to formatter when toggle applies
   *                            formatting
   * @return {undefined}
   */
  toggleFormat(name, options) {
    this[WITH_PLUGIN](name, 'toggle', options);
  }

  /**
   * Add given plugins to editor
   * @param {Array<Plugin>} toAdd Plugins to add
   * @return {undefined}
   */
  addPlugins(toAdd) {
    let current = this[SELECTED_PLUGINS],
        notAlreadySelected;

    notAlreadySelected = (plugin) => current.indexOf(plugin) === -1;

    this[SELECTED_PLUGINS] = toAdd.filter(notAlreadySelected).concat(current);

    this[SETUP]();
  }

  /**
   * Remove given plugins from editor
   * @param {Array<Plugin>} toRemove Plugins to remove
   * @return {undefined}
   */
  removePlugins(toRemove) {
    let current = this[SELECTED_PLUGINS],
        notToRemove;

    notToRemove = (plugin) => toRemove.indexOf(plugin) === -1;

    this[SELECTED_PLUGINS] = current.filter(notToRemove);

    this[SETUP]();
  }

  [WITH_PLUGIN](name, fn, options) {
    let { state, dispatch } = this[VIEW],
        definition;

    for (let i = 0, k = state.plugins.length; i < k && !definition; i++) {
      if (state.plugins[i].name === name) {
        definition = state.plugins[i].definition;
      }
    }

    if (!definition) {
      throw new Error(`Plugin for '${name}' not found`);
    }

    return definition[fn](options)(state, dispatch);
  }
}
