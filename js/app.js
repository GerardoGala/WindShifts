// app.js
import { initMap, updateWindControl, updateILCAControl } from './map.js';
import { fetchWind, startWindShiftEngine } from './wind.js'; 
import { updateILCA } from './ilcaUpdateILCA.js';
import { applyControls } from './ilcaApplyControls.js';

let map;
let launched = false;
let masterIntervalId = null;

async function loadConfig() {
  // Ensure the global simulation container object is initialized first
  window.globalSimulationData = window.globalSimulationData || {};

  // ============================================================================
  // ⏰ THE SINGLE MASTER SLOW MOTION VARIABLE
  // ============================================================================
  // Change this number to throttle the entire simulation system clock speed:
  // 1 = Normal speed (1-second steps)
  // 2 = Twice as slow (2-second intervals)
  // 3 = Three times as slow (3-second intervals)
  window.globalSimulationData.slowMotionFactor = 2; 

  map = initMap();

  // Fetch wind immediately so overlays show something
  await updateWindFromAPI();

  // Show initial status immediately
  updateWindControl(map);
  updateILCAControl();

  // --- Unified master loop (adjusted for slow motion) ---
  let tick = 0;
  masterIntervalId = setInterval(async () => {
    tick++;

    // Update ILCA physics if launched
    if (launched) {
      
      // ⏱️ TIMER STEP: Numerical seconds counter increments cleanly here
      window.globalSimulationData.ILCA.timer++;

      // --- Capsize Halting Check ---
      if (window.globalSimulationData.ILCA.capsized) {
        console.warn("Simulation stopped due to capsize.");
        
        // Hide warning bar and clear active loops
        const warningDiv = document.getElementById("heelWarningContainer");
        if (warningDiv) {
          warningDiv.style.display = "none";
          warningDiv.classList.remove("danger-shake");
        }

        const currentRaceTime = window.globalSimulationData?.raceTime || 0;
        const failureReason = window.globalSimulationData.ILCA.capsizeReason || "leeward_heel";

        stopSimulation();

        // 👉 Redirect with time and specific capsize reason
        window.location.href = `finish.html?time=${currentRaceTime}&reason=${failureReason}`;
        return;
      }

      updateILCA(map);

      const windSpeed = Number(window.globalSimulationData.windSpeed) || 0;
      const windDir = window.globalSimulationData.windDirection;
      const heading = window.globalSimulationData.ILCA.heading;

      // --- Point of Sail ---
      const pointOfSail = getPointOfSail(windDir, heading);
      window.globalSimulationData.ILCA.pointOfSail = pointOfSail;  // <-- store it
      
      const controls = window.globalSimulationData.ILCA;
      const newSpeed = applyControls(pointOfSail, windSpeed, controls); // ◄ Calculated via imported function

      window.globalSimulationData.ILCA.speed = newSpeed;
    }

    // Refresh overlays
    updateWindControl(map);
    updateILCAControl();
   
    // --- Dynamic Cockpit Warning UI Management ---
    const ilcaData = window.globalSimulationData?.ILCA;
    const warningDiv = document.getElementById("heelWarningContainer");
    const heelDegSpan = document.getElementById("uiHeelDegrees");

    if (warningDiv && ilcaData) {
      // Show dashboard element if boat heels past 30 degrees (and isn't flipped yet)
      if (ilcaData.heelAngle >= 30 && !ilcaData.capsized && launched) {
        warningDiv.style.display = "block";
        if (heelDegSpan) {
          heelDegSpan.textContent = Math.round(ilcaData.heelAngle);
        }
        
        // Trigger intense shaking animation class if critically close to tipping over (38°+)
        if (ilcaData.heelAngle >= 38) {
          warningDiv.classList.add("danger-shake");
          warningDiv.style.background = "#fca5a5"; // Deepen panel to warning red
        } else {
          warningDiv.classList.remove("danger-shake");
          warningDiv.style.background = "#fee2e2"; // Keep default alert tint
        }
      } else {
        // Suppress warning layout safely if flat or out of simulation window parameters
        warningDiv.style.display = "none";
        warningDiv.classList.remove("danger-shake");
      }
    }
  }, 1000 * (window.globalSimulationData.slowMotionFactor || 1)); 
}

// --- Clean, flat helper to sync the wind state ---
async function updateWindFromAPI() {
  try {
    const windData = await fetchWind(); // Returns { direction, speed }
    if (windData) {
      window.globalSimulationData.windDirection = Number(windData.direction);
      window.globalSimulationData.windSpeed = Number(windData.speed);
    }
  } catch (err) {
    console.error("Wind fetch failed:", err);
  }
}

// Launch simulation
export function launchSimulation() {
  launched = true;
  fetchWind();

  // Reset core simulation variables back to fresh upright conditions
  window.globalSimulationData.ILCA.capsized = false;
  window.globalSimulationData.ILCA.heelAngle = 0;

  window.globalSimulationData.ILCA.heading = 45;
  window.globalSimulationData.ILCA.speed = 0;
  window.globalSimulationData.ILCA.timer = 0;

  // The shift engine now starts exactly when the user clicks 'Start Simulation'!
  startWindShiftEngine();
}

// Stop simulation
export function stopSimulation() {
  launched = false;
  if (masterIntervalId) {
    clearInterval(masterIntervalId);
    masterIntervalId = null;
  }
}

window.launchSimulation = launchSimulation;
window.stopSimulation = stopSimulation;

loadConfig();

function getPointOfSail(windDir, heading) {
  let rel = Math.abs(heading - windDir) % 360;
  if (rel > 180) rel = 360 - rel; 

  if (rel <= 44)  return "In Irons";       
  if (rel <= 60)  return "Close Hauled";   
  if (rel <= 80)  return "Close Reach";    
  if (rel <= 100) return "Beam Reach";     
  if (rel <= 150) return "Broad Reach";    
  return "Running";                        
}
