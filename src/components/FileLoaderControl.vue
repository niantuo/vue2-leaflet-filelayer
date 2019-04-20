<template>
  <div class="file-loader-control">
    <input ref="input" @change="loadFile" @input="onInputFile" type="file" :accept="accepts" hidden>
    <div v-if="showControl" class="leaflet-control-zoom leaflet-bar">
      <a :title="title" class="leaflet-control-zoom-in file-loader-button" role="button"
         href="#" @click.stop="handleSelect">{{label}}</a>
      <a :title="title" class="leaflet-control-zoom-out file-loader-button" role="button"
         href="#" @click.stop="clearAll">清除</a>
    </div>
    <slot></slot>
  </div>
</template>
<script>

  import Options from 'vue2-leaflet/dist/mixins/Options'
  import ControlMixin from 'vue2-leaflet/dist/mixins/Control'
  import {findRealParent, optionsMerger, propsBinder} from 'vue2-leaflet/dist/utils/utils'
  import {FileLoaderEvent as FileLoaderError, FileLoaderLayer} from '../layer/FileLoadLayer'
  import {Control, DomEvent, FeatureGroup} from 'leaflet'
  import ShapeLayer, {ShapeEvent} from "../layer/ShapeLayer";

  export default {
    name: "FileLoaderControl",
    mixins: [ControlMixin, Options],
    props: {
      position: {
        type: String,
        default: 'topright'
      },
      fitBounds: {
        type: Boolean,
        default: true
      },
      addToMap: {
        type: Boolean,
        default: true
      },
      layerOptions: {
        type: Object,
        default() {
          return {}
        }
      },
      fileSizeLimit: {
        type: Number,
        default: 1024
      },
      showControl: {
        type: Boolean,
        default: true
      },
      showLayerList: {
        type: Boolean,
        default: true
      },
      title: {
        type: String,
        default: '加载 gpx,kml,json,geojson,shp,zip 文件'
      },
      label: {
        type: String,
        default: '文件'
      },
      accepts: {
        type: String,
        default: '.gpx,.kml,.json,.geojson,.shp,.zip'
      },
      layers: {
        type: Array,
        default() {
          return [];
        }
      }
    },
    data() {
      return {
        currentFiles: undefined,
        ready: false,
        featureGroup: new FeatureGroup(),
        lMap: undefined,
        layerIdMap: {},
        layerIds: []
      }
    },
    methods: {
      handleSelect() {
        this.$refs.input.click();
      },
      loadFile(ev) {
        let currentFiles = ev.target.files;
        if (this.currentFiles && currentFiles === this.currentFiles) {
          return;
        }
        this.startLoadFile(currentFiles[0]);
        ev.target.value = '';
      },
      onInputFile(ev) {
        this.currentFiles = ev.target.files;
        if (this.currentFiles && this.currentFiles.length) {
          this.startLoadFile(this.currentFiles[0])
        }
        ev.target.value = '';
        this.currentFiles = undefined;
      },
      startLoadFile(file) {
        if (!file) return;
        let filename = file.name;
        let ext = filename.split('.').pop();
        if (ext === 'shp' || ext === 'zip') {
          this.loadShpFile(file, ext)
        } else {
          this.loadNormalFile(file, ext)
        }
      },
      loadShpFile(file, ext) {
        let layer = new ShapeLayer(file);
        DomEvent.on(layer, ShapeEvent.loaded, this.onLoaded.bind(this));
        DomEvent.on(layer, ShapeEvent.error, this.onLoadError.bind(this));
        DomEvent.on(layer, ShapeEvent.loading, this.onLoading.bind(this));
        this.layerIdMap[layer.id] = layer;
        this.layerIds = this.layerIds.concat([layer.id]);
        if (this.addToMap) this.featureGroup.addLayer(layer);
      },
      loadNormalFile(file, ext) {
        let options = {
          ...this.layerOptions,
          fileSizeLimit: this.fileSizeLimit
        };
        let layer = new FileLoaderLayer(this.lMap, options);
        DomEvent.on(layer, FileLoaderError.loaded, this.onLoaded.bind(this));
        DomEvent.on(layer, FileLoaderError.error, this.onLoadError.bind(this));
        DomEvent.on(layer, FileLoaderError.loading, this.onLoading.bind(this));
        this.layerIdMap[layer.id] = layer;
        this.layerIds = this.layerIds.concat([layer.id]);
        if (this.addToMap) this.featureGroup.addLayer(layer);
        layer.load(file, ext)
      },
      onLoadError(ev, layer) {
        this.$emit('error', ev, layer)
      },
      onLoaded(layer) {
        let self = this;
        this.$emit('loaded', layer);
        if (!this.fitBounds) return;
        setTimeout(() => {
          let bounds = self.featureGroup.getBounds();
          if (self.parentContainer.fitBounds) {
            self.parentContainer.fitBounds(bounds)
          } else if (self.parentContainer.mapObject.fitBounds) {
            self.parentContainer.mapObject.fitBounds(bounds)
          }
        }, 500);
      },
      onLoading(layer) {
        this.$emit('loading', layer)
      },
      clearAll() {
        this.featureGroup.clearLayers();
        this.layerIdMap = {};
        this.layerIds = [];
      },
      removeLayer(layer) {
        layer && layer.remove();
        delete this.layerIdMap[layer.id]
      }
    },
    watch: {
      layerIds() {
        this.$emit('update:layers', this.layerIdMap)
      }
    },
    mounted() {
      let controlOptions = {
        ...this.options,
        position: this.position,
        fitBounds: this.fitBounds,
        layerOptions: this.layerOptions,
        addToMap: this.addToMap,
        fileSizeLimit: this.fileSizeLimit
      };
      const LControl = Control.extend({
        element: undefined,
        onAdd(map) {
          this.lMap = map;
          return this.element;
        },
        setElement(el) {
          this.element = el;
        }
      });
      const options = optionsMerger(controlOptions, this);
      this.mapObject = new LControl(options);
      propsBinder(this, this.mapObject, this.$options.props);
      this.parentContainer = findRealParent(this.$parent);
      this.mapObject.setElement(this.$el);
      this.mapObject.addTo(this.parentContainer.mapObject);
      this.featureGroup.addTo(this.parentContainer.mapObject);
      this.ready = true;
      this.$emit('ready', this.featureGroup);
    },
    created() {

    }
  }
</script>

<style scoped>
  .file-loader-control {
    position: relative;
  }

  .file-loader-button {
    font-size: 10px;
  }

</style>
