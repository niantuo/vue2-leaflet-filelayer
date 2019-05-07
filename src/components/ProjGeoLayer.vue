<script>
  import LayerMixin from 'vue2-leaflet/dist/mixins/Layer'
  import Options from 'vue2-leaflet/dist/mixins/Options'
  import {findRealParent} from 'vue2-leaflet/dist/utils/utils'
  import {CRS_DEFS} from "../crs/TransformUtils";
  import ProjGeoJSON from "../layer/ProjGeoJSON";

  export default {
    name: "ProjGeoLayer",
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
      content: {
        type: [Object, String]
      },
      crs: {
        type: String,
        default: CRS_DEFS.WGS84
      },
      fromCrs: {
        type: String,
        default: CRS_DEFS.WGS84
      },
      fitBounds: {
        type: Boolean,
        default: true
      }
    },
    methods: {
      fitToLayerBounds() {
        if (!this.fitBounds) return;
        let bounds = this.mapObject.getBounds();
        if (bounds && bounds.isValid && bounds.isValid()) {
          let map = this.mapObject._map;
          map && map.fitBounds(bounds);
        }
      }
    },
    watch: {
      content(val) {
        this.mapObject.setGeoData(val);
        this.fitToLayerBounds();
      }
    },
    mounted() {
      this.parentContainer = findRealParent(this.$parent);
      let options = {
        ...this.layerOptions,
        crs: this.crs,
        fromCrs: this.fromCrs,
        fitBounds: this.fitBounds
      };
      this.mapObject = new ProjGeoJSON(this.content, options);
      this.parentContainer.addLayer(this);
      this.fitToLayerBounds();
    },
    render: function () {
      return null
    }
  }
</script>

<style scoped>

</style>
