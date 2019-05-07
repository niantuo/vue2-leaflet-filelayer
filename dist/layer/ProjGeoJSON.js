import proj4 from 'proj4';
import { GeoJSON, LatLng, Util } from 'leaflet';

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
  WGS84: 'WGS84',
  EPSG4490:'EPSG:4490'
};
proj4.defs(CRS_DEFS.EPSG234, "+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs");
proj4.defs(CRS_DEFS.EPSG4544, '+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs ');
proj4.defs("EPSG:4490","+proj=longlat +ellps=GRS80 +no_defs");

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

export default ProjGeoJSON;
