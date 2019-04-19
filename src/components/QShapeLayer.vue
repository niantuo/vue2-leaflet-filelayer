<template>
  <div>
    <slot v-if="ready"></slot>
  </div>
</template>

<script>
  import LayerMixin from 'vue2-leaflet/dist/mixins/Layer'
  import Options from 'vue2-leaflet/dist/mixins/Options'
  import {findRealParent} from 'vue2-leaflet/dist/utils/utils'
  import ShapeLayer, {ShapeEvent, ShapeOptions} from '../layer/ShapeLayer'
  import {DomEvent} from 'leaflet'

  export default {
    name: "QShapeLayer",
    mixins: [LayerMixin, Options],
    inject: ['getLMap'],
    data() {
      return {
        ready: false,
        mapObject: undefined,
        parentContainer: undefined
      }
    },
    props: {
      error: {
        type: Object,
        default() {
          return ShapeOptions.error
        }
      },
      ext: {
        type: String,
        default: undefined
      },
      params: {
        type: [Object, String, Number],
        default: undefined
      },
      file: {
        type: [Function, Object, String],
        default() {
        }
      },
      fitBounds: {
        type: Boolean,
        default: true
      },
      lMap: {
        type: Object,
        default() {
        }
      },
      name: {
        type: String,
        default: "QShape"
      }
    },
    methods: {
      createLayer() {
        if (this.mapObject) return;
        let options = {
          ...this.options, ...this.layerOptions,
          error: this.error,
          ext: this.ext,
          params: this.params,
          name: this.name
        };
        this.mapObject = new ShapeLayer(this.file, options);
        DomEvent.on(this.mapObject, ShapeEvent.error, this.onLoadError.bind(this));
        DomEvent.on(this.mapObject, ShapeEvent.loaded, this.onLoaded.bind(this));
        DomEvent.on(this.mapObject, ShapeEvent.loading, this.onLoading.bind(this));
        if (this.parentContainer && this.parentContainer.addLayer) {
          this.parentContainer.addLayer(this)
        } else if (this.map) {
          this.mapObject.addTo(this.map);
        }
        this.ready = true;
        this.$emit('ready', this);
        return this.mapObject;
      },
      onLoaded(layer) {
        this.$emit('loaded', this);
        let lMap = this.map;
        if (!lMap || !this.fitBounds || !layer || !layer.getBounds) return;
        lMap.fitBounds(layer.getBounds())
      },
      onLoadError(e) {
        this.$emit('error', e, this)
      },
      onLoading() {
        this.$emit('loading', this)
      },
      loadFile(file) {
        this.createLayer();
        this.mapObject.addFileData(file)
      },
      clearLayers() {
        this.mapObject && this.mapObject.clearLayers();
      }
    },
    computed: {
      map() {
        if (this.lMap) return this.lMap;
        if (this.getLMap && typeof this.getLMap === 'function') {
          return this.getLMap();
        }
      }
    },
    watch: {
      file(newFile) {
        if (this.mapObject) {
          this.mapObject.clearLayers();
          this.mapObject.addFileData(newFile)
        } else {
          this.createLayer();
        }
      }
    },
    mounted() {
      this.parentContainer = findRealParent(this.$parent);
      this.createLayer();
    },
    beforeDestroy() {
      if (this.mapObject) this.mapObject.clearLayers();
    },
    created() {

    }
  }
</script>

<style scoped>

</style>
