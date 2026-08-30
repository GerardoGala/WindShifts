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

    // Initialize global simulation data
    window.globalSimulationData =
        window.globalSimulationData || {};

    window.globalSimulationData.windDirection =
        WIND_DIRECTION;

    // Default = light wind
    window.globalSimulationData.windSpeed =
        LIGHT_WIND_KNOTS;

    updateWindDisplay();
    
    // Static baseline established. Awaits the Start button to run oscillations.
}


/**
 * Change the wind strength.
 */
export function setWindStrength(strength) {

    if (!window.globalSimulationData) {
        return;
    }

    if (strength === "light") {

        window.globalSimulationData.windSpeed =
            LIGHT_WIND_KNOTS;

    } else if (strength === "strong") {

        window.globalSimulationData.windSpeed =
            STRONG_WIND_KNOTS;
    }

    updateWindDisplay();
}


/**
 * Active background loop that calculates and injects natural oscillations into the sea breeze.
 * Triggered exactly when the user clicks 'Start Simulation'.
 */
/**
 * Active background loop that calculates and injects natural oscillations into the sea breeze.
 * Triggered exactly when the user clicks 'Start Simulation'.
 * Includes a 5-second stable grace period at startup.
 */
export function startWindShiftEngine() {
    // Clear any loose background loops to prevent overlapping threads
    if (windShiftIntervalId) {
        clearInterval(windShiftIntervalId);
    }

    elapsedTime = 0;

    // Run a smooth update loop every 500ms to keep the needle fluid
    windShiftIntervalId = setInterval(() => {
        if (!window.globalSimulationData) return;

        elapsedTime += 0.5;

        let finalDirection = WIND_DIRECTION;

        // ⏳ 5-SECOND GRACE PERIOD CHECK
        if (elapsedTime <= 5.0) {
            // Keep wind perfectly rock-solid at 0° so the boat can gather forward speed
            finalDirection = WIND_DIRECTION;
        } else {
            // 1. RHYTHMIC OSCILLATION (The Marine Shift)
            // Subtracting 5 seconds from the wave timeline ensures the sine wave begins 
            // smoothly from 0 right after the grace period ends.
            const wavePeriod = 40.0;
            const shiftMagnitude = 12.0;
            let adjustedTime = elapsedTime - 5.0; 
            
            let dynamicDirection = WIND_DIRECTION + 
                Math.sin((adjustedTime * 2 * Math.PI) / wavePeriod) * shiftMagnitude;

            // 2. LOW-FREQUENCY NOISE (The Needle Jitter)
            const microJitter = (Math.random() - 0.5) * 2.0; // ±1.0 degree variation

            // Combine and normalize to a positive 360-degree compass circle
            finalDirection = (dynamicDirection + microJitter + 360) % 360;
        }

        // Save the calculated value to global scope
        window.globalSimulationData.windDirection = Math.round(finalDirection);

        // Update display text and push to instruments
        updateWindDisplay();
    }, 500);
}



/**
 * Clean up the wind engine.
 * Call this when a student capsizes or resets the map view entirely.
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

    const windDiv =
        document.getElementById("windStatus");

    if (windDiv) {

        const windSpeed =
            window.globalSimulationData.windSpeed;

        const windDirection =
            window.globalSimulationData.windDirection;

        windDiv.textContent =
            `🌬️ Wind: ${windSpeed} knots from ${windDirection}°`;
    }
}
