/**
 * ZIP-to-district lookup.
 *
 * On the map page (geojsonLayer available):
 *   Nominatim geocode → point-in-polygon against loaded GeoJSON (most reliable)
 *
 * On other pages (no map):
 *   Nominatim geocode → Census reverse geocoder for legislative district
 */

async function lookupDistrictByZip(zip) {
  if (!/^\d{5}$/.test(zip)) return null;

  try {
    const coords = await zipToCoords(zip);
    if (!coords) return null;

    // If map GeoJSON is loaded, use point-in-polygon (fast + reliable)
    if (typeof geojsonLayer !== 'undefined' && geojsonLayer) {
      const result = findDistrictByPoint(coords.lat, coords.lon);
      if (result) return result;
    }

    // Fallback: Census reverse geocoder
    return await coordsToDistrict(coords.lat, coords.lon);
  } catch (err) {
    console.warn('ZIP lookup failed:', err);
    return null;
  }
}

/**
 * Geocode ZIP to lat/lon. Tries Nominatim first, Census geocoder as fallback.
 */
async function zipToCoords(zip) {
  // Try Nominatim
  try {
    const url = 'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({
        postalcode: zip,
        country: 'us',
        format: 'json',
        limit: '1',
      });
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MoVets.org/1.0 (veteran-advocacy)' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.length) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    }
  } catch (e) { /* fall through */ }

  // Fallback: Census geocoder with street address hack
  try {
    const url = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?' +
      new URLSearchParams({
        address: zip + ', MO',
        benchmark: 'Public_AR_Current',
        format: 'json',
      });
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const match = data?.result?.addressMatches?.[0];
      if (match) {
        return { lat: match.coordinates.y, lon: match.coordinates.x };
      }
    }
  } catch (e) { /* fall through */ }

  return null;
}

/**
 * Reverse geocode: coordinates → state legislative district via Census.
 */
async function coordsToDistrict(lat, lon) {
  try {
    const url = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates?' +
      new URLSearchParams({
        x: String(lon),
        y: String(lat),
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: '54',
        format: 'json',
      });
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const geos = data?.result?.geographies;
    if (!geos) return null;

    for (const key of Object.keys(geos)) {
      if (key.toLowerCase().includes('legislative') && key.toLowerCase().includes('lower')) {
        const dist = geos[key]?.[0];
        if (dist && dist.BASENAME) {
          return { district: parseInt(dist.BASENAME, 10) };
        }
      }
    }
  } catch (e) { /* fall through */ }

  return null;
}

/**
 * Point-in-polygon check against loaded Leaflet GeoJSON layer.
 */
function findDistrictByPoint(lat, lon) {
  if (typeof geojsonLayer === 'undefined' || !geojsonLayer) return null;

  const point = L.latLng(lat, lon);
  let found = null;

  geojsonLayer.eachLayer(function (layer) {
    if (found) return;
    if (layer.getBounds && layer.getBounds().contains(point)) {
      if (isPointInLayer(point, layer)) {
        found = {
          district: layer.feature.properties.district,
          rep_name: layer.feature.properties.rep_name,
          party: layer.feature.properties.party,
          email: layer.feature.properties.email,
        };
      }
    }
  });

  return found;
}

function isPointInLayer(point, layer) {
  const latlngs = layer.getLatLngs();
  // Handle MultiPolygon
  const rings = Array.isArray(latlngs[0][0]) ? latlngs.flat() : latlngs;
  for (const ring of rings) {
    if (pointInRing(point, ring)) return true;
  }
  return false;
}

function pointInRing(point, ring) {
  let inside = false;
  const x = point.lat, y = point.lng;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lat, yi = ring[i].lng;
    const xj = ring[j].lat, yj = ring[j].lng;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
