mapboxgl.accessToken = 'pk.eyJ1IjoicGZhbGVybyIsImEiOiJjbWg1MjM2aXgwMzlxMmpvYXl5amphcWJhIn0.efd7l1ZBRlEs6BFmPhigew';
const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/light-v11', center: [-97.5, 38.5], zoom: 3 });
map.on('load', () => console.log('Base map loaded'));

