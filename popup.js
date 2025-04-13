// File: popup.js
// --- Get references to elements ---
const urlDisplay = document.getElementById("current-url");
const urlInput = document.getElementById("url"); // Hidden input on Main Tab
const colorInput = document.getElementById("color"); // Main Tab Color Input
const tagInput = document.getElementById("tag");
const opacityInput = document.getElementById("opacity");
const colorValueDisplay = document.getElementById("color-value"); // Main Tab Color Display
const opacityValueDisplay = document.getElementById("opacity-value");
const saveButton = document.getElementById("saveButton");
const statusDiv = document.getElementById("status");
const historyList = document.getElementById("history-list");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

// Update color value display
colorInput.addEventListener("input", () => {
  colorValueDisplay.textContent = colorInput.value;
});

// Update opacity value display
opacityInput.addEventListener("input", () => {
  opacityValueDisplay.textContent = `${opacityInput.value}%`;
});

// --- Tab Switching Logic ---
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.getAttribute("data-tab"); // Update button active states

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active"); // Update content active states

    tabContents.forEach((content) => {
      if (content.id === targetTab) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    }); // Refresh history list when switching to its tab (in case of updates)

    if (targetTab === "saved-tags-tab") {
      displayHistory();
    }
  });
});

// --- Function to Display History (with Editable Fields) ---
function displayHistory() {
  historyList.innerHTML = ""; // Clear completely

  chrome.storage.sync.get(null, (items) => {
    // Get all items
    if (chrome.runtime.lastError) {
      console.error("Error retrieving history:", chrome.runtime.lastError);
      historyList.innerHTML =
        '<li class="no-history">Error loading history.</li>';
      return;
    }

    const urls = Object.keys(items);

    if (urls.length === 0) {
      historyList.innerHTML = '<li class="no-history">No saved tags yet.</li>';
      return; // No items to display
    }

    // Sort URLs alphabetically for consistent order
    urls.sort();

    urls.forEach((url) => {
      const itemData = items[url];
      // Check if core data structure is as expected
      if (
        itemData &&
        typeof itemData.color !== "undefined" &&
        typeof itemData.tag !== "undefined"
      ) {
        const listItem = document.createElement("li");
        listItem.setAttribute("data-url", url);
        listItem.className = "history-item";
        listItem.style.borderLeftColor = itemData.color; // Set initial border

        listItem.innerHTML = `
          <div class="history-item-container">
            <a class="history-url-display" href="${url}" title="Open ${url} in new tab" target="_blank">${url}</a>
          </div>
          <div class="history-item-container">
            <input type="color" class="history-color-input" value="${itemData.color}" title="Edit color">
            <input type="text" class="history-tag-input" value="${itemData.tag}" placeholder="Enter tag" title="Edit tag">
            <div class="history-actions">
              <button class="save-changes-button" title="Save changes for this URL">Save</button>
              <button class="delete-button" title="Delete this tag">X</button>
            </div>
            <span class="history-status"></span>
          </div>`;

        // Add event listeners for SAVE and DELETE buttons
        listItem
          .querySelector(".save-changes-button")
          .addEventListener("click", handleSaveChanges);
        listItem
          .querySelector(".delete-button")
          .addEventListener("click", handleDelete);

        // ----- START: REAL-TIME BORDER COLOR & MAIN TAB UPDATE -----
        const colorInputForThisItem = listItem.querySelector(
          ".history-color-input",
        );

        if (colorInputForThisItem) {
          colorInputForThisItem.addEventListener("input", (event) => {
            const newColor = event.target.value;
            const parentLi = event.target.closest("li.history-item");

            if (parentLi) {
              // 1. Update border color of the history item in Saved Links tab
              parentLi.style.borderLeftColor = newColor;

              // ----- START: Update Main Tab (if URLs match) -----
              const historyItemUrl = parentLi.getAttribute("data-url");
              const mainTabCurrentUrl = urlInput.value; // Get URL loaded in Main Tab

              // Check if the history item's URL is the same as the one loaded in the main tab
              if (
                historyItemUrl &&
                mainTabCurrentUrl &&
                historyItemUrl === mainTabCurrentUrl
              ) {
                // Update the Main Tab's color input
                colorInput.value = newColor;
                // Update the Main Tab's color value display span
                colorValueDisplay.textContent = newColor;
              }
              // ----- END: Update Main Tab (if URLs match) -----
            }
          });
        }
        // ----- END: REAL-TIME BORDER COLOR & MAIN TAB UPDATE -----

        historyList.appendChild(listItem);
      } else {
        console.warn(
          `Skipping item with unexpected data structure for URL: ${url}`,
          itemData,
        );
      }
    });
  });
}

// --- Function to Handle Inline Save Changes ---
function handleSaveChanges(event) {
  const button = event.target;
  const listItem = button.closest("li");
  const urlToSave = listItem.getAttribute("data-url");
  const colorField = listItem.querySelector(".history-color-input");
  const tagField = listItem.querySelector(".history-tag-input");
  const statusField = listItem.querySelector(".history-status");

  if (!urlToSave || !colorField || !tagField || !statusField) {
    console.error("Could not find necessary elements for saving.");
    return;
  }

  const newColor = colorField.value;
  const newTag = tagField.value.trim();

  if (!newTag) {
    statusField.textContent = "Tag required!";
    statusField.style.color = "red";
    setTimeout(() => {
      statusField.textContent = "";
    }, 2000);
    return;
  } // Disable button temporarily

  button.disabled = true;
  button.textContent = "...";
  statusField.textContent = ""; // Clear previous status // --- Get existing opacity to preserve it ---

  chrome.storage.sync.get(urlToSave, (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error fetching existing data:", chrome.runtime.lastError);
      statusField.textContent = "Error!";
      statusField.style.color = "red";
      button.disabled = false;
      button.textContent = "Save";
      return;
    }

    const existingData = result[urlToSave] || {}; // *** Preserve existing opacity or default to 100 if not found ***
    const existingOpacity = existingData.opacity || 100;

    const dataToSave = {
      [urlToSave]: {
        color: newColor,
        tag: newTag,
        opacity: existingOpacity, // *** Include preserved opacity ***
      },
    };

    chrome.storage.sync.set(dataToSave, () => {
      button.disabled = false; // Re-enable button
      button.textContent = "Save";

      if (chrome.runtime.lastError) {
        console.error("Error saving changes:", chrome.runtime.lastError);
        statusField.textContent = "Error!";
        statusField.style.color = "red";
      } else {
        statusField.textContent = "Saved!";
        statusField.style.color = "green";
      } // Clear status message after a delay
      setTimeout(() => {
        statusField.textContent = "";
      }, 2000);
    });
  });
}

// --- Function to Handle Deletion (Adapted for new structure) ---
function handleDelete(event) {
  const button = event.target;
  const listItem = button.closest("li");
  const urlToDelete = listItem.getAttribute("data-url");
  const statusField = listItem.querySelector(".history-status"); // Use row status

  if (!urlToDelete || !statusField) return; // Optional: Ask for confirmation // if (!confirm(`Are you sure you want to delete the tag for ${urlToDelete}?`)) { //     return; // } // Disable buttons temporarily

  button.disabled = true;
  button.textContent = "...";
  const saveBtn = listItem.querySelector(".save-changes-button");
  if (saveBtn) saveBtn.disabled = true;
  statusField.textContent = ""; // Clear previous status // Remove from storage

  chrome.storage.sync.remove(urlToDelete, () => {
    if (chrome.runtime.lastError) {
      console.error("Error deleting item:", chrome.runtime.lastError);
      statusField.textContent = "Error!"; // Show error in row status
      statusField.style.color = "red"; // Re-enable buttons if error
      button.disabled = false;
      button.textContent = "X";
      if (saveBtn) saveBtn.disabled = false;
    } else {
      listItem.remove(); // Check if history is now empty and show placeholder

      if (historyList.children.length === 0) {
        historyList.innerHTML =
          '<li class="no-history">No saved tags yet.</li>';
      } // Optionally show global status briefly
      statusDiv.textContent = "Item deleted.";
      statusDiv.style.color = "orange";
      setTimeout(() => {
        if (statusDiv.textContent === "Item deleted.")
          statusDiv.textContent = "";
      }, 2000);
    }
  });
}

// --- Get Current Tab URL & Pre-fill Form (Main Tab Logic) ---
function loadCurrentTabData() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    statusDiv.textContent = ""; // Clear main status on load
    if (tabs && tabs.length > 0) {
      const currentTab = tabs[0]; // Handle special URLs
      if (currentTab.url && currentTab.url.startsWith("http")) {
        const fullUrl = currentTab.url;
        const displayUrl =
          fullUrl.length > 45 // Adjusted length for main tab display
            ? fullUrl.substring(0, 45) + "..."
            : fullUrl;
        urlDisplay.textContent = displayUrl;
        urlDisplay.title = fullUrl;
        urlInput.value = fullUrl;
        saveButton.disabled = false; // Pre-fill form including opacity

        chrome.storage.sync.get([fullUrl], (result) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error fetching data for pre-fill:",
              chrome.runtime.lastError,
            ); // Set defaults even on error
            colorInput.value = "#ff0000";
            colorValueDisplay.textContent = "#ff0000";
            tagInput.value = "";
            opacityInput.value = 100; // Default opacity
            opacityValueDisplay.textContent = "100%";
            return;
          }
          const savedData = result[fullUrl];
          if (savedData) {
            colorInput.value = savedData.color || "#ff0000";
            tagInput.value = savedData.tag || ""; // *** Set opacity or default to 100 ***
            opacityInput.value = savedData.opacity || 100;
          } else {
            colorInput.value = "#ff0000";
            tagInput.value = "";
            opacityInput.value = 100; // Default opacity
          } // *** Update displays for both color and opacity ***
          colorValueDisplay.textContent = colorInput.value;
          opacityValueDisplay.textContent = `${opacityInput.value}%`;
        });
      } else {
        urlDisplay.textContent = "Cannot tag this type of URL.";
        urlInput.value = "";
        saveButton.disabled = true;
        colorInput.value = "#ff0000";
        tagInput.value = "";
        opacityInput.value = 100; // Default opacity // Update displays
        colorValueDisplay.textContent = colorInput.value;
        opacityValueDisplay.textContent = `${opacityInput.value}%`;
      }
    } else {
      urlDisplay.textContent = "Error getting tab info.";
      urlInput.value = "";
      saveButton.disabled = true;
      colorInput.value = "#ff0000";
      tagInput.value = "";
      opacityInput.value = 100; // Default opacity // Update displays
      colorValueDisplay.textContent = colorInput.value;
      opacityValueDisplay.textContent = `${opacityInput.value}%`;
    }
  });
}

// --- Save Button Event Listener (Main Tab) ---
saveButton.addEventListener("click", () => {
  const url = urlInput.value;
  const color = colorInput.value;
  const tag = tagInput.value.trim();
  const opacity = parseInt(opacityInput.value, 10); // *** Get opacity value ***

  // --- Input Validation ---
  if (!url) {
    statusDiv.textContent = "URL required!";
    statusDiv.style.color = "red";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000); // Clear status after delay
    return;
  }
  if (!tag) {
    statusDiv.textContent = "Tag required!";
    statusDiv.style.color = "red";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 2000); // Clear status after delay
    return;
  }

  // *** Include opacity in the data to save ***
  const dataToSave = { [url]: { color: color, tag: tag, opacity: opacity } };

  // Disable button during save operation
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  statusDiv.textContent = ""; // Clear previous status

  chrome.storage.sync.set(dataToSave, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving data:", chrome.runtime.lastError);
      statusDiv.textContent = "Error saving data!";
      statusDiv.style.color = "red";
      saveButton.disabled = false; // Re-enable button on error
      saveButton.textContent = "Save";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 3000); // Clear error status after longer delay
    } else {
      console.log("Data saved successfully for:", url, dataToSave[url]);
      statusDiv.textContent = "Saved! Reloading page..."; // Indicate reload is happening
      statusDiv.style.color = "green";

      // --- START: Reload Logic ---
      // Query for the active tab in the current window
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          const currentTabId = tabs[0].id;
          // IMPORTANT: Check if the tab's URL still matches the URL we just saved.
          // This prevents reloading the wrong tab if the user switched tabs
          // after opening the popup but before clicking save.
          if (tabs[0].url === url) {
            chrome.tabs.reload(currentTabId, { bypassCache: false }, () => {
              // bypassCache: false is default, can be true if needed
              if (chrome.runtime.lastError) {
                // Handle potential error during reload (e.g., tab closed)
                console.error(
                  `Error reloading tab ${currentTabId}:`,
                  chrome.runtime.lastError.message,
                );
                statusDiv.textContent = "Saved, but page reload failed.";
                statusDiv.style.color = "orange";
                // Re-enable button since reload failed but save was ok
                saveButton.disabled = false;
                saveButton.textContent = "Save";
                setTimeout(() => {
                  statusDiv.textContent = "";
                }, 3000);
              } else {
                console.log(`Tab ${currentTabId} reloaded successfully.`);
                // Reload was successful, close the popup
                window.close();
              }
            });
          } else {
            // URL mismatch - data saved, but don't reload this tab
            console.log(
              "Data saved, but active tab URL changed. Not reloading.",
            );
            statusDiv.textContent = "Saved! (Active tab changed)";
            statusDiv.style.color = "green";
            saveButton.disabled = false; // Re-enable button
            saveButton.textContent = "Save";
            // Don't close popup immediately so user sees the message
            setTimeout(() => {
              if (statusDiv.textContent === "Saved! (Active tab changed)")
                statusDiv.textContent = "";
              // Optionally close after delay: window.close();
            }, 2500);
          }
        } else {
          // Could not find active tab - unusual error
          console.error("Could not get active tab ID to reload.");
          statusDiv.textContent = "Saved, but couldn't trigger reload.";
          statusDiv.style.color = "orange";
          saveButton.disabled = false; // Re-enable button
          saveButton.textContent = "Save";
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 3000);
        }
      });
      // --- END: Reload Logic ---
    }
    // Note: The button re-enabling and status clearing are now handled
    // within the reload logic's callbacks or error paths.
  });
});

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
  // Ensure "Main" tab is active visually on load
  tabButtons.forEach((btn) => btn.classList.remove("active"));
  tabContents.forEach((content) => content.classList.remove("active"));
  document
    .querySelector('.tab-button[data-tab="main-tab"]')
    .classList.add("active");
  document.getElementById("main-tab").classList.add("active");

  // Load data for the main tab
  loadCurrentTabData();

  // Load history ONLY IF the saved tags tab is the active one initially
  // (or wait until tab is clicked - current behavior is fine)
  // if (document.getElementById('saved-tags-tab').classList.contains('active')) {
  //    displayHistory();
  // }
});
