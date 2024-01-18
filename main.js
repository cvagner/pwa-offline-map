import { registerSW } from 'virtual:pwa-register'

// Pointer events polyfill for old browsers, see https://caniuse.com/#feat=pointer
import 'elm-pep';

import 'ol/ol.css';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import {fromLonLat, get as getProjection} from 'ol/proj';
import {getWidth} from 'ol/extent';

import './style.css';
import { onlineOrCacheTileLoadFunction, urlsToCache, batchAddToCacheDuration, batchAddToCache, clearCache } from './cache';
import { installGeolocation, setGeolocationTracking, centerOnGeolocation } from './geolocation';
import { installCacheIntersection } from './cache-intersection';


// ------------------------------
// PWA Service worker online / offline
// ------------------------------
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Une version plus récente de l\'application est disponible. Recharger ?')) {
      updateSW();
    }
  },
  onOfflineReady() {
    alert('L\'application est prête à fonctionner sans réseau.');
  },
})


// ------------------------------
// UI
// ------------------------------
document.querySelector('#app').innerHTML = `
  <h1>Photographies aériennes <span id="status"></span></h1>
  <div class="toolbar">
    <span>Position</span>
    <button id="position" title="Suivre la position"><span id="positionIcon">✕</span> Suivre</button>
    <button id="center-position" title="Centrer sur la position">⌖ Centrer</button>
    <button id="goto-dijon" title="Dijon">🦉 Dijon</button>
    <br/>
    <span>Cache</span>
    <button id="load-cache" title="du niveau de zoom courant au plus grand">★ Carte</button>
    <button id="clear-cache">☆ Vider</button>
  </div>
  <div id="map" class="map"></div>
`


// ------------------------------
// Attach actions
// ------------------------------
document.getElementById('load-cache').onclick = function() {
  let extent = map.getView().calculateExtent(map.getSize())
  let zoom = map.getView().getZoom();
  if (zoom < 15) {
    alert('Un nombre trop important de tuiles serait mis en cache à cette échelle. Veuillez zoomer');
    return;
  }
  let urls = urlsToCache(extent, zoom, wmtsSource);
  if (urls.length <= 0 || !confirm(urls.length + ' tuiles seront mises en cache ('
    + batchAddToCacheDuration(urls) + ' sec avec la fibre environ). Continuer ?')) {
    return;
  }
  batchAddToCache(urls);
};

document.getElementById('clear-cache').onclick = clearCache;

document.getElementById('goto-dijon').onclick = function() {
  // Calculé à partir de la fonction suivante (ajouter window.map = map à la fin de ce fichier)
  // map.getView().calculateExtent(map.getSize())
  let dijonExtent = [561156.3584244443, 5998685.964885023, 561713.7014265041, 5998807.655496827];
  map.getView().fit(dijonExtent);
};

let trackPosition = false;
let positionIconEl = document.getElementById('positionIcon');
document.getElementById('position').onclick = function() {
  trackPosition = !trackPosition;
  setGeolocationTracking(trackPosition);
  positionIconEl.innerText = trackPosition ? '✓' : '✕';
};

document.getElementById('center-position').onclick = centerOnGeolocation;


// ------------------------------
// Connection status
// ------------------------------
window.addEventListener('online', updStatus);
window.addEventListener('offline', updStatus);
function updStatus() {
  let statusSpan = document.getElementById('status');
  if (statusSpan) {
    statusSpan.innerText = navigator.onLine ? '⚡' : '💤';
  }
}
updStatus();


// ------------------------------
// Map
// ------------------------------
const map = new Map({
  target: 'map',
  view: new View({
    zoom: 5,
    center: fromLonLat([5, 45]),
  }),
});

const resolutions = [];
const matrixIds = [];
const proj3857 = getProjection('EPSG:3857');
const maxResolution = getWidth(proj3857.getExtent()) / 256;

for (let i = 0; i < 20; i++) {
  matrixIds[i] = i.toString();
  resolutions[i] = maxResolution / Math.pow(2, i);
}

const tileGrid = new WMTSTileGrid({
  origin: [-20037508, 20037508],
  resolutions: resolutions,
  matrixIds: matrixIds,
});

const wmtsSource = new WMTS({
  url: 'https://data.geopf.fr/wmts',
  layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
  matrixSet: 'PM',
  format: 'image/jpeg',
  projection: 'EPSG:3857',
  tileGrid: tileGrid,
  style: 'normal',
  attributions:
    '<a href="https://www.ign.fr/" target="_blank">' +
    '<img src="https://wxs.ign.fr/static/logos/IGN/IGN.gif" title="Institut national de l\'' +
    'information géographique et forestière" alt="IGN"></a>',

  // Lecture des tuiles online/offline
  tileLoadFunction: onlineOrCacheTileLoadFunction
});

map.addLayer(new TileLayer({
  source: wmtsSource,
}));

installGeolocation(map);

installCacheIntersection(map, wmtsSource);