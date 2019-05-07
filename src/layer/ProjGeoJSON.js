/**
 * @Author :tuonina
 * @Date : 2019/5/7
 * @Version: 1.0
 * @Last Modified by :
 * @Last Modified Date: 2019/5/7
 * 提供坐标系转换的功能的GeoJSON数据加载
 *
 **/
import TransformGeoJSON from "../crs/TransformGeoJSON";
import {Util} from "leaflet";


export default TransformGeoJSON.extend({

  initialize: function (geoJson, options) {
    Util.setOptions(this, options);
    this._initTransform(this.options);
    this._layers = {};
    if (!geoJson) {
      return
    }
    if (typeof geoJson === 'string') {
      geoJson = JSON.parse(geoJson)
    }
    this._addGeoData(geoJson);
  },
  addGeoData(data) {
    this._addGeoData(data)
  },
  setGeoData(data) {
    this.clearLayers();
    this._addGeoData(data)
  }

})
