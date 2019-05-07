import { GeoJSON, LatLng, Util } from 'leaflet';
import proj4 from 'proj4';

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
 * @createTime  2019/5/5
 *
 **/


/**
 * 自定义的一些坐标系
 */
var CRS_DEFS = {
  EPSG234: 'EPSG:2343',
  EPSG4544: 'EPSG:4544',
  WGS84: 'WGS84'
};
proj4.defs(CRS_DEFS.EPSG234, "+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs");
proj4.defs(CRS_DEFS.EPSG4544, '+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs ');

function transform2(from, to, point) {
  return proj4(from, to, point)
}

/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/5/6
 *
 **/

var TransformGeoJSON = GeoJSON.extend({
  options: {
    crs: CRS_DEFS.WGS84,
    fromCRS: CRS_DEFS.WGS84
  },
  _coordsToLatLng: function _coordsToLatLng(fromCRS, toCRS, coords) {
    var point = transform2(fromCRS, toCRS, coords);
    return new LatLng(point[1], point[0]);
  },

  _initTransform: function _initTransform(options) {
    console.log('_initTransform=>', options);
    var fromCRS = options.fromCRS;
    var crs = options.crs;
    if (fromCRS !== crs) {
      options.coordsToLatLng = this._coordsToLatLng.bind(this, fromCRS, crs);
    } else {
      delete options.coordsToLatLng;
    }
  },
  _addGeoData: function _addGeoData(data) {
    if (!data) { return; }
    var crs = data.crs;
    if (crs) {
      var propName = crs.type;
      this.options.fromCRS = crs.properties[propName];
      this._initTransform(this.options);
    }
    this.addData(data);
  },
});

/**
 * @Author :tuonina
 * @Date : 2019/5/7
 * @Version: 1.0
 * @Last Modified by :
 * @Last Modified Date: 2019/5/7
 * 提供坐标系转换的功能的GeoJSON数据加载
 *
 **/


var ProjGeoJSON = TransformGeoJSON.extend({

  initialize: function (geoJson, options) {
    Util.setOptions(this, options);
    this._initTransform(this.options);
    this._layers = {};
    if (!geoJson) {
      return
    }
    if (typeof geoJson === 'string') {
      geoJson = JSON.parse(geoJson);
    }
    this._addGeoData(geoJson);
  },
  addGeoData: function addGeoData(data) {
    this._addGeoData(data);
  },
  setGeoData: function setGeoData(data) {
    this.clearLayers();
    this._addGeoData(data);
  }

});

var script = {
  name: "ProjGeoLayer",
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
    content: {
      type: [Object, String]
    },
    crs: {
      type: String,
      default: CRS_DEFS.WGS84
    },
    fromCrs: {
      type: String,
      default: CRS_DEFS.WGS84
    },
    fitBounds: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    fitToLayerBounds: function fitToLayerBounds() {
      if (!this.fitBounds) { return; }
      var bounds = this.mapObject.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        var map = this.mapObject._map;
        map && map.fitBounds(bounds);
      }
    }
  },
  watch: {
    content: function content(val) {
      this.mapObject.setGeoData(val);
      this.fitToLayerBounds();
    }
  },
  mounted: function mounted() {
    this.parentContainer = findRealParent(this.$parent);
    var options = Object.assign({}, this.layerOptions,
      {crs: this.crs,
      fromCrs: this.fromCrs,
      fitBounds: this.fitBounds});
    this.mapObject = new ProjGeoJSON(this.content, options);
    this.parentContainer.addLayer(this);
    this.fitToLayerBounds();
  },
  render: function () {
    return null
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

  /* style */
  var __vue_inject_styles__ = undefined;
  /* scoped */
  var __vue_scope_id__ = "data-v-8157bbfe";
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = undefined;
  /* style inject */
  
  /* style inject SSR */
  

  
  var ProjGeoLayer = normalizeComponent_1(
    {},
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    undefined,
    undefined
  );

export default ProjGeoLayer;
