// Grab HTML UI Layout Elements
const startButton = document.getElementById("startButton");


// 1. START SIMULATION ENGINE
if (startButton) {
  startButton.addEventListener("click", () => {
    startButton.classList.add("d-none");    // Hide Start Button

    
    const existingPanel = document.getElementById("spaFeedbackPanel");
    if (existingPanel) existingPanel.style.display = "none";

    window.launchSimulation(); 
  });
}


