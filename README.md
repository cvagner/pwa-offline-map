
# Carte déconnectée PWA

Cette application démontre la **mise en cache de fonds de plans tuilés** dans une carte afin de travailler hors ligne.
Elle permet également d'afficher la position courante et centrer la carte.

Une démonstration est disponible [ici](https://cvagner.keybase.pub/pwa-offline-map/index.html).

La carte est construite avec [Openlayers](https://openlayers.org/) et l'unique fond de plan est la couche raster tuilée `Photographies aériennes` fournie par [l'IGN](https://www.ign.fr/) conformément au protocole OGC [WMTS](https://www.ogc.org/standards/wmts), avec la projection Pseudo-mercator [EPSG:3857](https://epsg.io/3857) (couverture mondiale).

L'application est compilée avec [Yarn](https://yarnpkg.com/) et [Vite](https://vitejs.dev/).


## Développement

Installer les dépendances :
```sh
yarn
```

Tester :
```sh
yarn dev
```


## Déploiement

Construire :
```sh
yarn build
```

Et déployer le contenu du répertoire `dist`.
