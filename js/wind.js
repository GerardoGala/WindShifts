// js/wind.js

// Permanent training wind
export let baseWindSpeedMS = 5.14; // 10 knots

const WIND_DIRECTION = 0;

// Wind strength settings
const LIGHT_WIND_KNOTS = 15;
const STRONG_WIND_KNOTS = 12;

// Background tracking variables for natural shifts
let windShiftIntervalId = null;
let elapsedTime = 0;

/**
 * Start the permanent training wind baseline values (Static at boot).
 */
export function fetchWind() {
    window.globalSimulationData = window.globalSimulationData || {};
    window.globalSimulationData.windDirection = WIND_DIRECTION;
    window.globalSimulationData.windSpeed = LIGHT_WIND_KNOTS;
    updateWindDisplay();
}

/**
 * Change the wind strength.
 */
export function setWindStrength(strength) {
    if (!window.globalSimulationData) return;

    if (strength === "light") {
        window.globalSimulationData.windSpeed = LIGHT_WIND_KNOTS;
    } else if (strength === "strong") {
        window.globalSimulationData.windowSimulationData = STRONG_WIND_KNOTS;
    }
    updateWindDisplay();
}

/**
 * Active background loop that calculates and injects natural oscillations into the sea breeze.
 */
export function startWindShiftEngine() {
    if (windShiftIntervalId) {
        clearInterval(windShiftIntervalId);
    }

    elapsedTime = 0;

    const FORCE_STATIC_NORTH = false; 
    
    // 🛠️ DYNAMIC LINK: Pulls factor straight from shared global simulation settings
    const windSlowFactor = window.globalSimulationData?.slowMotionFactor || 1;
    const baseIntervalDelay = 500 * windSlowFactor;

    windShiftIntervalId = setInterval(() => {
        if (!window.globalSimulationData) return;

        // Step elapsed time according to the shared global setting multiplier
        elapsedTime += (0.5 * windSlowFactor);

        let finalDirection = WIND_DIRECTION;

        if (FORCE_STATIC_NORTH) {
            finalDirection = WIND_DIRECTION; 
        } else {
            // ⏳ ADJUSTED GRACE PERIOD CHECK
            if (elapsedTime <= (5.0 * windSlowFactor)) {
                finalDirection = WIND_DIRECTION;
            } else {
                // 1. RHYTHMIC OSCILLATION (The Marine Shift)
                const wavePeriod = 40.0 * windSlowFactor;
                const shiftMagnitude = 12.0;
                let adjustedTime = elapsedTime - (5.0 * windSlowFactor); 
                
                let dynamicDirection = WIND_DIRECTION + 
                    Math.sin((adjustedTime * 2 * Math.PI) / wavePeriod) * shiftMagnitude;

                // 2. LOW-FREQUENCY NOISE (The Needle Jitter)
                const microJitter = (Math.random() - 0.5) * 2.0; 

                finalDirection = (dynamicDirection + microJitter + 360) % 360;
            }
        }

        window.globalSimulationData.windDirection = Math.round(finalDirection);
        updateWindDisplay();
    }, baseIntervalDelay); 
}

/**
 * Clean up the wind engine.
 */
export function stopWindShiftEngine() {
    if (windShiftIntervalId) {
        clearInterval(windShiftIntervalId);
        windShiftIntervalId = null;
    }
}

/**
 * Update the wind display.
 */
function updateWindDisplay() {
    const windDiv = document.getElementById("windStatus");
    if (windDiv) {
        const windSpeed = window.globalSimulationData.windSpeed;
        const windDirection = window.globalSimulationData.windDirection;
        windDiv.textContent = `🌬️ Wind: ${windSpeed} knots from ${windDirection}°`;
    }
}
