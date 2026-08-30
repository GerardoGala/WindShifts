document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Calculate the project root directory safely for VSCodium and GitHub Pages
  const currentPath = window.location.pathname;
  const projectRoot = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
  const baseUrl = `${window.location.origin}${projectRoot}`;

  // 2. Safe Component Loader Function
  async function loadComponent(fileName, placeholderId) {
    const placeholder = document.getElementById(placeholderId);
    
    // 🔥 THE FIX: Null Guard. If the placeholder element doesn't exist yet, 
    // stop immediately instead of running .innerHTML and crashing the script!
    if (!placeholder) {
      console.error(`[Layout Error] Could not find an HTML element with id="${placeholderId}". Make sure it exists in your HTML file.`);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}${fileName}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - File not found`);
      }
      
      const htmlContent = await response.text();
      
      // Inject the code safely now that we confirmed 'placeholder' is not null
      placeholder.innerHTML = htmlContent;

      // Reactivate any script tags found inside the injected HTML component
      placeholder.querySelectorAll("script").forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

    } catch (error) {
      console.error(`Error loading ${fileName}:`, error);
      placeholder.innerHTML = `<p style="color: red; padding: 10px;">Error loading component (${fileName}).</p>`;
    }
  }

  // 3. Run the loaders
  loadComponent("header.html", "header-placeholder");
  loadComponent("footer.html", "footer-placeholder");
});
