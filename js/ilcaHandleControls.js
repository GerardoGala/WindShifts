// ilcaHandleControls.js
import { computeBearing } from "./ilcaUtils.js";

export function handleControls(windDir, windSpeed) {
  const ilca = window.globalSimulationData.ILCA;
  let currentHeading = ilca.heading;
  
  // --- TRACK OLD TACK STATE ---
  // Calculate which tack we are on BEFORE the steering maneuver
  const relativeAngleBefore = ((currentHeading - windDir + 540) % 360) - 180; 
  const isStarboardTackBefore = relativeAngleBefore >= 0;

  // A crisp 3-degree adjustment step prevents over-steering near the buoys
  const STEERING_STEP = 3; 

  switch (ilca.maneuver) {
    case "tack": {
      // ⛵ INTELLIGENT SINGLE-BUTTON TACK: Automatically decides which direction to swing
      // based on the boat's active tack state before crossing the wind eye.
      if (isStarboardTackBefore) {
        // Starboard tack requires turning to PORT (Left) across the wind axis
        let targetHeading = (currentHeading - 45 + 360) % 360;
        const relativeAngleAfter = ((targetHeading - windDir + 540) % 360) - 180;
        
        if (Math.abs(relativeAngleAfter) < 45) {
          ilca.heading = (windDir - 45 + 360) % 360; // Clean snap to Port Close Hauled
        } else {
          ilca.heading = targetHeading;
        }
      } else {
        // Port tack requires turning to STARBOARD (Right) across the wind axis
        let targetHeading = (currentHeading + 45 + 360) % 360;
        const relativeAngleAfter = ((targetHeading - windDir + 540) % 360) - 180;
        
        if (Math.abs(relativeAngleAfter) < 45) {
          ilca.heading = (windDir + 45) % 360; // Clean snap to Starboard Close Hauled
        } else {
          ilca.heading = targetHeading;
        }
      }
      break;
    }

    case "turn-port": {
      // Calculate a standard 45-degree turn left
      let targetHeading = (currentHeading - 45 + 360) % 360;
      
      // Check if this left turn would land the bow inside the "In Irons" no-go zone.
      // An ILCA stalls if it gets closer than 45° to the wind axis.
      const relativeAngleAfter = ((targetHeading - windDir + 540) % 360) - 180;
      
      if (Math.abs(relativeAngleAfter) < 45) {
        // ⛵ INTENTIONAL TACK COMPENSATOR: Instead of stalling in irons,
        // snap the boat perfectly to the opposite upwind Close Hauled tack (-45° from wind)
        ilca.heading = (windDir - 45 + 360) % 360;
        //console.log(`⛵ Port Turn forced a tack! Compensating to Port Close Hauled at ${ilca.heading}° to avoid In Irons.`);
      } else {
        ilca.heading = targetHeading;
      }
      break;
    }

    case "turn-starboard": {
      // Calculate a standard 45-degree turn right
      let targetHeading = (currentHeading + 45 + 360) % 360;
      
      // Check if this right turn would land the bow inside the "In Irons" no-go zone.
      const relativeAngleAfter = ((targetHeading - windDir + 540) % 360) - 180;
      
      if (Math.abs(relativeAngleAfter) < 45) {
        // ⛵ INTENTIONAL TACK COMPENSATOR: Instead of stalling in irons,
        // snap the boat perfectly to the opposite upwind Close Hauled tack (+45° from wind)
        ilca.heading = (windDir + 45) % 360;
        //console.log(`⛵ Starboard Turn forced a tack! Compensating to Starboard Close Hauled at ${ilca.heading}° to avoid In Irons.`);
      } else {
        ilca.heading = targetHeading;
      }
      break;
    }

    case "head-up":
      // ⛵ Head Up always steers the bow CLOSER to the wind axis
      if (isStarboardTackBefore) {
        ilca.heading = (currentHeading - STEERING_STEP + 360) % 360; // Turn left
      } else {
        ilca.heading = (currentHeading + STEERING_STEP + 360) % 360; // Turn right
      }
      break;

    case "bear-away": {
      // Check if the boat is currently trapped inside the 45-degree "In Irons" zone
      if (Math.abs(relativeAngleBefore) < 45) {
        // ⛵ IN IRONS ESCAPE VALVE: Force the boat's heading directly out to a working 
        // Close Hauled upwind alignment (45° off the wind) based on its current tack.
        if (isStarboardTackBefore) {
          ilca.heading = (windDir + 45) % 360; // Snap right out to Starboard Close Hauled
        } else {
          ilca.heading = (windDir - 45 + 360) % 360; // Snap left out to Port Close Hauled
        }
        //console.log(`⛵ Trapped In Irons! Bear away forced a clean recovery snap to Close Hauled at ${ilca.heading}°.`);
      } else {
        // ⛵ NORMAL OPERATION: Execute standard, smooth 3-degree adjustments when sailing freely
        if (isStarboardTackBefore) {
          ilca.heading = (currentHeading + STEERING_STEP + 360) % 360; // Turn right
        } else {
          ilca.heading = (currentHeading - STEERING_STEP + 360) % 360; // Turn left
        }
      }
      break;
    }
  }


  // --- TACK PENALTY EVALUATION LAYER ---
  // Calculate which tack we are on AFTER the steering maneuver completed
  const relativeAngleFinal = ((ilca.heading - windDir + 540) % 360) - 180;
  const isStarboardTackAfter = relativeAngleFinal >= 0;

  // If the tack state switched (e.g. Starboard to Port or Port to Starboard)
  if (isStarboardTackBefore !== isStarboardTackAfter) {
    
    // We must check if the crossing happened in front of the wind (a Tack) or behind it (a Jibe).
    // If the absolute average angle to the wind is less than 90°, it means the bow crossed the wind axis.
    const avgRelativeAngle = Math.abs((relativeAngleBefore + relativeAngleFinal) / 2);
    
    if (avgRelativeAngle < 90) {
      // ⛵ CRITICAL TACK PENALTY: Damping momentum as the sail passes through the eye of the wind.
      // Drops current speed by 35% instantly to simulate flapping sails and hull drag.
      const oldSpeed = ilca.speed || 0;
      ilca.speed = oldSpeed * 0.65;
      
      //console.log(`⛵ TACK DETECTED! Heading changed through the wind axis. Speed penalized from ${oldSpeed.toFixed(1)}kn to ${ilca.speed.toFixed(1)}kn.`);
    }
  }


  // Clear the maneuver state so it doesn't loop infinitely 
  ilca.maneuver = null; 

  // ==========================================================================
  // ⛵ KINETIC MOMENTUM & "IN IRONS" DRAG LAYER
  // ==========================================================================
  // Calculate final relative angle to the wind (0° = dead into the wind)
  let angleToWind = Math.abs(((ilca.heading - windDir + 540) % 360) - 180);

  if (angleToWind < 45) {
    // 🛑 WE ARE PHYSICALLY POINTING IN THE NO-GO ZONE
    let currentSpeed = ilca.speed || 0;

    if (currentSpeed > 0.1) {
      // COASTING MOMENTUM: Let the boat glide through on its kinetic energy!
      // 0.85 means it loses 15% of its speed per 1-second physics tick.
      // The flapping, luffing sails act as air brakes, decaying speed over a few seconds.
      ilca.speed = currentSpeed * 0.85;
      ilca.pointOfSail = "In Irons (Coasting)";
    } else {
      // MOMENTUM DEPLETED: The boat is officially dead in the water trapped in irons
      ilca.speed = 0;
      ilca.pointOfSail = "IN IRONS (Stalled)";
    }
          console.log("pointOfSail", ilca.pointOfSail)
  } else {
    // ✅ FREELY SAILING: Fallback safety step
    // If the boat just escaped the no-go zone but stalled down to 0, 
    // give it a tiny kickstart so it can catch wind and begin accelerating again.
    if ((ilca.speed || 0) === 0) {
      ilca.speed = 0.5; 
    }
  }
} // <--- This closes your export function handleControls




function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
