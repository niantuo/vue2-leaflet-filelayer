/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/4/19
 *
 **/
import {FileLoaderLayer,FileLoaderError,FileLoaderEvent} from './layer/FileLoadLayer'
import ShapeLayer,{ShapeEvent,ShapeOptions,} from './layer/ShapeLayer'

import FileLoaderControl from './components/FileLoaderControl'
import QShapeLayer from './components/QShapeLayer'

import ProjGeoJSON from './layer/ProjGeoJSON'
import ProjGeoLayer from './components/ProjGeoLayer'


export {
  FileLoaderLayer,FileLoaderEvent,FileLoaderError,
  ShapeLayer,ShapeOptions,ShapeEvent,
  QShapeLayer,
  FileLoaderControl,
  ProjGeoJSON,
  ProjGeoLayer
}
