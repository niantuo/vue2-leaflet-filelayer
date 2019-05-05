<template>
  <div id="app">
    <LMap ref="lMap" :options="options" :center="options.center"
          @leaflet:load="onReady" class="map-container">
      <file-loader-control @loaded="onLoad" :file-size-limit="2048"></file-loader-control>
      <LControlZoom></LControlZoom>
      <!--<q-shape-layer :file="fileUrl"></q-shape-layer>-->
    </LMap>
  </div>
</template>

<script>
  import 'leaflet/dist/leaflet.css'
  import {LMap} from 'vue2-leaflet'
  import {tileLayer,CRS,LatLng} from 'leaflet'
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
      onLoad(layer){
        console.log('onLoaded: ',layer)
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
      // let latlng=new LatLng(422605,2973700);
      // CRS.Earth = Earth;
      // CRS.EPSG3395 = EPSG3395;
      // CRS.EPSG3857 = EPSG3857;
      // CRS.EPSG900913 = EPSG900913;
      // CRS.EPSG4326 = EPSG4326;
      // CRS.Simple = Simple;
      let latlng=new LatLng(29,105);
      let point = CRS.EPSG3857.project(latlng);
      console.log('point EPSG3857=>',CRS.EPSG3857.project(latlng));
      console.log('point origin EPSG3857 =>: ',CRS.EPSG3857.unproject(point));
      console.log('point EPSG3395 =>',CRS.EPSG3395.project(latlng));

      console.log('point EPSG900913=>',CRS.EPSG900913.project(latlng));
      console.log('point EPSG4326=>',CRS.EPSG4326.project(latlng));

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
