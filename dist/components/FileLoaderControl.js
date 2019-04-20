import { setOptions, GeoJSON, Util, FeatureGroup, DomEvent, Control as Control$1 } from 'leaflet';
import toGeoJSON from 'togeojson';
import uuid from 'uuid';

var Options = {
  props: {
    options: {
      type: Object,
      default: function () { return ({}); }
    }
  }
};

var Control = {
  props: {
    position: {
      type: String,
      default: 'topright'
    }
  },
  mounted: function mounted () {
    this.controlOptions = {
      position: this.position
    };
  },
  beforeDestroy: function beforeDestroy () {
    if (this.mapObject) {
      this.mapObject.remove();
    }
  }
};

var capitalizeFirstLetter = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

var propsBinder = function (vueElement, leafletElement, props, options) {
  var loop = function ( key ) {
    var setMethodName = 'set' + capitalizeFirstLetter(key);
    var deepValue = (props[key].type === Object) ||
      (props[key].type === Array) ||
      (Array.isArray(props[key].type));
    if (props[key].custom && vueElement[setMethodName]) {
      vueElement.$watch(key, function (newVal, oldVal) {
        vueElement[setMethodName](newVal, oldVal);
      }, {
        deep: deepValue
      });
    } else if (setMethodName === 'setOptions') {
      vueElement.$watch(key, function (newVal, oldVal) {
        setOptions(leafletElement, newVal);
      }, {
        deep: deepValue
      });
    } else if (leafletElement[setMethodName]) {
      vueElement.$watch(key, function (newVal, oldVal) {
        leafletElement[setMethodName](newVal);
      }, {
        deep: deepValue
      });
    }
  };

  for (var key in props) { loop( key ); }
};

var collectionCleaner = function (options) {
  var result = {};
  for (var key in options) {
    var value = options[key];
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

var optionsMerger = function (props, instance) {
  var options = instance.options && instance.options.constructor === Object ? instance.options : {};
  props = props && props.constructor === Object ? props : {};
  var result = collectionCleaner(options);
  props = collectionCleaner(props);
  var defaultProps = instance.$options.props;
  for (var key in props) {
    var def = defaultProps[key] ? defaultProps[key].default : Symbol('unique');
    if (result[key] && def !== props[key]) {
      console.warn((key + " props is overriding the value passed in the options props"));
      result[key] = props[key];
    } else if (!result[key]) {
      result[key] = props[key];
    }
  }  return result;
};

var findRealParent = function (firstVueParent) {
  var found = false;
  while (!found) {
    if (firstVueParent.mapObject === undefined) {
      firstVueParent = firstVueParent.$parent;
    } else {
      found = true;
    }
  }
  return firstVueParent;
};

/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/4/19
 *
 **/

var FileLoaderError = {
  parameter: '未发现文件！',
  type: '不支持该文件类型！',
  fileSize: '文件长度超过最大限制！',
  noLayers: '没有图层信息！'
};


var FileLoaderEvent = {
  loading: 'data:loading',
  error: 'data:error',
  loaded: 'data:loaded'
};

var FileLoaderLayer = GeoJSON.extend({
  options: {
    fileSizeLimit: 1024,
    error: FileLoaderError
  },
  fileInfo: {filename: undefined, format: undefined},
  initialize: function (options) {
    this.id = uuid();
    Util.setOptions(this, options);
    this._parsers = {
      geojson: this._loadGeoJSON,
      json: this._loadGeoJSON,
      gpx: this._convertToGeoJSON,
      kml: this._convertToGeoJSON,
    };
    GeoJSON.prototype.initialize.call(this, {
      features: []
    }, this.options);
  },
  load: function (file, ext) {
    var parser,
      reader;
    // Check file is defined
    if (this._isParameterMissing(file, 'file')) {
      return false;
    }

    // Check file size
    if (!this._isFileSizeOk(file.size)) {
      return false;
    }

    // Get parser for this data type
    parser = this._getParser(file.name, ext);
    if (!parser) {
      return false;
    }

    this.fileInfo = {filename: file.name, format: parser.ext};
    // Read selected file using HTML5 File API
    reader = new FileReader();
    var self = this;
    reader.onload = Util.bind(function (e) {
      try {
        self.fire(FileLoaderEvent.loading, self);
        parser.processor.call(this, e.target.result, parser.ext);
        self.fire(FileLoaderEvent.loaded, self);
      } catch (err) {
        console.log('load ', err);
        self.fire(FileLoaderEvent.error, err, self);
      }
    }, this);
    // Testing trick: tests don't pass a real file,
    // but an object with file.testing set to true.
    // This object cannot be read by reader, just skip it.
    if (!file.testing) {
      reader.readAsText(file);
    }
    // We return this to ease testing
    return reader;
  },

  loadMultiple: function (files, ext) {
    var readers = [];
    if (files[0]) {
      files = Array.prototype.slice.apply(files);
      while (files.length > 0) {
        readers.push(this.load(files.shift(), ext));
      }
    }
    // return first reader (or false if no file),
    // which is also used for subsequent loadings
    return readers;
  },

  loadData: function (data, name, ext) {
    var parser;
    // Check required parameters
    if ((this._isParameterMissing(data, 'data'))
      || (this._isParameterMissing(name, 'name'))) {
      return;
    }

    // Check file size
    if (!this._isFileSizeOk(data.length)) {
      return;
    }

    // Get parser for this data type
    parser = this._getParser(name, ext);
    if (!parser) {
      return;
    }
    this.file = {filename: name, format: parser.ext};

    // Process data
    try {
      this.fire(FileLoaderEvent.loading, {filename: name, format: parser.ext});
      parser.processor.call(this, data, parser.ext);
      this.fire(FileLoaderEvent.loaded, this);
    } catch (err) {
      console.log('loadData ', err);
      this.fire(FileLoaderEvent.error, err, this);
    }
  },

  _isParameterMissing: function (v, vname) {
    if (typeof v === 'undefined') {
      console.log('_isParameterMissing: ', vname);
      this.fire(FileLoaderEvent.error, new Error(this.options.error.parameter), this);
      return true;
    }
    return false;
  },

  _getParser: function (name, ext) {
    var parser;
    ext = ext || name.split('.').pop();
    parser = this._parsers[ext];
    if (!parser) {
      console.log('unsupport type : ', ext);
      this.fire(FileLoaderEvent.error, new Error(this.options.error.type), this);
      return undefined;
    }
    return {
      processor: parser,
      ext: ext
    };
  },

  _isFileSizeOk: function (size) {
    var fileSize = (size / 1024).toFixed(4);
    if (fileSize > this.options.fileSizeLimit) {
      console.log('_isFileSizeOk: ', 'File size exceeds limit (' +
        fileSize + ' > ' +
        this.options.fileSizeLimit + 'kb)');
      this.fire(FileLoaderEvent.error, new Error(this.options.error.fileSize), this);
      return false;
    }
    return true;
  },

  _loadGeoJSON: function _loadGeoJSON(content) {
    if (typeof content === 'string') {
      content = JSON.parse(content);
    }
    this.addData(content);

    if (this.getLayers().length === 0) {
      throw new Error(this.options.error.noLayers);
    }
  },

  _convertToGeoJSON: function _convertToGeoJSON(content, format) {
    var geojson;
    // Format is either 'gpx' or 'kml'
    if (typeof content === 'string') {
      content = (new window.DOMParser()).parseFromString(content, 'text/xml');
    }
    geojson = toGeoJSON[format](content);
    return this._loadGeoJSON(geojson);
  }

});

/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/4/19
 * 传进来的参数，既可以是 文件，即加载本地对象
 * 如果参数为 function ，方法，即返回数据的格式为{data:data,ext:ext,filename}
 * 文件的文件名可以是.shp ,.zip
 **/

var ShapeOptions = {
  error: {
    type: '不支持该格式的文件！'
  },
  ext: undefined,
  params: undefined

};

var ShapeEvent = {
  loading: 'shp:loading',
  error: 'shp:error',
  loaded: 'shp:loaded'
};


var ShapeLayer = GeoJSON.extend({

  options: Object.assign({}, ShapeOptions,
    {ext: undefined,
    params: undefined}),

  fileInfo: {filename: undefined, format: undefined},

  initialize: function (file, options) {
    this.id = uuid();
    Util.setOptions(this, options);
    if (options&&options.file) {
      this.fileInfo = Object.assign({}, options.file);
    }
    GeoJSON.prototype.initialize.call(this, {
      features: []
    }, this.options);
    if (file) {
      this.addFileData(file);
    }
  },

  addFileData: function (file) {
    if (!file) {
      console.log('addFileData file is null !');
      this.clearLayers();
    }
    var self = this;
    self.fire(ShapeEvent.loading, self);
    var error = this.options.error;
    if (typeof file === 'function') {
      file(self.options.params)
        .then(function (ref) {
          var data = ref.data;
          var ext = ref.ext;
          var filename = ref.filename;

          self.fileInfo = {filename: filename, format: ext};
          self._loadArrayBuffer(data, filename, ext);
          self.fire(ShapeEvent.loaded, self);
        })
        .catch(function (e) {
          console.log('ShapeLayer error ', e);
          self.fire(ShapeEvent.error, e, self);
        });
    } else if (typeof file === 'object') {
      this.loadLocalFile(file);
    } else if (typeof file === 'string') {
      shp(file).then(function (data) {
        self.addData(data);
        self.fire(ShapeEvent.loaded, self);
      }).catch(function (e) {
        console.log('shp load error ', e);
        self.fire(ShapeEvent.error, e, self);
      });
    } else {
      self.fire(ShapeEvent.error, {message: error.type}, self);
      console.log('ShapeLayer error addFileData 2', error);
    }
  },
  loadLocalFile: function (file) {
    var filename = file.name;
    var ext = this.options.ext || filename.split('.').pop();
    var self = this;
    self.fileInfo = {filename: filename, format: ext};
    var fileReader = new FileReader();
    fileReader.onload = Util.bind(function (ev) {
      var data = ev.target.result;
      try {
        self._loadArrayBuffer(data, filename, ext);
        self.fire(ShapeEvent.loaded, self);
      } catch (e) {
        console.log('ShapeLayer fileReader ', e);
        self.fire(ShapeEvent.error, e, self);
      }
    });
    fileReader.readAsArrayBuffer(file);
  },
  _loadArrayBuffer: function _loadArrayBuffer(buffer, filename, ext) {
    var error = this.options.error;
    switch (ext) {
      case 'shp':
        this.addData(this._loadShpByteArray(shp.parseShp(buffer)));
        break;
      case 'zip':
        this.addData(shp.parseZip(buffer));
        break;
      default:
        throw new Error(error.type);
    }
  },
  _loadShpByteArray: function _loadShpByteArray(geometries) {
    var out = {};
    out.type = 'FeatureCollection';
    out.features = [];
    var i = 0;
    var len = geometries.length;
    while (i < len) {
      out.features.push({
        'type': 'Feature',
        'geometry': geometries[i],
        'properties': {}
      });
      i++;
    }
    return out;
  }

});

//

var script = {
  name: "FileLoaderControl",
  mixins: [Control, Options],
  props: {
    position: {
      type: String,
      default: 'topright'
    },
    fitBounds: {
      type: Boolean,
      default: true
    },
    addToMap: {
      type: Boolean,
      default: true
    },
    layerOptions: {
      type: Object,
      default: function default$1() {
        return {}
      }
    },
    fileSizeLimit: {
      type: Number,
      default: 1024
    },
    showControl: {
      type: Boolean,
      default: true
    },
    showLayerList: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: '加载 gpx,kml,json,geojson,shp,zip 文件'
    },
    label: {
      type: String,
      default: '文件'
    },
    accepts: {
      type: String,
      default: '.gpx,.kml,.json,.geojson,.shp,.zip'
    },
    layers: {
      type: Object,
      default: function default$2() {
        return {};
      }
    }
  },
  data: function data() {
    return {
      currentFiles: undefined,
      ready: false,
      featureGroup: new FeatureGroup(),
      lMap: undefined,
      layerIdMap: {},
      layerIds: []
    }
  },
  methods: {
    handleSelect: function handleSelect() {
      this.$refs.input.click();
    },
    loadFile: function loadFile(ev) {
      var currentFiles = ev.target.files;
      if (this.currentFiles && currentFiles === this.currentFiles) {
        return;
      }
      this.startLoadFile(currentFiles[0]);
      ev.target.value = '';
    },
    onInputFile: function onInputFile(ev) {
      this.currentFiles = ev.target.files;
      if (this.currentFiles && this.currentFiles.length) {
        this.startLoadFile(this.currentFiles[0]);
      }
      ev.target.value = '';
      this.currentFiles = undefined;
    },
    startLoadFile: function startLoadFile(file) {
      if (!file) { return; }
      var filename = file.name;
      var ext = filename.split('.').pop();
      if (ext === 'shp' || ext === 'zip') {
        this.loadShpFile(file, ext);
      } else {
        this.loadNormalFile(file, ext);
      }
    },
    loadShpFile: function loadShpFile(file, ext) {
      var layer = new ShapeLayer(file);
      DomEvent.on(layer, ShapeEvent.loaded, this.onLoaded.bind(this));
      DomEvent.on(layer, ShapeEvent.error, this.onLoadError.bind(this));
      DomEvent.on(layer, ShapeEvent.loading, this.onLoading.bind(this));
      this.layerIdMap[layer.id] = layer;
      this.layerIds = this.layerIds.concat([layer.id]);
      if (this.addToMap) { this.featureGroup.addLayer(layer); }
    },
    loadNormalFile: function loadNormalFile(file, ext) {
      var options = Object.assign({}, this.layerOptions,
        {fileSizeLimit: this.fileSizeLimit});
      var layer = new FileLoaderLayer(this.lMap, options);
      DomEvent.on(layer, FileLoaderEvent.loaded, this.onLoaded.bind(this));
      DomEvent.on(layer, FileLoaderEvent.error, this.onLoadError.bind(this));
      DomEvent.on(layer, FileLoaderEvent.loading, this.onLoading.bind(this));
      this.layerIdMap[layer.id] = layer;
      this.layerIds = this.layerIds.concat([layer.id]);
      if (this.addToMap) { this.featureGroup.addLayer(layer); }
      layer.load(file, ext);
    },
    onLoadError: function onLoadError(ev, layer) {
      this.$emit('error', ev, layer);
    },
    onLoaded: function onLoaded(layer) {
      var self = this;
      this.$emit('loaded', layer);
      if (!this.fitBounds) { return; }
      setTimeout(function () {
        var bounds = self.featureGroup.getBounds();
        if (self.parentContainer.fitBounds) {
          self.parentContainer.fitBounds(bounds);
        } else if (self.parentContainer.mapObject.fitBounds) {
          self.parentContainer.mapObject.fitBounds(bounds);
        }
      }, 500);
    },
    onLoading: function onLoading(layer) {
      this.$emit('loading', layer);
    },
    clearAll: function clearAll() {
      this.featureGroup.clearLayers();
      this.layerIdMap = {};
      this.layerIds = [];
    },
    removeLayer: function removeLayer(layer) {
      layer && layer.remove();
      delete this.layerIdMap[layer.id];
    }
  },
  watch: {
    layerIds: function layerIds() {
      this.$emit('update:layers', this.layerIdMap);
    }
  },
  mounted: function mounted() {
    var controlOptions = Object.assign({}, this.options,
      {position: this.position,
      fitBounds: this.fitBounds,
      layerOptions: this.layerOptions,
      addToMap: this.addToMap,
      fileSizeLimit: this.fileSizeLimit});
    var LControl = Control$1.extend({
      element: undefined,
      onAdd: function onAdd(map) {
        this.lMap = map;
        return this.element;
      },
      setElement: function setElement(el) {
        this.element = el;
      }
    });
    var options = optionsMerger(controlOptions, this);
    this.mapObject = new LControl(options);
    propsBinder(this, this.mapObject, this.$options.props);
    this.parentContainer = findRealParent(this.$parent);
    this.mapObject.setElement(this.$el);
    this.mapObject.addTo(this.parentContainer.mapObject);
    this.featureGroup.addTo(this.parentContainer.mapObject);
    this.ready = true;
    this.$emit('ready', this.featureGroup);
  },
  created: function created() {

  }
};

function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier
/* server only */
, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
  if (typeof shadowMode !== 'boolean') {
    createInjectorSSR = createInjector;
    createInjector = shadowMode;
    shadowMode = false;
  } // Vue.extend constructor export interop.


  var options = typeof script === 'function' ? script.options : script; // render functions

  if (template && template.render) {
    options.render = template.render;
    options.staticRenderFns = template.staticRenderFns;
    options._compiled = true; // functional template

    if (isFunctionalTemplate) {
      options.functional = true;
    }
  } // scopedId


  if (scopeId) {
    options._scopeId = scopeId;
  }

  var hook;

  if (moduleIdentifier) {
    // server build
    hook = function hook(context) {
      // 2.3 injection
      context = context || // cached call
      this.$vnode && this.$vnode.ssrContext || // stateful
      this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext; // functional
      // 2.2 with runInNewContext: true

      if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
        context = __VUE_SSR_CONTEXT__;
      } // inject component styles


      if (style) {
        style.call(this, createInjectorSSR(context));
      } // register component module identifier for async chunk inference


      if (context && context._registeredComponents) {
        context._registeredComponents.add(moduleIdentifier);
      }
    }; // used by ssr in case component is cached and beforeCreate
    // never gets called


    options._ssrRegister = hook;
  } else if (style) {
    hook = shadowMode ? function () {
      style.call(this, createInjectorShadow(this.$root.$options.shadowRoot));
    } : function (context) {
      style.call(this, createInjector(context));
    };
  }

  if (hook) {
    if (options.functional) {
      // register for functional component in vue file
      var originalRender = options.render;

      options.render = function renderWithStyleInjection(h, context) {
        hook.call(context);
        return originalRender(h, context);
      };
    } else {
      // inject component registration as beforeCreate hook
      var existing = options.beforeCreate;
      options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
    }
  }

  return script;
}

var normalizeComponent_1 = normalizeComponent;

var isOldIE = typeof navigator !== 'undefined' && /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
function createInjector(context) {
  return function (id, style) {
    return addStyle(id, style);
  };
}
var HEAD = document.head || document.getElementsByTagName('head')[0];
var styles = {};

function addStyle(id, css) {
  var group = isOldIE ? css.media || 'default' : id;
  var style = styles[group] || (styles[group] = {
    ids: new Set(),
    styles: []
  });

  if (!style.ids.has(id)) {
    style.ids.add(id);
    var code = css.source;

    if (css.map) {
      // https://developer.chrome.com/devtools/docs/javascript-debugging
      // this makes source maps inside style tags work properly in Chrome
      code += '\n/*# sourceURL=' + css.map.sources[0] + ' */'; // http://stackoverflow.com/a/26603875

      code += '\n/*# sourceMappingURL=data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) + ' */';
    }

    if (!style.element) {
      style.element = document.createElement('style');
      style.element.type = 'text/css';
      if (css.media) { style.element.setAttribute('media', css.media); }
      HEAD.appendChild(style.element);
    }

    if ('styleSheet' in style.element) {
      style.styles.push(code);
      style.element.styleSheet.cssText = style.styles.filter(Boolean).join('\n');
    } else {
      var index = style.ids.size - 1;
      var textNode = document.createTextNode(code);
      var nodes = style.element.childNodes;
      if (nodes[index]) { style.element.removeChild(nodes[index]); }
      if (nodes.length) { style.element.insertBefore(textNode, nodes[index]); }else { style.element.appendChild(textNode); }
    }
  }
}

var browser = createInjector;

/* script */
var __vue_script__ = script;

/* template */
var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"file-loader-control"},[_c('input',{ref:"input",attrs:{"type":"file","accept":_vm.accepts,"hidden":""},on:{"change":_vm.loadFile,"input":_vm.onInputFile}}),_vm._v(" "),(_vm.showControl)?_c('div',{staticClass:"leaflet-control-zoom leaflet-bar"},[_c('a',{staticClass:"leaflet-control-zoom-in file-loader-button",attrs:{"title":_vm.title,"role":"button","href":"#"},on:{"click":function($event){$event.stopPropagation();return _vm.handleSelect($event)}}},[_vm._v(_vm._s(_vm.label))]),_vm._v(" "),_c('a',{staticClass:"leaflet-control-zoom-out file-loader-button",attrs:{"title":_vm.title,"role":"button","href":"#"},on:{"click":function($event){$event.stopPropagation();return _vm.clearAll($event)}}},[_vm._v("清除")])]):_vm._e(),_vm._v(" "),_vm._t("default")],2)};
var __vue_staticRenderFns__ = [];

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-0638a057_0", { source: ".file-loader-control[data-v-0638a057]{position:relative}.file-loader-button[data-v-0638a057]{font-size:10px}", map: undefined, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = "data-v-0638a057";
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* style inject SSR */
  

  
  var FileLoaderControl = normalizeComponent_1(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    browser,
    undefined
  );

export default FileLoaderControl;
