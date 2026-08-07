import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { searchPlaces, getPlaceDetail, type PlacePrediction } from '../services/goongPlaces';

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

  // ─── Search-by-address ────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Guards against a slow/stale search response landing after the user has already
  // typed something else — without this it could show suggestions for a query
  // that's no longer in the field.
  const queryRequestRef = useRef('');

  useEffect(() => {
    const trimmed = query.trim();
    queryRequestRef.current = trimmed;
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchPlaces(trimmed);
      if (queryRequestRef.current !== trimmed) return; // superseded by a newer edit — discard
      setSuggestions(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectSuggestion = async (item: PlacePrediction) => {
    setQuery(item.description);
    setSuggestions([]);
    setResolvingId(item.placeId);
    const detail = await getPlaceDetail(item.placeId);
    setResolvingId(null);
    if (detail) {
      onLocationPicked({
        lat: detail.lat,
        lng: detail.lng,
        address: detail.address || item.description,
      });
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Nhập địa chỉ, tên địa điểm..."
          placeholderTextColor={Colors.textMuted}
        />
        {searching && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((item, index) => (
            <Pressable
              key={item.placeId}
              style={[
                styles.suggestionItem,
                index < suggestions.length - 1 && styles.suggestionItemDivider,
              ]}
              onPress={() => handleSelectSuggestion(item)}
              disabled={resolvingId !== null}
            >
              <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
              {resolvingId === item.placeId && (
                <ActivityIndicator size="small" color={Colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  container: { borderRadius: 16, overflow: 'hidden', height: 260 },
  map: { flex: 1, backgroundColor: '#e8ecf0' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, padding: 0 },

  suggestionList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestionItemDivider: {
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  suggestionText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
});
