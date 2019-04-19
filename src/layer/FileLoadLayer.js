/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/4/19
 *
 **/
import {Control, GeoJSON, Util} from 'leaflet'
import toGeoJSON from 'togeojson'
import uuid from 'uuid'

export const FileLoaderError = {
  parameter: '未发现文件！',
  type: '不支持该文件类型！',
  fileSize: '文件长度超过最大限制！',
  noLayers: '没有图层信息！'
};


export const FileLoaderEvent = {
  loading: 'data:loading',
  error: 'data:error',
  loaded: 'data:loaded'
};

let FileLoaderLayer = GeoJSON.extend({
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
    let parser,
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
    let self = this;
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
    const readers = [];
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
    let parser;
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
    let parser;
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
    const fileSize = (size / 1024).toFixed(4);
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
    let geojson;
    // Format is either 'gpx' or 'kml'
    if (typeof content === 'string') {
      content = (new window.DOMParser()).parseFromString(content, 'text/xml');
    }
    geojson = toGeoJSON[format](content);
    return this._loadGeoJSON(geojson);
  }

});

let FileLoadControl = Control.extend({
  statics: {
    TITLE: 'Load local file (GPX, KML, GeoJSON)',
    LABEL: '&#8965;'
  },
  options: {
    position: 'topleft',
    fitBounds: true,
    fileSizeLimit: 1024
  },

  initialize: function (options) {
    Util.setOptions(this, options);
    this.loader = null;
  },

  onAdd: function (map) {
    this.loader = new FileLoaderLayer(map, this.options);
    this.loader.on(FileLoaderEvent.loaded, function (layer) {
      if (this.options.fitBounds) {
        window.setTimeout(function () {
          map.fitBounds(layer.getBounds());
        }, 500);
      }
    }, this);

    // Initialize Drag-and-drop
    this._initDragAndDrop(map);

    // Initialize map control
    return this.initContainer();
  },

  _initDragAndDrop: function (map) {
    let callbackName;
    let thisLoader = this.loader;
    const dropbox = map._container;

    const callbacks = {
      dragenter: function () {
        map.scrollWheelZoom.disable();
      },
      dragleave: function () {
        map.scrollWheelZoom.enable();
      },
      dragover: function (e) {
        e.stopPropagation();
        e.preventDefault();
      },
      drop: function (e) {
        e.stopPropagation();
        e.preventDefault();
        thisLoader.loadMultiple(e.dataTransfer.files);
        map.scrollWheelZoom.enable();
      }
    };
    for (callbackName in callbacks) {
      if (callbacks.hasOwnProperty(callbackName)) {
        dropbox.addEventListener(callbackName, callbacks[callbackName], false);
      }
    }
  },

  initContainer: function () {
    return null
  }
});

export {
  FileLoaderLayer, FileLoadControl
}
