import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const TILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAP_API_KEY ?? '';
const PLACES_KEY = process.env.EXPO_PUBLIC_GOONG_PLACES_API_KEY ?? '';

// Default center: Ho Chi Minh City
const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface GoongLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationPicked: (location: PickedLocation) => void;
  style?: object;
}

function buildPickerHtml(
  initLat: number,
  initLng: number,
  hasInit: boolean,
  tilesKey: string,
  placesKey: string,
): string {
  const markerInit = hasInit
    ? `
    marker = new goongjs.Marker({ color: '#006b2c', draggable: true })
      .setLngLat([${initLng}, ${initLat}])
      .addTo(map);
    setupDragEnd(marker);`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet"/>
  <style>
    html,body{margin:0;padding:0;width:100%;height:100%;font-family:sans-serif;}
    #map{position:absolute;top:0;bottom:0;width:100%;}
    #hint{
      position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.6);color:#fff;
      font-size:12px;padding:6px 14px;border-radius:20px;
      pointer-events:none;white-space:nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="hint">Chạm vào bản đồ để chọn vị trí</div>
  <script>
    var marker = null;

    function reverseGeocode(lat, lng) {
      fetch(
        'https://rsapi.goong.io/Geocode?latlng=' + lat + ',' + lng + '&api_key=${placesKey}'
      )
        .then(function(r){ return r.json(); })
        .then(function(data){
          var address = (data.results && data.results[0])
            ? data.results[0].formatted_address : '';
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ lat: lat, lng: lng, address: address })
          );
          document.getElementById('hint').style.display = 'none';
        })
        .catch(function(){
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ lat: lat, lng: lng, address: '' })
          );
        });
    }

    function setupDragEnd(m) {
      m.on('dragend', function() {
        var pos = m.getLngLat();
        reverseGeocode(pos.lat, pos.lng);
      });
    }

    goongjs.accessToken = '${tilesKey}';
    var map = new goongjs.Map({
      container: 'map',
      style: 'https://tiles.goong.io/assets/goong_map_web.json?api_key=${tilesKey}',
      center: [${initLng}, ${initLat}],
      zoom: 15
    });

    map.on('load', function() {
      ${markerInit}
    });

    map.on('click', function(e) {
      var lat = e.lngLat.lat;
      var lng = e.lngLat.lng;
      if (marker) {
        marker.setLngLat([lng, lat]);
      } else {
        marker = new goongjs.Marker({ color: '#006b2c', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        setupDragEnd(marker);
      }
      reverseGeocode(lat, lng);
    });
  </script>
</body>
</html>`;
}

export function GoongLocationPicker({
  initialLat,
  initialLng,
  onLocationPicked,
  style,
}: GoongLocationPickerProps) {
  const hasInit = initialLat !== undefined && initialLng !== undefined;
  const lat = hasInit ? initialLat! : DEFAULT_LAT;
  const lng = hasInit ? initialLng! : DEFAULT_LNG;

  const html = buildPickerHtml(lat, lng, hasInit, TILES_KEY, PLACES_KEY);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(e.nativeEvent.data) as PickedLocation;
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        onLocationPicked(parsed);
      }
    } catch {
      // ignore malformed messages
    }
  };

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
        onMessage={handleMessage}
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
