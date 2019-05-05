import vue from 'rollup-plugin-vue';
import replace from 'rollup-plugin-replace';
import node from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-commonjs';
import buble from 'rollup-plugin-buble';
import copy from 'rollup-copy-plugin';

import fs from 'fs';

const baseFolder = './src/';
const componentFolder = 'components/';
const mixinFolder = 'mixins/';
const layerFolder = 'layer/';
const crsFolder = 'crs/';

const components = fs.readdirSync(baseFolder + componentFolder);
const mixins = fs.readdirSync(baseFolder + mixinFolder);
const layers = fs.readdirSync(baseFolder + layerFolder);
const crs =fs.readdirSync(baseFolder+crsFolder);

const externalList = ['vue', 'leaflet', 'vue2-leaflet', 'uuid', 'togeojson','proj4'];

const mapEntry = (f, ext, folder) => ({
  input: baseFolder + folder + f,
  external: externalList,
  output: {
    format: 'esm',
    file: `dist/${folder}${f.replace(ext, 'js')}`
  },
  plugins: [
    replace({'process.env.NODE_ENV': 'production'}),
    node({
      extensions: ['.vue', '.js']
    }),
    cjs(),
    vue({
      css: true,
      compileTemplate: true
    }),
    buble({
      objectAssign: true
    })
  ]
});

export default [
  ...components.map(f => mapEntry(f, 'vue', componentFolder)),
  ...mixins.map(f => mapEntry(f, 'js', mixinFolder)),
  ...layers.map(f => mapEntry(f, 'js', layerFolder)),
  ...crs.map(f=>mapEntry(f,'js',crsFolder)),
  {
    input: 'src/index.js',
    external: externalList,
    output: [{
      format: 'cjs',
      file: 'dist/index.cjs.js'
    }],
    plugins: [
      replace({'process.env.NODE_ENV': 'production'}),
      node({
        extensions: ['.vue', '.js']
      }),
      cjs(),
      vue({
        css: true,
        compileTemplate: true
      }),
      buble({
        objectAssign: true
      }),
      copy({
        'src/index.js':'dist/index.js'
      }),
    ]
  },
  {
    input: 'src/index.js',
    external: externalList,
    output: {
      format: 'umd',
      name: 'Vue2LeafletFilelayer',
      file: 'dist/index.min.js',
      globals: {
        vue: 'Vue',
        'leaflet': 'L',
      }
    },
    plugins: [
      replace({'process.env.NODE_ENV': 'production'}),
      node({
        extensions: ['.vue', '.js']
      }),
      cjs(),
      vue({
        css: true,
        compileTemplate: true
      }),
      buble({
        objectAssign: true
      })
    ]
  }
];
