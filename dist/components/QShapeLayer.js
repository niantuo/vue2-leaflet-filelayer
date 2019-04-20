import { GeoJSON, Util, DomEvent } from 'leaflet';
import uuid from 'uuid';

var Layer = {
  props: {
    pane: {
      type: String,
      default: 'overlayPane'
    },
    attribution: {
      type: String,
      default: null
    },
    name: {
      type: String,
      custom: true,
      default: undefined
    },
    layerType: {
      type: String,
      custom: true,
      default: undefined
    },
    visible: {
      type: Boolean,
      custom: true,
      default: true
    }
  },
  mounted: function mounted () {
    this.layerOptions = {
      attribution: this.attribution,
      pane: this.pane
    };
  },
  beforeDestroy: function beforeDestroy () {
    this.unbindPopup();
    this.unbindTooltip();
    this.parentContainer.removeLayer(this);
  },
  methods: {
    setAttribution: function setAttribution (val, old) {
      var attributionControl = this.$parent.mapObject.attributionControl;
      attributionControl.removeAttribution(old).addAttribution(val);
    },
    setName: function setName (newVal, oldVal) {
      if (newVal === oldVal) { return; }
      this.parentContainer.removeLayer(this);
      if (this.visible) {
        this.parentContainer.addLayer(this);
      }
    },
    setLayerType: function setLayerType (newVal, oldVal) {
      if (newVal === oldVal) { return; }
      this.parentContainer.removeLayer(this);
      if (this.visible) {
        this.parentContainer.addLayer(this);
      }
    },
    setVisible: function setVisible (newVal, oldVal) {
      if (newVal === oldVal) { return; }
      if (this.mapObject) {
        if (newVal) {
          this.parentContainer.addLayer(this);
        } else {
          this.parentContainer.removeLayer(this);
        }
      }
    },
    unbindTooltip: function unbindTooltip () {
      var tooltip = this.mapObject ? this.mapObject.getTooltip() : null;
      if (tooltip) {
        tooltip.unbindTooltip();
      }
    },
    unbindPopup: function unbindPopup () {
      var popup = this.mapObject ? this.mapObject.getPopup() : null;
      if (popup) {
        popup.unbindPopup();
      }
    }
  }
};

var Options = {
  props: {
    options: {
      type: Object,
      default: function () { return ({}); }
    }
  }
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
  name: "QShapeLayer",
  mixins: [Layer, Options],
  inject: ['getLMap'],
  data: function data() {
    return {
      ready: false,
      mapObject: undefined,
      parentContainer: undefined
    }
  },
  props: {
    error: {
      type: Object,
      default: function default$1() {
        return ShapeOptions.error
      }
    },
    ext: {
      type: String,
      default: undefined
    },
    params: {
      type: [Object, String, Number],
      default: undefined
    },
    file: {
      type: [Function, Object, String],
      default: function default$2() {
      }
    },
    fitBounds: {
      type: Boolean,
      default: true
    },
    lMap: {
      type: Object,
      default: function default$3() {
      }
    },
    name: {
      type: String,
      default: "QShape"
    }
  },
  methods: {
    createLayer: function createLayer() {
      if (this.mapObject) { return; }
      var options = Object.assign({}, this.options, this.layerOptions,
        {error: this.error,
        ext: this.ext,
        params: this.params,
        name: this.name});
      this.mapObject = new ShapeLayer(this.file, options);
      DomEvent.on(this.mapObject, ShapeEvent.error, this.onLoadError.bind(this));
      DomEvent.on(this.mapObject, ShapeEvent.loaded, this.onLoaded.bind(this));
      DomEvent.on(this.mapObject, ShapeEvent.loading, this.onLoading.bind(this));
      if (this.parentContainer && this.parentContainer.addLayer) {
        this.parentContainer.addLayer(this);
      } else if (this.map) {
        this.mapObject.addTo(this.map);
      }
      this.ready = true;
      this.$emit('ready', this);
      return this.mapObject;
    },
    onLoaded: function onLoaded(layer) {
      this.$emit('loaded', this);
      var lMap = this.map;
      if (!lMap || !this.fitBounds || !layer || !layer.getBounds) { return; }
      lMap.fitBounds(layer.getBounds());
    },
    onLoadError: function onLoadError(e) {
      this.$emit('error', e, this);
    },
    onLoading: function onLoading() {
      this.$emit('loading', this);
    },
    loadFile: function loadFile(file) {
      this.createLayer();
      this.mapObject.addFileData(file);
    },
    clearLayers: function clearLayers() {
      this.mapObject && this.mapObject.clearLayers();
    }
  },
  computed: {
    map: function map() {
      if (this.lMap) { return this.lMap; }
      if (this.getLMap && typeof this.getLMap === 'function') {
        return this.getLMap();
      }
    }
  },
  watch: {
    file: function file(newFile) {
      if (this.mapObject) {
        this.mapObject.clearLayers();
        this.mapObject.addFileData(newFile);
      } else {
        this.createLayer();
      }
    }
  },
  mounted: function mounted() {
    this.parentContainer = findRealParent(this.$parent);
    this.createLayer();
  },
  beforeDestroy: function beforeDestroy() {
    if (this.mapObject) { this.mapObject.clearLayers(); }
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

/* script */
var __vue_script__ = script;

/* template */
var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',[(_vm.ready)?_vm._t("default"):_vm._e()],2)};
var __vue_staticRenderFns__ = [];

  /* style */
  var __vue_inject_styles__ = undefined;
  /* scoped */
  var __vue_scope_id__ = "data-v-2b38c922";
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* style inject */
  
  /* style inject SSR */
  

  
  var QShapeLayer = normalizeComponent_1(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    undefined,
    undefined
  );

export default QShapeLayer;
