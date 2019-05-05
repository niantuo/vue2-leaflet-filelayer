<template>
  <div id="app">
    <LMap ref="lMap" :options="options" :center="options.center"
          @leaflet:load="onReady" class="map-container">
      <file-loader-control @loaded="onLoad" :file-size-limit="2048" :layer-options="layerOptions"></file-loader-control>
      <LControlZoom></LControlZoom>
      <!--<q-shape-layer :file="fileUrl"></q-shape-layer>-->
    </LMap>
  </div>
</template>

<script>
  import 'leaflet/dist/leaflet.css'
  import {LMap} from 'vue2-leaflet'
  import {tileLayer,CRS} from 'leaflet'
  import LControlZoom from "vue2-leaflet/src/components/LControlZoom";
  import QShapeLayer from "./components/QShapeLayer";
  import FileLoaderControl from "./components/FileLoaderControl";
  import {CRS_DEFS, WGS842XiAn1980, xiAn2WGS84} from "./crs/TransformUtils";


  export default {
    name: 'App',
    components: {
      FileLoaderControl,
      QShapeLayer,
      LControlZoom,
      LMap
    },
    data() {
      return {
        lMap: undefined,
        options: {
          maxZoom: 18,
          minZoom: 3,
          zoom: 10,
          attributionControl: false,
          zoomControl: false,
          center: [26.596535, 106.703144],
          layers: [],
          doubleClickZoom: false
        },
        fileUrl: 'http://calvinmetcalf.github.io/leaflet.shapefile/congress.zip',
        layerOptions: {
          originCRS: CRS_DEFS.EPSG234
        }
      }
    },
    methods: {
      onReady() {
        this.lMap = this.$refs.lMap.mapObject;

        const osm = tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', this.options);
        osm.addTo(this.lMap)
      },
      onLoad(layer) {
        console.log('onLoaded: ', layer)
      }
    },
    provide() {
      let _this = this;
      return {
        getLMap: function () {
          return _this.lMap;
        }
      }
    },
    created() {
      let point = [422404, 2877085];
      let targetPoint = xiAn2WGS84(point);


      console.log('targetPoint: ', targetPoint,WGS842XiAn1980(targetPoint));

    },
    mounted() {

    }
  }
</script>

<style>


  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    height: 100%;
    width: 100%;
  }

  .map-container {
    height: 100%;
    overflow: hidden;
    width: 100%;
  }

</style>
