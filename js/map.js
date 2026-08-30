// map.js

let windControlDiv;       // Wind panel
let ilcaControlDiv;       // ILCA Status panel
let clinometerControlDiv; // Heel Clinometer panel
let windVaneControlDiv;   // Wind Vane panel

// ============================================================================
// Helper function to format raw seconds into MM:SS format
// ============================================================================
function formatTime(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// Initialize Map
// ============================================================================
export function initMap() {
  const leewardMarkLat = window.globalSimulationData.leewardMarkLat;
  const leewardMarkLon = window.globalSimulationData.leewardMarkLon;

  const windwardMarkLat = window.globalSimulationData.windwardMarkLat;
  const windwardMarkLon = window.globalSimulationData.windwardMarkLon;

  // ==========================================================================
  // Buoy Icon
  // ==========================================================================
  const buoySVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20" fill="yellow" stroke="orange" stroke-width="4"/>
      <circle cx="24" cy="24" r="8" fill="orange" opacity="0.6"/>
    </svg>
  `;

  const buoyIcon = L.icon({
    iconUrl: "data:image/svg+xml;base64," + btoa(buoySVG),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });

// =========================================================================
// 🟢 STREAMLINED STATIC GREEN TARGET GLOW (No Flashing)
// =========================================================================

// A clean, solid green circle with a soft outer frame (40px wide)
const greenTargetSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#00FF00" opacity="0.4" stroke="#00CC00" stroke-width="2"/></svg>';
  const greenTargetIcon = L.icon({
    iconUrl: "data:image/svg+xml;base64," + btoa(greenTargetSVG),
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24]
  });

  // ==========================================================================
  // Create Leaflet Map
  // ==========================================================================
  const map = L.map('map', {
    center: [windwardMarkLat, windwardMarkLon],
    zoom: 16,
    dragging: false,
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false
  });

  // Make the default scale visible (appears in the bottom-left corner)
L.control.scale().addTo(map);

  // --- Add the 3 Marks to the Map ---
  const windwardMarker = L.marker([windwardMarkLat, windwardMarkLon], { icon: buoyIcon })
    .addTo(map);
  const leewardMarker = L.marker([leewardMarkLat, leewardMarkLon], { icon: buoyIcon })
    .addTo(map);
  // --- Add the green target marker on top of the windward Mark ---
  window.globalSimulationData.activeMarker = L.marker([windwardMarkLat, windwardMarkLon], { icon: greenTargetIcon })
    .addTo(map);

  // ==========================================================================
  // ILCA STATUS CONTROL
  // Position: TOP-LEFT
  // ==========================================================================
  const ILCAControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd: function(map) {
      ilcaControlDiv = L.DomUtil.create(
        'div',
        'ilca-status-container'
      );

      ilcaControlDiv.style.background = 'white';
      ilcaControlDiv.style.padding = '8px';
      ilcaControlDiv.style.borderRadius = '5px';
      ilcaControlDiv.style.boxShadow =
        '0 1px 5px rgba(0,0,0,0.4)';
      ilcaControlDiv.style.textAlign = 'center';
      ilcaControlDiv.style.fontFamily = 'sans-serif';
      ilcaControlDiv.style.fontSize = '12px';
      ilcaControlDiv.style.lineHeight = '1.4em';
      ilcaControlDiv.style.color = '#222';
      ilcaControlDiv.style.fontWeight = 'bold';

      L.DomEvent.disableClickPropagation(ilcaControlDiv);

      updateILCAControl();

      return ilcaControlDiv;
    }
  });


  // ==========================================================================
  // WIND CONTROL
  // Position: TOP-RIGHT
  // ==========================================================================
  const WindControl = L.Control.extend({
    options: {
      position: 'topright'
    },
    onAdd: function(map) {
      windControlDiv = L.DomUtil.create(
        'div',
        'wind-indicator-container'
      );
      windControlDiv.style.background = 'white';
      windControlDiv.style.padding = '8px';
      windControlDiv.style.borderRadius = '5px';
      windControlDiv.style.boxShadow =
        '0 1px 5px rgba(0,0,0,0.4)';
      windControlDiv.style.textAlign = 'center';
      windControlDiv.style.fontFamily = 'sans-serif';
      windControlDiv.style.fontSize = '12px';
      windControlDiv.style.fontWeight = 'bold';
      windControlDiv.style.color = '#222';
      L.DomEvent.disableClickPropagation(windControlDiv);
      updateWindControl();
      return windControlDiv;
    }
  });


  // ==========================================================================
  // CLINOMETER CONTROL
  // Position: BOTTOM-RIGHT
  // ==========================================================================
  const ClinometerControl = L.Control.extend({
    options: {
      position: 'bottomright'
    },
    onAdd: function(map) {

      clinometerControlDiv = L.DomUtil.create(
        'div',
        'clinometer-control-container'
      );

      clinometerControlDiv.style.background = 'white';
      clinometerControlDiv.style.padding = '8px';
      clinometerControlDiv.style.borderRadius = '5px';
      clinometerControlDiv.style.boxShadow =
        '0 1px 5px rgba(0,0,0,0.4)';
      clinometerControlDiv.style.textAlign = 'center';
      clinometerControlDiv.style.fontFamily = 'sans-serif';
      clinometerControlDiv.style.fontSize = '12px';
      clinometerControlDiv.style.color = '#222';
      clinometerControlDiv.style.fontWeight = 'bold';

      L.DomEvent.disableClickPropagation(clinometerControlDiv);

      updateClinometerControl();

      return clinometerControlDiv;
    }
  });

// ==========================================================================
// WIND VANE CONTROL (ILCA Style with No-Go Zone)
// Position: BOTTOM-LEFT (Alongside Clinometer)
// ==========================================================================
// Global variable holder for update loops
const WindVaneControl = L.Control.extend({
  options: {
    position: 'bottomleft'
  },
  onAdd: function(map) {
    // Create the container using Leaflet DOM utility
    windVaneControlDiv = L.DomUtil.create(
      'div',
      'wind-vane-control-container'
    );
    // Apply exact visual formatting styles from your clinometer design baseline
    windVaneControlDiv.style.background = 'white';
    windVaneControlDiv.style.padding = '8px';
    windVaneControlDiv.style.borderRadius = '5px';
    windVaneControlDiv.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
    windVaneControlDiv.style.textAlign = 'center';
    windVaneControlDiv.style.fontFamily = 'sans-serif';
    windVaneControlDiv.style.fontSize = '12px';
    windVaneControlDiv.style.color = '#222';
    windVaneControlDiv.style.fontWeight = 'bold';

    // Prevent map dragging/clicks from passing through the instrument panel
    L.DomEvent.disableClickPropagation(windVaneControlDiv);

    // Run initial rendering pass
    updateWindVaneControl();

    return windVaneControlDiv;
  }
});

/**
 * Updates the inner SVG vector drawing based on current simulation vectors.
 * Call this inside your main rendering/tick animation loop.
 */
  // Add the four independent controls
  map.addControl(new ILCAControl());
  map.addControl(new WindControl());
  map.addControl(new ClinometerControl());
  map.addControl(new WindVaneControl());


  // ==========================================================================
  // Define race bounds
  // ==========================================================================
  const bounds = L.latLngBounds([
    [
      windwardMarkLat,
      windwardMarkLon
    ],

    [
      leewardMarkLat,
      leewardMarkLon
    ]

  ]);

  map.fitBounds(bounds, {
    padding: [50, 50]
  });
  return map;
}

// ============================================================================
// Refresh ILCA STATUS control
// Position: TOP-LEFT
// ============================================================================
export function updateILCAControl() {

  if (!ilcaControlDiv) return;

  if (window.globalSimulationData.raceFinished) return;


  const ilca =
    window.globalSimulationData.ILCA || {};


  const speedKnots =
    ilca.speed?.toFixed(1) || 0;


  const speedMS =
    ilca.speed
      ? (ilca.speed * 0.514).toFixed(2)
      : "0.00";


  const heading =
    ilca.heading?.toFixed(0) || 0;


  const pointOfSail =
    ilca.pointOfSail || "Unknown";


  const timer =
    formatTime(ilca.timer);


  ilcaControlDiv.innerHTML = `

    <div>
      <strong>ILCA Status</strong>
    </div>


    <svg xmlns="http://www.w3.org/2000/svg"
         width="50"
         height="50"
         viewBox="0 0 50 50"
         style="margin:4px 0;">

      <circle cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke="#ccc"
              stroke-width="2"/>

      <text x="25"
            y="10"
            font-size="8"
            text-anchor="middle"
            fill="#666">
        N
      </text>


      <g transform="rotate(${Number(heading)}, 25, 25)">

        <line x1="25"
              y1="45"
              x2="25"
              y2="10"
              stroke="red"
              stroke-width="3"
              stroke-linecap="round"/>

        <polygon points="25,5 20,15 30,15"
                 fill="red"/>

      </g>

    </svg>


    <div>
      Heading: ${heading}°
    </div>

    <div>
      Point of Sail: ${pointOfSail}
    </div>

    <div>
      Speed: ${speedKnots} knots (${speedMS} m/s)
    </div>

    <div>
      Timer: ${timer}
    </div>

  `;


  // Keep the clinometer synchronized with the same ILCA data.
  updateClinometerControl();

  // 🛠️ ADD THIS LINE: Keep the wind vane synchronized with wind and heading data!
  updateWindVaneControl();
}

// ============================================================================
// Refresh WIND control
// Position: TOP-RIGHT
// ============================================================================
export function updateWindControl() {

  if (!windControlDiv) return;


  const windDir =
    window.globalSimulationData.windDirection || 0;

  const windSpeed =
    Number(window.globalSimulationData.windSpeed)
      ?.toFixed(1) || "0.0";


  windControlDiv.innerHTML = `

    <div style="margin-bottom: 2px;">
      WIND
    </div>


    <svg xmlns="http://www.w3.org/2000/svg"
         width="50"
         height="50"
         viewBox="0 0 50 50">

      <circle cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke="#ccc"
              stroke-width="2"/>

      <text x="25"
            y="10"
            font-size="8"
            text-anchor="middle"
            fill="#666">
        N
      </text>


      <g transform="rotate(${windDir}, 25, 25)">

        <line x1="25"
              y1="5"
              x2="25"
              y2="40"
              stroke="blue"
              stroke-width="3"
              stroke-linecap="round"/>

        <polygon points="25,45 20,35 30,35"
                 fill="blue"/>

      </g>

    </svg>


    <div style="margin-top: 2px; color: blue;">
      ${windDir}° at ${windSpeed} kn
    </div>

  `;
}

// ============================================================================
// Refresh WIND VANE
// Position: BOTTOM-LEFT
// ============================================================================
export function updateWindVaneControl() {
  if (!windVaneControlDiv) return;

  const globalData =
    window.globalSimulationData || {};

  const ilca =
    globalData.ILCA || {};

  const trueWindDir =
    parseFloat(globalData.windDirection) || 0;

  const boatHeading =
    parseFloat(ilca.heading) || 0;

  // ==========================================================================
  // Calculate Relative Apparent Wind Angle (0° = Wind dead on the bow)
  // ==========================================================================
  let relativeWindAngle = trueWindDir - boatHeading;
  relativeWindAngle = (relativeWindAngle + 360) % 360;

  // ==========================================================================
  // No-Go Zone Logic (Red warning text if within 45° of the bow)
  // ==========================================================================
  const isInIrons = relativeWindAngle <= 45 || relativeWindAngle >= 315;
  let textColor = "#475569";
  let statusText = "CLEAR";
  
  if (isInIrons) {
    textColor = "#ef4444";
    statusText = "IN IRONS";
  }

  // ==========================================================================
  // Wind Vane HTML
  // ==========================================================================
  windVaneControlDiv.innerHTML = `
    <div style="
      font-size: 11px;
      letter-spacing: 0.5px;
      color: #475569;
      font-weight: bold;
      margin-bottom: 3px;
      font-family: sans-serif;
    ">
      ILCA WIND VANE
    </div>

    <div style="
      position: relative;
      width: 100px;
      height: 100px;
      border: 1px solid #cbd5e1;
      border-radius: 50%;
      background: #f8fafc;
      margin: 0 auto;
      overflow: hidden;
    ">

      <!-- 🛑 Red No-Go Zone Indicator (90° wedge total at top) -->
      <div style="
        position: absolute;
        top: 0;
        left: 50%;
        width: 100px;
        height: 50px;
        background: rgba(239, 68, 68, 0.12);
        border-bottom: 1px dashed #ef4444;
        transform-origin: bottom center;
        transform: translateX(-50%) rotate(0deg);
        clip-path: polygon(50% 100%, 0 0, 100% 0);
        pointer-events: none;
      ">
      </div>

      <!-- Static Bow Landmark Label -->
      <div style="
        position: absolute;
        left: 50%;
        top: 4px;
        transform: translateX(-50%);
        font-size: 8px;
        color: #475569;
        font-weight: bold;
      ">
        BOW
      </div>

      <!-- Static No-Zone Limit Labels -->
      <div style="
        position: absolute;
        left: 12px;
        top: 42px;
        font-size: 7px;
        color: #ef4444;
      ">
        45°
      </div>
      <div style="
        position: absolute;
        right: 12px;
        top: 42px;
        font-size: 7px;
        color: #ef4444;
      ">
        45°
      </div>

      <!-- Rotating Indicator Arrow Needle -->
      <!-- 🛠️ FIX: Added absolute line-height resets and layout bounds to ensure elements don't scale down -->
      <div style="
        position: absolute;
        left: 50%;
        top: 10px;
        width: 2px;
        height: 80px;
        background: #ff4500;
        line-height: 1;
        font-size: 0px;
        transform-origin: center center;
        transform:
          translateX(-50%)
          rotate(${relativeWindAngle}deg);
        transition: transform 0.1s linear;
      ">
        <!-- Arrow Head (Pointing to where wind comes from) -->
        <!-- 🛠️ FIX: Boosted border parameters for visibility and locked bounding box spacing -->
        <div style="
          position: absolute;
          top: -8px;
          left: -6px;
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 12px solid #ff4500;
        ">
        </div>

      </div>
    </div>

    <div style="
      margin-top: 3px;
      font-size: 12px;
      font-weight: bold;
      color: #000000;
    ">
      <span style="color: ${textColor};">
        ${statusText} (${Math.round(relativeWindAngle)}°)
      </span>
    </div>
  `;
}


// ============================================================================
// Refresh HEEL CLINOMETER
// Position: BOTTOM-RIGHT
// ============================================================================
export function updateClinometerControl() {
  if (!clinometerControlDiv) return;

  const ilca =
    window.globalSimulationData.ILCA || {};

  const uiRotation =
    ilca.clinometer || 0;

  const absoluteHeel =
    Math.abs(uiRotation);

  // ==========================================================================
  // Heel color thresholds
  // ==========================================================================
  let needleColor = "#38bdf8";
  if (absoluteHeel >= 38) {
    needleColor = "#ef4444";
  } else if (absoluteHeel >= 25) {
    needleColor = "#f59e0b";
  }

  // ==========================================================================
  // Clinometer HTML
  // ==========================================================================
  clinometerControlDiv.innerHTML = `
    <div style="
      font-size: 11px;
      letter-spacing: 0.5px;
      color: #475569;
      font-weight: bold;
      margin-bottom: 3px;
      font-family: sans-serif;
    ">
      HEEL CLINOMETER
    </div>

    <div style="
      position: relative;
      width: 100px;
      height: 50px;
      border: 1px solid #cbd5e1;
      border-radius: 50px 50px 0 0;
      background: #f8fafc;
      margin: 0 auto;
      overflow: hidden;
    ">

      <div style="
        position: absolute;
        left: 50%;
        bottom: 1px;
        transform: translateX(-50%);
        width: 100%;
        text-align: center;
        font-size: 8px;
        color: #94a3b8;
      ">
        45° [ 0° ] 45°
      </div>

      <!-- Needle -->
      <div style="
        position: absolute;
        left: 50%;
        bottom: 0;
        width: 2px;
        height: 42px;
        background: ${needleColor};
        transform-origin: bottom center;
        transform:
          translateX(-50%)
          rotate(${uiRotation}deg);
        transition: transform 0.2s ease-out;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: -2px;
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
        ">
        </div>
      </div>
    </div>

    <div style="
      margin-top: 3px;
      font-size: 12px;
      font-weight: bold;
      color: #000000;
    ">
      Angle:
      <span style="color: ${needleColor};">
        ${Math.round(absoluteHeel)}°
      </span>
    </div>
  `;
}




