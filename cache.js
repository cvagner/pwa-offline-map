// Lecture des tuiles online/offline
export async function onlineOrCacheTileLoadFunction(imageTile, src) {
  caches.match(src, { cacheName: 'orthophotos' }).then((response) => {
    if (!response?.blob) {
      // Cas classique
      imageTile.getImage().src = src;
      return;
    }
    // On récupère les données du cache
    response.blob().then((blob) => {
      const objUrl = URL.createObjectURL(blob);
      imageTile.getImage().onload = () => URL.revokeObjectURL(objUrl);
      imageTile.getImage().src = objUrl;
    });
  });
}

// Vidage du cache (suppression)
export function clearCache() {
  caches.delete('orthophotos');
}

// Calcul les URLs nécessaire au rendu de la couche pour l'étendue donnée et le niveau de zoom minimal fourni
export function urlsToCache(extent, zoom, wmtsSource) {
  let urls = [];
  let maxZoom = wmtsSource.getTileGrid().getMaxZoom();
  for (let zoomN = Math.min(maxZoom, Math.floor(zoom)) ; zoomN<=maxZoom ; zoomN++) {
    wmtsSource.getTileGrid().forEachTileCoord(
      extent,
      parseInt(zoomN),
      (tileCoord) => urls.push(wmtsSource.getTileUrlFunction()(tileCoord))
    );
  }
  return urls;
}

// Chargement du cache
export function loadCache(extent, zoom, wmtsSource) {
  batchAddToCache(urlsToCache(extent, zoom, wmtsSource));
}

// Chargement du cache - mode batch

let chunk = 100, secPerChunk = 1;

// Calcul le temps nécessaire à la mise en cache avec une temporisation
export async function batchAddToCacheDuration(urls) {
  let secs = Math.ceil(urls.length / chunk) * secPerChunk;
  return secs;
}

// Procède à la mise en cache avec une temporisation
export async function batchAddToCache(urls) {  
  while(true) {
    let batch = urls.splice(0, chunk);
    if (batch.length<=0) {
      break;
    }
    addToCache(batch);
    await sleep(secPerChunk * 1000);
  }
}

// Procède à la mise en cache
async function addToCache(urls) {
  let myCache = await window.caches.open('orthophotos');
  await myCache.addAll(urls);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}