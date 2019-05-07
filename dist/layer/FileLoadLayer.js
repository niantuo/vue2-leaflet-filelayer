import { GeoJSON, LatLng, Util } from 'leaflet';
import toGeoJSON from 'togeojson';
import uuid from 'uuid';
import proj4 from 'proj4';

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

var FileLoaderLayer = TransformGeoJSON.extend({
  options: {
    fileSizeLimit: 1024,
    error: FileLoaderError
  },
  fileInfo: {filename: undefined, format: undefined},

  initialize: function (options) {
    this.id = uuid();
    Util.setOptions(this, options);
    this._initTransform(this.options);

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
      this._fireEvent(FileLoaderEvent.error, err ? err.message ? err.message : '加载失败！' : '加载失败！');
    }
  },

  _isParameterMissing: function (v, vname) {
    if (typeof v === 'undefined') {
      console.log('_isParameterMissing: ', vname);
      this._fireEvent(FileLoaderEvent.error, this.options.error.parameter);
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
      this._fireEvent(FileLoaderEvent.error, this.options.error.type);
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
      this._fireEvent(FileLoaderEvent.error, this.options.error.fileSize);
      return false;
    }
    return true;
  },

  _loadGeoJSON: function _loadGeoJSON(content) {
    if (typeof content === 'string') {
      content = JSON.parse(content);
    }
    this._addGeoData(content);
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
  },

  _fireEvent: function _fireEvent(type, errMsg) {
    this.fire(type, {message: errMsg, layer: this});
  }

});

export { FileLoaderError, FileLoaderEvent, FileLoaderLayer };
