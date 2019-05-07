/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/5/5
 *
 **/
import proj4 from 'proj4'


/**
 * 自定义的一些坐标系
 */
export const CRS_DEFS = {
  EPSG234: 'EPSG:2343',
  EPSG4544: 'EPSG:4544',
  WGS84: 'WGS84',
  EPSG4490:'EPSG:4490'
};
proj4.defs(CRS_DEFS.EPSG234, "+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs");
proj4.defs(CRS_DEFS.EPSG4544, '+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs ');
proj4.defs("EPSG:4490","+proj=longlat +ellps=GRS80 +no_defs");

/**
 * https://epsg.io/2343#
 * 将西安1980 转换成WGS84 坐标系
 * @param point
 * @returns {*|*|*|*}
 */
export function xiAn2WGS84(point) {
  return proj4('EPSG:2343', 'WGS84', point);
}

export function WGS842XiAn1980(point) {
  return proj4('WGS84', 'EPSG:2343', point);
}


export function transform2WGS84(from, point) {
  return proj4(from, 'WGS84', point);
}

export function transform2(from, to, point) {
  return proj4(from, to, point)
}
