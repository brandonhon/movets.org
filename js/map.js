const map = L.map('map').setView([38.573936, -92.603760], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const partyColors = {
  R: '#FF344C',
  D: '#26385E',
};

function getColor(party) {
  return partyColors[party] || '#BEC1C8';
}

function defaultStyle(feature) {
  return {
    fillColor: getColor(feature.properties.party),
    weight: 1,
    opacity: 1,
    color: '#ffffff',
    fillOpacity: 0.55,
  };
}

// Track whether a district search is active (affects hover behavior)
let searchActive = false;
let searchedDistrict = null;

function currentStyle(feature) {
  if (!searchActive) return defaultStyle(feature);
  // In search mode: searched district is bright, others are dimmed
  if (feature.properties.district === searchedDistrict) {
    return { fillColor: getColor(feature.properties.party), weight: 3, color: '#FFD700', fillOpacity: 0.9, opacity: 1 };
  }
  return { fillColor: getColor(feature.properties.party), weight: 0.5, color: '#ffffff', fillOpacity: 0.15, opacity: 1 };
}

function highlightFeature(e) {
  const layer = e.target;
  layer.setStyle({ weight: 3, color: '#FFD700', fillOpacity: 0.8 });
  layer.bringToFront();
  info.update(layer.feature.properties);
}

function resetHighlight(e) {
  // Reset to the correct style based on current mode
  e.target.setStyle(currentStyle(e.target.feature));
  info.update();
}

function onEachFeature(feature, layer) {
  const p = feature.properties;

  let popupContent;
  if (p.rep_name === 'Vacant') {
    popupContent = `<div class="district-popup">
      <h4>District ${p.district}</h4>
      <p class="vacant">Seat Vacant</p>
    </div>`;
  } else {
    popupContent = `<div class="district-popup">
      <h4>District ${p.district}</h4>
      <p class="rep-name">${p.rep_name}</p>
      <p class="party-label ${p.party === 'D' ? 'dem' : 'rep'}">${p.party === 'D' ? 'Democrat' : 'Republican'}</p>
      <p style="margin:4px 0;font-size:13px;">${p.email}</p>
      <button onclick="selectRep(${p.district}, '${p.rep_name.replace(/'/g, "\\'")}', '${p.party}', '${p.email}')"
        style="margin-top:8px;background:#FF344C;color:#fff;border:none;border-radius:40px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;width:100%;">
        Select as my Representative
      </button>
    </div>`;
  }

  layer.bindPopup(popupContent);
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
  });
}

// Called from popup button
function selectRep(district, repName, party, email) {
  if (typeof setRepFromLookup === 'function') {
    setRepFromLookup({ district, rep_name: repName, party, email });
  }
  // Scroll to the contact form
  const formSection = document.getElementById('contact-form');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth' });
  }
  // Close popup
  map.closePopup();
}

let geojsonLayer;

// Info control
const info = L.control({ position: 'topright' });

info.onAdd = function () {
  this._div = L.DomUtil.create('div', 'info-panel');
  this.update();
  return this._div;
};

info.update = function (props) {
  if (props) {
    const partyLabel = props.party === 'D' ? 'Democrat' : props.party === 'R' ? 'Republican' : 'Vacant';
    this._div.innerHTML =
      `<h4>District ${props.district}</h4>` +
      `<b>${props.rep_name}</b><br>${partyLabel}`;
  } else {
    this._div.innerHTML = '<h4>Missouri House Districts</h4>Hover over a district';
  }
};

info.addTo(map);

// Legend
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info-panel legend');
  div.innerHTML =
    '<h4>Party</h4>' +
    '<i style="background:#FF344C"></i> Republican<br>' +
    '<i style="background:#26385E"></i> Democrat<br>' +
    '<i style="background:#BEC1C8"></i> Vacant';
  return div;
};

legend.addTo(map);

// Highlight and zoom to a specific district
function highlightDistrict(districtNum) {
  if (!geojsonLayer) return;

  searchActive = true;
  searchedDistrict = districtNum;

  geojsonLayer.eachLayer(function (layer) {
    layer.setStyle(currentStyle(layer.feature));
    if (layer.feature.properties.district === districtNum) {
      layer.bringToFront();
      map.fitBounds(layer.getBounds(), { maxZoom: 10 });
      layer.openPopup();
    }
  });
}

// Reset map to default view
function resetMap() {
  if (!geojsonLayer) return;
  searchActive = false;
  searchedDistrict = null;
  geojsonLayer.eachLayer(l => l.setStyle(defaultStyle(l.feature)));
  map.fitBounds(geojsonLayer.getBounds());
}

// Load GeoJSON
fetch('data/mo-house-districts.geojson')
  .then(res => res.json())
  .then(data => {
    geojsonLayer = L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: onEachFeature,
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());
  });
