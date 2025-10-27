'use strict';

// Visible error helper
function showError(msg) {
  const el = document.getElementById('err');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  console.warn('[Map error]', msg);
}

console.log('app.js v1 running, typeof mapboxgl =', typeof mapboxgl);
if (typeof mapboxgl === 'undefined') {
  showError('Mapbox GL JS did not load. Try the provided CDN, hard-refresh, or self-host mapbox-gl.');
  throw new Error('mapboxgl missing');
}

// Public, origin-restricted token (set Allowed URLs to your GH Pages and Glide domains)
mapboxgl.accessToken = 'pk.eyJ1IjoicGZhbGVybyIsImEiOiJjbWg1MjM2aXgwMzlxMmpvYXl5amphcWJhIn0.efd7l1ZBRlEs6BFmPhigew';

// Optional: WebGL check
if (!mapboxgl.supported()) {
  showError('WebGL not supported. Enable hardware acceleration or use a modern browser.');
  throw new Error('WebGL not supported');
}

// Your custom style
const STYLE_URL = 'mapbox://styles/pfalero/cmh3l072w001201qpegcy1227';

const map = new mapboxgl.Map({
  container: 'map',
  style: STYLE_URL,
  bounds: [[-170, 15], [-40, 75]],
  antialias: true
});
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

// Surface auth/network errors
map.on('error', (e) => {
  if (!e || !e.error) return;
  const s = String(e.error);
  console.error('[Mapbox GL JS error]', e.error);
  if (s.includes('401') || s.includes('403') || s.toLowerCase().includes('unauthorized')) {
    showError('Authorization failed (401/403). Ensure your token scopes include styles:read, tiles:read and Allowed URLs include https://falerosuanzes.github.io');
  }
});

map.on('load', () => {
  console.log('[Map] style loaded');

  // Insert hover layers under the first symbol layer (keeps labels above)
  const labelLayerId = (map.getStyle().layers.find(
    l => l.type === 'symbol' && l.layout && l.layout['text-field']
  ) || {}).id;
  const addLayer = (def) => {
    try { labelLayerId ? map.addLayer(def, labelLayerId) : map.addLayer(def); }
    catch (err) { console.error('addLayer failed:', def.id, err); }
  };

  // Mapbox Boundaries sources (require Boundaries access; 403 means you lack access)
  try {
    map.addSource('adm1', { type: 'vector', url: 'mapbox://mapbox.boundaries-adm1-v4', promoteId: 'mapbox_id' }); // Provinces/States
    map.addSource('adm2', { type: 'vector', url: 'mapbox://mapbox.boundaries-adm2-v4', promoteId: 'mapbox_id' }); // Counties
  } catch (e) {
    console.error('addSource failed:', e);
  }

  // Filters matching Boundaries Explorer (US worldview + country filters)
  const worldviewFilter = ['any',
    ['==', ['get', 'worldview'], 'all'],
    ['in', 'US', ['get', 'worldview']]
  ];
  const caFilter = ['all', worldviewFilter, ['==', ['get', 'iso_3166_1'], 'CA']];
  const usFilter = ['all', worldviewFilter, ['==', ['get', 'iso_3166_1'], 'US']];

  // Invisible hit layers to catch pointer events
  addLayer({
    id: 'ca-provinces-hit',
    type: 'fill',
    source: 'adm1',
    'source-layer': 'boundaries_admin_1',
    filter: caFilter,
    paint: { 'fill-color': '#000', 'fill-opacity': 0 }
  });
  addLayer({
    id: 'us-counties-hit',
    type: 'fill',
    source: 'adm2',
    'source-layer': 'boundaries_admin_2',
    filter: usFilter,
    paint: { 'fill-color': '#000', 'fill-opacity': 0 }
  });

  // Hover highlight layers (feature-state)
  addLayer({
    id: 'ca-provinces-hover-fill',
    type: 'fill',
    source: 'adm1',
    'source-layer': 'boundaries_admin_1',
    filter: caFilter,
    paint: {
      'fill-color': '#FF9900',
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0]
    }
  });
  addLayer({
    id: 'ca-provinces-hover-outline',
    type: 'line',
    source: 'adm1',
    'source-layer': 'boundaries_admin_1',
    filter: caFilter,
    paint: {
      'line-color': '#FF9900',
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3, 0]
    }
  });
  addLayer({
    id: 'us-counties-hover-fill',
    type: 'fill',
    source: 'adm2',
    'source-layer': 'boundaries_admin_2',
    filter: usFilter,
    paint: {
      'fill-color': '#FF9900',
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.12, 0]
    }
  });
  addLayer({
    id: 'us-counties-hover-outline',
    type: 'line',
    source: 'adm2',
    'source-layer': 'boundaries_admin_2',
    filter: usFilter,
    paint: {
      'line-color': '#FF9900',
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 0]
    }
  });

  // Hover state handlers
  let hoveredProvId = null, hoveredCountyId = null;

  map.on('mousemove', 'ca-provinces-hit', (e) => {
    const f = e.features && e.features[0];
    if (!f) return;
    if (hoveredProvId !== null) {
      map.setFeatureState({ source: 'adm1', sourceLayer: 'boundaries_admin_1', id: hoveredProvId }, { hover: false });
    }
    hoveredProvId = f.id;
    map.setFeatureState({ source: 'adm1', sourceLayer: 'boundaries_admin_1', id: hoveredProvId }, { hover: true });
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'ca-provinces-hit', () => {
    if (hoveredProvId !== null) {
      map.setFeatureState({ source: 'adm1', sourceLayer: 'boundaries_admin_1', id: hoveredProvId }, { hover: false });
    }
    hoveredProvId = null;
    map.getCanvas().style.cursor = '';
  });

  map.on('mousemove', 'us-counties-hit', (e) => {
    const f = e.features && e.features[0];
    if (!f) return;
    if (hoveredCountyId !== null) {
      map.setFeatureState({ source: 'adm2', sourceLayer: 'boundaries_admin_2', id: hoveredCountyId }, { hover: false });
    }
    hoveredCountyId = f.id;
    map.setFeatureState({ source: 'adm2', sourceLayer: 'boundaries_admin_2', id: hoveredCountyId }, { hover: true });
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'us-counties-hit', () => {
    if (hoveredCountyId !== null) {
      map.setFeatureState({ source: 'adm2', sourceLayer: 'boundaries_admin_2', id: hoveredCountyId }, { hover: false });
    }
    hoveredCountyId = null;
    map.getCanvas().style.cursor = '';
  });
});
