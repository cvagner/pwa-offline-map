import 'ol/ol.css';
import Feature from 'ol/Feature';
import Geolocation from 'ol/Geolocation';
import Point from 'ol/geom/Point';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';

let geolocation;
let accuracyFeature, positionFeature;
let map;

export function installGeolocation(theMap) {
  map = theMap;
  geolocation = new Geolocation({
    // enableHighAccuracy must be set to true to have the heading value.
    trackingOptions: {
      enableHighAccuracy: true,
    },
    projection: map.getView().getProjection(),
  });

  // handle geolocation error.
  geolocation.on('error', (error) => console.log(error.message));

  accuracyFeature = new Feature();
  geolocation.on('change:accuracyGeometry', function () {
    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
  });

  positionFeature = new Feature();
  positionFeature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: '#3399CC',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
      }),
    })
  );

  geolocation.on('change:position', function () {
    const coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new Point(coordinates) : null);
  });

  new VectorLayer({
    map: map,
    source: new VectorSource({
      features: [accuracyFeature, positionFeature],
    }),
  });

}

export function setGeolocationTracking(track) {
  geolocation.setTracking(track);
};

export function centerOnGeolocation() {
  let position = geolocation.getPosition();
  if (position) {
    map.getView().setCenter(position);
    let currentZoom = map.getView().getZoom();
    map.getView().setZoom(Math.max(currentZoom, 16));
  } else {
    geolocation.once('change:position', () => centerOnGeolocation());
    setGeolocationTracking(true);
  }
};