'use strict';

// 1) Mapbox access token (yes, it is visible client-side).
// Best practice: use a PUBLIC token restricted by URL origins (GitHub Pages + your Glide domain),
// with minimal scopes (styles:read, tiles:read).
mapboxgl.accessToken = pk.eyJ1IjoicGZhbGVybyIsImEiOiJjbWg1MjM2aXgwMzlxMmpvYXl5amphcWJhIn0.efd7l1ZBRlEs6BFmPhigew;

// 2) Create the map with your custom style and frame US/Canada.
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/pfalero/cmh3l072w001201qpegcy1227',
  bounds: [[-170, 15], [-40, 75]], // Alaska to Newfoundland and down to MX Gulf
  antialias: true
});

// Optional: simple zoom controls
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

// 3) Add sources, layers, and hover interactions after the style loads.
map.on('load', () => {
  // Helper: find a label layer to insert highlights under labels (optional).
  const labelLayerId = (map.getStyle().layers.find(
    l => l.type === 'symbol' && l.layout && l.layout['text-field']
  ) || {}).id;

  // Helper: add a layer either before labels (if found) or on top.
  const addLayer = (def) => {
    if (labelLayerId) map.addLayer(def, labelLayerId);
    else map.addLayer(def);
  };

  // 3a) Mapbox Boundaries sources (require Boundaries access on your account).
  // Promote the 'mapbox_id' property to be each feature's stable id (required for feature-state).
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

  // 3b) Filters: match the Boundaries Explorer worldview and limit to CA/US.
  const worldviewFilter = ['any',
    ['==', ['get', 'worldview'], 'all'],
    ['in', 'US', ['get', 'worldview']]
  ];
  const caFilter = ['all', worldviewFilter, ['==', ['get', 'iso_3166_1'], 'CA']];
  const usFilter = ['all', worldviewFilter, ['==', ['get', 'iso_3166_1'], 'US']];

  // 3c) Invisible fill layers for hit testing (capture mouseover on polygons without changing look).
  addLayer({
    id: 'ca-provinces-hit',
    type: 'fill',
    source: 'adm1',
    'source-layer': 'boundaries_admin_1',
    filter: caFilter,
    paint: { 'fill-color': '#000000', 'fill-opacity': 0 }
  });
  addLayer({
    id: 'us-counties-hit',
    type: 'fill',
    source: 'adm2',
    'source-layer': 'boundaries_admin_2',
    filter: usFilter,
    paint: { 'fill-color': '#000000', 'fill-opacity': 0 }
  });

  // 3d) Hover highlight layers (fill + outline), driven by feature-state.
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

  // 3e) Mouse handlers to toggle feature-state on hovered polygon (province or county).
  let hoveredProvId = null;
  let hoveredCountyId = null;

  map.on('mousemove', 'ca-provinces-hit', (e) => {
    const f = e.features && e.features[0];
    if (!f) return;
    if (hoveredProvId !== null) {
      map.setFeatureState(
        { source: 'adm1', sourceLayer: 'boundaries_admin_1', id: hoveredProvId },
        { hover: false }
      );
    }
    hoveredProvId = f.id;
    map.setFeatureState(
      { source: 'adm1', sourceLayer: 'boundaries_admin_1', id: hoveredProvId },
      { hover: true }
    );
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'ca-provinces-hit', () => {
    if (hoveredProvId !== null) {
      map.setFeatureState(
        { source: 'adm1', sourceLayer: 'boundaries_admin_1', id: hoveredProvId },
        { hover: false }
      );
    }
    hoveredProvId = null;
    map.getCanvas().style.cursor = '';
  });

  map.on('mousemove', 'us-counties-hit', (e) => {
    const f = e.features && e.features[0];
    if (!f) return;
    if (hoveredCountyId !== null) {
      map.setFeatureState(
        { source: 'adm2', sourceLayer: 'boundaries_admin_2', id: hoveredCountyId },
        { hover: false }
      );
    }
    hoveredCountyId = f.id;
    map.setFeatureState(
      { source: 'adm2', sourceLayer: 'boundaries_admin_2', id: hoveredCountyId },
      { hover: true }
    );
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'us-counties-hit', () => {
    if (hoveredCountyId !== null) {
      map.setFeatureState(
        { source: 'adm2', sourceLayer: 'boundaries_admin_2', id: hoveredCountyId },
        { hover: false }
      );
    }
    hoveredCountyId = null;
    map.getCanvas().style.cursor = '';
  });

  // Optional: log tile access errors to help diagnose Boundaries entitlement issues.
  map.on('error', (e) => {
    if (e && e.error) {
      // Network auth or 403s will surface here in dev tools.
      // If you see 403 for mapbox.boundaries-*, your account likely lacks Boundaries access.
      // In that case, upload US TIGER counties + StatsCan provinces to Studio and swap source urls/layers.
      console.warn('Map error:', e.error);
    }
  });
});
