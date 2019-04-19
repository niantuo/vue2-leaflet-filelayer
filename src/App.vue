<template>
  <div id="app">
    <LMap ref="lMap" :options="options" :center="options.center"
          @leaflet:load="onReady" class="map-container">
      <file-loader-control></file-loader-control>
      <LControlZoom></LControlZoom>
      <!--<q-shape-layer :file="fileUrl"></q-shape-layer>-->
    </LMap>
  </div>
</template>

<script>
  import 'leaflet/dist/leaflet.css'
  import {LMap} from 'vue2-leaflet'
  import {tileLayer} from 'leaflet'
  import LControlZoom from "vue2-leaflet/src/components/LControlZoom";
  import QShapeLayer from "./components/QShapeLayer";
  import FileLoaderControl from "./components/FileLoaderControl";

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
        fileUrl: 'http://calvinmetcalf.github.io/leaflet.shapefile/congress.zip'
      }
    },
    methods: {
      onReady() {
        this.lMap = this.$refs.lMap.mapObject;

        const osm = tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', this.options);
        osm.addTo(this.lMap)
      },
    },
    provide() {
      let _this = this;
      return {
        getLMap: function () {
          return _this.lMap;
        }
      }
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
