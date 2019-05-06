import proj4 from 'proj4';

/**
 * @author  tuonina
 * @email  976056042@qq.com
 * @createTime  2019/5/5
 *
 **/

proj4.defs("EPSG:2343", "+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs");


/**
 * 自定义的一些坐标系
 */
const CRS_DEFS = {
  EPSG234: 'EPSG:2343',
  WGS84: 'WGS84'
};

/**
 * https://epsg.io/2343#
 * 将西安1980 转换成WGS84 坐标系
 * @param point
 * @returns {*|*|*|*}
 */
function xiAn2WGS84(point) {
  return proj4('EPSG:2343', 'WGS84', point);
}

function WGS842XiAn1980(point) {
  return proj4('WGS84', 'EPSG:2343', point);
}


function transform2WGS84(from, point) {
  return proj4(from, 'WGS84', point);
}

function transform2(from, to, point) {
  return proj4(from, to, point)
}

export { CRS_DEFS, WGS842XiAn1980, transform2, transform2WGS84, xiAn2WGS84 };
