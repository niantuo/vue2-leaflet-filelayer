/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/4/19
 * 传进来的参数，既可以是 文件，即加载本地对象
 * 如果参数为 function ，方法，即返回数据的格式为{data:data,ext:ext,filename}
 * 文件的文件名可以是.shp ,.zip
 **/
import {GeoJSON, LatLng, Util} from 'leaflet'
import uuid from 'uuid'
import shp from '../../static/js/shp'
import {CRS_DEFS, transform2} from "../crs/TransformUtils";
import TransformGeoJSON from "../crs/TransformGeoJSON";

export let ShapeOptions = {
  error: {
    type: '不支持该格式的文件！'
  },
  ext: undefined,
  params: undefined,
  fromCRS: CRS_DEFS.WGS84,
  crs: CRS_DEFS.WGS84
};

export let ShapeEvent = {
  loading: 'shp:loading',
  error: 'shp:error',
  loaded: 'shp:loaded'
};


export default TransformGeoJSON.extend({

  options: {
    ...ShapeOptions,
    ext: undefined,
    params: undefined
  },

  fileInfo: {filename: undefined, format: undefined},

  initialize: function (file, options) {
    this.id = uuid();
    Util.setOptions(this, options);
    if (options && options.file) {
      this.fileInfo = {...options.file};
    }
    this._initTransform(this.options);
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
    let self = this;
    self.fire(ShapeEvent.loading, self);
    let error = this.options.error;
    if (typeof file === 'function') {
      file(self.options.params)
        .then(({data, ext, filename}) => {
          self.fileInfo = {filename, format: ext};
          self._loadArrayBuffer(data, filename, ext);
          self.fire(ShapeEvent.loaded, self);
        })
        .catch(e => {
          console.log('ShapeLayer error ', e);
          this._fireError(e ? e.message ? e.message : '加载数据失败！' : '加载数据失败！');
        })
    } else if (typeof file === 'object') {
      this.loadLocalFile(file)
    } else if (typeof file === 'string') {
      shp(file).then(function (data) {
        self._addGeoData(data);
        self.fire(ShapeEvent.loaded, self)
      }).catch(e => {
        console.log('shp load error ', e);
        this._fireError(e ? e.message ? e.message : '加载数据失败！' : '加载数据失败！');
      })
    } else {
      this._fireError(error.type);
      console.log('ShapeLayer error addFileData 2', error);
    }
  },
  loadLocalFile: function (file) {
    let filename = file.name;
    let ext = this.options.ext || filename.split('.').pop();
    let self = this;
    self.fileInfo = {filename, format: ext};
    let fileReader = new FileReader();
    fileReader.onload = Util.bind(function (ev) {
      let data = ev.target.result;
      try {
        self._loadArrayBuffer(data, filename, ext);
        self.fire(ShapeEvent.loaded, self);
      } catch (e) {
        console.log('ShapeLayer fileReader ', e);
        this._fireError(e ? e.message ? e.message : '加载数据失败！' : '加载数据失败！')
      }
    });
    fileReader.readAsArrayBuffer(file);
  },
  _loadArrayBuffer(buffer, filename, ext) {
    let error = this.options.error;
    switch (ext) {
      case 'shp':
        this._addGeoData(this._loadShpByteArray(shp.parseShp(buffer)));
        break;
      case 'zip':
        this._addGeoData(shp.parseZip(buffer));
        break;
      default:
        throw new Error(error.type);
    }
  },
  _loadShpByteArray(geometries) {
    const out = {};
    out.type = 'FeatureCollection';
    out.features = [];
    let i = 0;
    const len = geometries.length;
    while (i < len) {
      out.features.push({
        'type': 'Feature',
        'geometry': geometries[i],
        'properties': {}
      });
      i++;
    }
    return out;
  },
  _fireError(message) {
    this.fire(ShapeEvent.error, {message})
  },
})
