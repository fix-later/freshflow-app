import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const TILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAP_API_KEY ?? '';
const PLACES_KEY = process.env.EXPO_PUBLIC_GOONG_PLACES_API_KEY ?? '';

export interface RouteStop {
  order: number;
  lat: number;
  lng: number;
  status: 'pending' | 'arrived' | 'delivered' | 'failed';
}

export interface RouteOverviewMapProps {
  stops: RouteStop[];
  currentLat?: number;
  currentLng?: number;
  style?: object;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#9CA3AF',
  arrived: '#F59E0B',
  delivered: '#006b2c',
  failed: '#EF4444',
};

function buildHtml(
  stops: RouteStop[],
  currentLat: number | undefined,
  currentLng: number | undefined,
  tilesKey: string,
  placesKey: string,
) {
  const hasLocation = currentLat !== undefined && currentLng !== undefined;
  const mid = stops[Math.floor(stops.length / 2)];
  const centerLat = mid?.lat ?? 10.7769;
  const centerLng = mid?.lng ?? 106.7009;

  const stopsJson = JSON.stringify(
    stops.map(s => ({ order: s.order, lat: s.lat, lng: s.lng, color: STATUS_COLORS[s.status] ?? '#9CA3AF' })),
  );

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
    .sm{width:28px;height:28px;border-radius:50%;color:#fff;font-weight:800;font-size:12px;
        display:flex;align-items:center;justify-content:center;
        border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);}
    .dm{width:16px;height:16px;border-radius:50%;background:#3B82F6;
        border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,0.35);}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function decodePolyline(e){
      var p=[],i=0,l=e.length,a=0,n=0;
      while(i<l){var b,s=0,r=0;
        do{b=e.charCodeAt(i++)-63;r|=(b&31)<<s;s+=5;}while(b>=32);
        a+=r&1?~(r>>1):r>>1;s=0;r=0;
        do{b=e.charCodeAt(i++)-63;r|=(b&31)<<s;s+=5;}while(b>=32);
        n+=r&1?~(r>>1):r>>1;
        p.push([n/1e5,a/1e5]);}
      return p;
    }

    var STOPS=${stopsJson};
    var CURRENT=${hasLocation ? `{lat:${currentLat},lng:${currentLng}}` : 'null'};

    goongjs.accessToken='${tilesKey}';
    var map=new goongjs.Map({
      container:'map',
      style:'https://tiles.goong.io/assets/goong_map_web.json?api_key=${tilesKey}',
      center:[${centerLng},${centerLat}],
      zoom:12
    });

    // Numbered stop markers
    STOPS.forEach(function(s){
      var el=document.createElement('div');
      el.className='sm';
      el.style.backgroundColor=s.color;
      el.textContent=s.order;
      new goongjs.Marker({element:el}).setLngLat([s.lng,s.lat]).addTo(map);
    });

    // Driver location (blue pulsing dot)
    if(CURRENT){
      var de=document.createElement('div');
      de.className='dm';
      new goongjs.Marker({element:de}).setLngLat([CURRENT.lng,CURRENT.lat]).addTo(map);
    }

    // Fit all points into view
    var allPts=STOPS.map(function(s){return[s.lng,s.lat];});
    if(CURRENT) allPts.push([CURRENT.lng,CURRENT.lat]);
    if(allPts.length){
      var bounds=new goongjs.LngLatBounds(allPts[0],allPts[0]);
      allPts.forEach(function(p){bounds.extend(p);});
      map.fitBounds(bounds,{padding:52,maxZoom:14});
    }

    // Draw route: one API call per segment, then merge all polylines
    map.on('load',function(){
      if(STOPS.length<1) return;

      // Build ordered waypoint list: [driver?, stop1, stop2, ..., stopN]
      var pts=[];
      if(CURRENT) pts.push({lat:CURRENT.lat,lng:CURRENT.lng});
      STOPS.forEach(function(s){pts.push({lat:s.lat,lng:s.lng});});
      if(pts.length<2) return;

      // Fetch each segment independently
      var reqs=[];
      for(var i=0;i<pts.length-1;i++){
        var from=pts[i], to=pts[i+1];
        var u='https://rsapi.goong.io/Direction?origin='+from.lat+','+from.lng+
              '&destination='+to.lat+','+to.lng+'&vehicle=car&api_key=${placesKey}';
        reqs.push(fetch(u).then(function(r){return r.json();}));
      }

      Promise.all(reqs).then(function(results){
        var allCoords=[];
        results.forEach(function(d){
          if(d.routes&&d.routes.length){
            var coords=decodePolyline(d.routes[0].overview_polyline.points);
            allCoords=allCoords.concat(coords);
          }
        });
        if(!allCoords.length) return;

        map.addSource('rt',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:allCoords}}});
        map.addLayer({id:'rt-bg',type:'line',source:'rt',
          layout:{'line-join':'round','line-cap':'round'},
          paint:{'line-color':'#fff','line-width':7,'line-opacity':0.85}});
        map.addLayer({id:'rt',type:'line',source:'rt',
          layout:{'line-join':'round','line-cap':'round'},
          paint:{'line-color':'#006b2c','line-width':4,'line-opacity':0.95}});
      }).catch(function(e){console.error('Route error',e);});
    });
  </script>
</body>
</html>`;
}

export function RouteOverviewMap({ stops, currentLat, currentLng, style }: RouteOverviewMapProps) {
  const html = buildHtml(stops, currentLat, currentLng, TILES_KEY, PLACES_KEY);

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
  container: { flex: 1, overflow: 'hidden' },
  map: { flex: 1, backgroundColor: '#e8ecf0' },
});
