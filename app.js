'use strict';

// Simple error banner
function showError(msg) {
  const el = document.getElementById('err');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
  console.warn('[Map error]', msg);
}

// 1) Token: must be a PUBLIC pk token, restricted by origin to your GitHub Pages and Glide domains.
mapboxgl.accessToken = 'pk.eyJ1IjoicGZhbGVybyIsImEiOiJjbWg1MjM2aXgwMzlxMmpvYXl5amphcWJhIn0.efd7l1ZBRlEs6BFmPhigew'; // e.g., pk.eyJ...

if (!mapboxgl.supported()) {
  showError('WebGL not supported. Use a modern browser with hardware acceleration.');
  throw new Error('WebGL not supported');
}

// 2) Style selection: fallback to a core style by adding ?core=1 to the URL if needed.
const params = new URLSearchParams(window.location.search);
const USE_CORE = params.get('core') === '1';
const STYLE_URL = USE_CORE
  ? 'mapbox://styles/mapbox/light-v11'
  : 'mapbox://styles/pfalero/cmh3l072w001201qpegcy1227';

console.log('[Map] Using style:', STYLE_URL);

const map = new mapboxgl.Map({
  container: 'map',
  style: STYLE_URL,
  bounds: [[-170, 15], [-40, 75]],
  antialias: true
});

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

// Global error logging (auth issues, etc.)
map.on('error', (e) => {
  if (e && e.error) {
    console.error('[Mapbox GL JS error]', e.error);
    const s = String(e.error || '');
    if (s.includes('Unauthorized') || s.includes('401') || s.includes('403')) {
      showError('Authorization failed (401/403). Check token scopes and Allowed URLs (https://falerosuanzes.github.io).');
    }
  }
});

map.on('load', () => {
  console.log('[Map] style loaded');

  // If you only want to test the base map first, return here:
  // return;

  // Insert hover layers under labels if possible
  const labelLayerId = (map.getStyle().layers.find(
    l => l.type === 'symbol' && l.layout && l.layout['text-field']
  ) || {}).id;

  const addLayer = (def) => {
    try {
      if (labelLayerId) map.addLayer(def, labelLayerId);
      else map.addLayer(def);
    } catch (err) {
      console.error('addLayer failed for', def.id, err);
      showError(`Layer "${def.id}" failed to add. See console.`);
    }
  };

  // 3) Boundaries sources (requires Mapbox Boundaries entitlement; if 403, switch to your own tilesets)
  try {
    map.addSource('adm1', {
      type: 'vector',
      url: 'mapbox://mapbox.boundaries-adm1-v4',
      promoteId: 'mapbox_id'
    });
    map.addSource('adm2', {
      type: 'vector',
      url: 'mapbox://mapbox.boundaries-adm2-v4',
      promoteId: 'mapbox_id'
    });
  } catch (e) {
    console.error('addSource failed:', e);
    showError('Failed to add Boundaries sources. If 403, you likely lack Boundaries access.');
  }

  // Filters consistent with Boundaries Explorer (use US worldview)
  const worldviewFilter = ['any',
    ['==', ['get', 'worldview'], 'all'],
    ['in', 'US', ['get', 'worldview']]
  ];
  const caFilter = ['all', worldviewFilter, ['==', ['get', 'iso_3166_1'], 'CA']];
  const usFilter = ['all', worldviewFilter, ['==', ['get', 'iso_3166_1'], 'US']];

  // Invisible hit layers (capture pointer events)
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

  // Hover highlight layers (fill + outline) driven by feature-state
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
  let hoveredProvId = null;
  let hoveredCountyId = null;

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
