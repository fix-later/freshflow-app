import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const TILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAP_API_KEY ?? '';
const PLACES_KEY = process.env.EXPO_PUBLIC_GOONG_PLACES_API_KEY ?? '';

export interface GoongMapProps {
  destLat: number;
  destLng: number;
  currentLat?: number;
  currentLng?: number;
  zoom?: number;
  style?: object;
}

function buildHtml(
  destLat: number,
  destLng: number,
  currentLat: number | undefined,
  currentLng: number | undefined,
  zoom: number,
  tilesKey: string,
  placesKey: string,
) {
  const hasLocation = currentLat !== undefined && currentLng !== undefined;

  const directionsScript = hasLocation
    ? `
    map.on('load', function () {
      // Current location marker (blue)
      new goongjs.Marker({ color: '#3B82F6' })
        .setLngLat([${currentLng}, ${currentLat}])
        .addTo(map);

      // Fetch directions: Places API key
      fetch('https://rsapi.goong.io/Direction?origin=${currentLat},${currentLng}&destination=${destLat},${destLng}&vehicle=car&api_key=${placesKey}')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.routes || !data.routes.length) return;
          var encoded = data.routes[0].overview_polyline.points;
          var coords = decodePolyline(encoded);

          map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }
          });
          map.addLayer({
            id: 'route-outline',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 }
          });
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#006b2c', 'line-width': 5, 'line-opacity': 0.95 }
          });

          // Fit bounds to show full route
          var bounds = new goongjs.LngLatBounds([${currentLng}, ${currentLat}], [${currentLng}, ${currentLat}]);
          bounds.extend([${destLng}, ${destLat}]);
          coords.forEach(function (c) { bounds.extend(c); });
          map.fitBounds(bounds, { padding: 48, maxZoom: 16 });
        })
        .catch(function (e) { console.error('Directions error', e); });
    });`
    : `
    map.on('load', function () {
      new goongjs.Marker({ color: '#006b2c' })
        .setLngLat([${destLng}, ${destLat}])
        .addTo(map);
    });`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet"/>
  <style>
    html,body{margin:0;padding:0;width:100%;height:100%;}
    #map{position:absolute;top:0;bottom:0;width:100%;}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function decodePolyline(encoded) {
      var pts=[],i=0,len=encoded.length,lat=0,lng=0;
      while(i<len){
        var b,s=0,r=0;
        do{b=encoded.charCodeAt(i++)-63;r|=(b&0x1f)<<s;s+=5;}while(b>=0x20);
        lat+=((r&1)?~(r>>1):(r>>1));s=0;r=0;
        do{b=encoded.charCodeAt(i++)-63;r|=(b&0x1f)<<s;s+=5;}while(b>=0x20);
        lng+=((r&1)?~(r>>1):(r>>1));
        pts.push([lng/1e5,lat/1e5]);
      }
      return pts;
    }

    goongjs.accessToken='${tilesKey}';
    var map=new goongjs.Map({
      container:'map',
      style:'https://tiles.goong.io/assets/goong_map_web.json?api_key=${tilesKey}',
      center:[${destLng},${destLat}],
      zoom:${zoom}
    });

    // Destination marker (green)
    new goongjs.Marker({color:'#006b2c'})
      .setLngLat([${destLng},${destLat}])
      .addTo(map);

    ${directionsScript}
  </script>
</body>
</html>`;
}

export function GoongMap({
  destLat,
  destLng,
  currentLat,
  currentLng,
  zoom = 15,
  style,
}: GoongMapProps) {
  const html = buildHtml(destLat, destLng, currentLat, currentLng, zoom, TILES_KEY, PLACES_KEY);

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html, baseUrl: 'https://tiles.goong.io' }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="compatibility"
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, overflow: 'hidden', height: 260 },
  map: { flex: 1, backgroundColor: '#e8ecf0' },
});
