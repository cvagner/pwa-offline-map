import { fromExtent } from 'ol/geom/Polygon';
import Draw from 'ol/interaction/Draw.js';

import Feature from 'ol/Feature.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';

import { batchAddToCache, batchAddToCacheDuration } from './cache';

const MAX_ZOOM = 10;

let map, tileFeaturesSource;

export function installCacheIntersection(theMap, wmtsSource) {
  map = theMap;

  tileFeaturesSource = new VectorSource();
  map.addLayer(new VectorLayer({
    source: tileFeaturesSource,
  }));

  // Mise en cache par intersection
  const draw = new Draw({
    type: 'LineString',
    stopClick: true,
  });
  draw.setActive(false);
  map.addInteraction(draw);

  draw.on('drawend', (event) => {
    draw.setActive(false);
    const geometry = event.feature.getGeometry();

    const zoom = map.getView().getZoom();
    if (zoom < MAX_ZOOM) {
      alert('Un nombre trop important de tuiles serait mis en cache à cette échelle. Veuillez zoomer');
      return;
    }

    const features = featuresOfTilesToCacheInsersecting(geometry, zoom, wmtsSource);
    tileFeaturesSource.addFeatures(features);
  });


  const span = document.createElement('span');
  span.textContent = ' | '
  document.getElementsByClassName('toolbar')[0].appendChild(span);
  // Bouton de dessin
  const drawBtn = document.createElement('button');
  drawBtn.id = 'load-cache-intersecting';
  drawBtn.title = "une ligne pour identifier les tuiles à conserver";
  drawBtn.textContent = "✐ Dessiner";
  drawBtn.onclick = function () {
    if (map.getView().getZoom() < MAX_ZOOM) {
      alert('Un nombre trop important de tuiles serait mis en cache à cette échelle. Veuillez zoomer');
      return;
    }
    draw.setActive(true);
    tileFeaturesSource.clear();
  };
  document.getElementsByClassName('toolbar')[0].appendChild(drawBtn);

  // Bouton de mise en cache
  const cacheUrlsBtn = document.createElement('button');
  cacheUrlsBtn.id = 'load-cache-intersecting';
  cacheUrlsBtn.title = "les tuiles identifiées";
  cacheUrlsBtn.textContent = "★ Conserver";
  cacheUrlsBtn.onclick = function () {
    const features = tileFeaturesSource.getFeatures();
    if (features.length <= 0 || !confirm(features.length + ' tuiles seront mises en cache ('
      + batchAddToCacheDuration(features) + ' sec avec la fibre environ). Continuer ?')) {
      return;
    }
    batchAddToCache(tileFeatureToUrls(features));
    tileFeaturesSource.clear();
  };
  document.getElementsByClassName('toolbar')[0].appendChild(cacheUrlsBtn);

  function manageBtnEnabled() {
    const zoom = map.getView().getZoom();
    cacheUrlsBtn.disabled = drawBtn.disabled = zoom < MAX_ZOOM;
  }

  map.getView().on('change:resolution', event => {
    const zoom = map.getView().getZoom();
    cacheUrlsBtn.disabled = drawBtn.disabled = zoom < MAX_ZOOM;
  })
  manageBtnEnabled();
}

/**
 * Calcul de features représentant les tuiles intersectant la géométrie avec un attribut tileUrl correspondant à l'URL de la tuile.
 *
 * @param {*} geometry géométrie intersectant les tuiles à retenir
 * @param {*} zoom niveau de zoom de départ (jusqu'au plus précis)
 * @param {*} wmtsSource
 * @returns
 */
export function featuresOfTilesToCacheInsersecting(geometry, zoom, wmtsSource) {
  const returned = [];
  const extent = geometry.getExtent();

  let maxZoom = wmtsSource.getTileGrid().getMaxZoom();
  for (let zoomN = Math.min(maxZoom, Math.floor(zoom)); zoomN <= maxZoom; zoomN++) {
    wmtsSource.getTileGrid().forEachTileCoord(
      extent,
      parseInt(zoomN),
      (tileCoord) => {
        const tileExtent = wmtsSource.getTileGrid().getTileCoordExtent(tileCoord);
        const tileGeometry = fromExtent(tileExtent);
        if (geometry.intersectsExtent(tileGeometry.getExtent())) {
          returned.push(new Feature({
            geometry: tileGeometry,
            tileUrl: wmtsSource.getTileUrlFunction()(tileCoord)
          }));
        }
      }
    );
  }
  return returned;
}


function tileFeatureToUrls(features) {
  return features.map(feature => feature.getProperties().tileUrl);
}