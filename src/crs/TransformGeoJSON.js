import {CRS_DEFS, transform2} from "./TransformUtils";
import {GeoJSON, LatLng} from "leaflet";

/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/5/6
 *
 **/

export default GeoJSON.extend({
  options: {
    crs: CRS_DEFS.WGS84,
    fromCRS:CRS_DEFS.WGS84
  },
  _coordsToLatLng(fromCRS, toCRS, coords) {
    let point = transform2(fromCRS, toCRS, coords);
    return new LatLng(point[1], point[0]);
  },

  _initTransform(options) {
    console.log('_initTransform=>',options);
    let {fromCRS, crs} = options;
    if (fromCRS !== crs) {
      options.coordsToLatLng = this._coordsToLatLng.bind(this,fromCRS, crs);
    } else {
      delete options.coordsToLatLng
    }
  },
  _addGeoData(data) {
    let crs = data.crs;
    if (crs) {
      let propName = crs.type;
      this.options.fromCRS = crs.properties[propName];
      this._initTransform(this.options);
    }
    this.addData(data);
  },
})
