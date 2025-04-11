console.log("URL Color Tagger: Content script loaded.");

// Function to add the frame and tag to the page
function addFrameAndTag(color, tag) {
    // --- Create Frame ---
    const frameId = 'url-color-tagger-frame';
    // Remove existing frame if it's already there (e.g., on SPA navigation)
    const existingFrame = document.getElementById(frameId);
    if (existingFrame) {
        existingFrame.remove();
    }

    const frame = document.createElement('div');
    frame.id = frameId;
    // Style the frame
    frame.style.position = 'fixed';
    frame.style.top = '0';
    frame.style.left = '0';
    frame.style.width = '100vw'; // Full viewport width
    frame.style.height = '100vh'; // Full viewport height
    frame.style.border = `5px solid ${color}`; // Use the saved color
    frame.style.boxSizing = 'border-box'; // Include border in size calculations
    frame.style.zIndex = '2147483646'; // Very high z-index, but below the tag
    frame.style.pointerEvents = 'none'; // Allow clicks to pass through

    // --- Create Tag ---
    const tagId = 'url-color-tagger-tag';
    // Remove existing tag if it's already there
    const existingTag = document.getElementById(tagId);
    if (existingTag) {
        existingTag.remove();
    }

    const tagElement = document.createElement('div');
    tagElement.id = tagId;
    tagElement.textContent = tag; // Set the tag text
    // Style the tag element (top-left corner as per sketch)
    tagElement.style.position = 'fixed';
    tagElement.style.top = '5px'; // Position slightly inside the frame
    tagElement.style.left = '5px';
    tagElement.style.backgroundColor = color; // Background matches frame color
    tagElement.style.color = 'white'; // White text is usually readable
    tagElement.style.padding = '4px 8px';
    tagElement.style.fontSize = '12px';
    tagElement.style.fontWeight = 'bold';
    tagElement.style.borderRadius = '3px';
    tagElement.style.zIndex = '2147483647'; // Highest z-index
    tagElement.style.pointerEvents = 'none'; // Allow clicks to pass through
    tagElement.style.fontFamily = 'sans-serif';
    // Add a subtle shadow for better visibility
    tagElement.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';


    // --- Append to Body ---
    // Ensure body exists before appending
    if (document.body) {
        document.body.appendChild(frame);
        document.body.appendChild(tagElement);
        console.log(`URL Color Tagger: Added frame (${color}) and tag (${tag}) for ${window.location.href}`);
    } else {
        // If body isn't ready yet, wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(frame);
            document.body.appendChild(tagElement);
             console.log(`URL Color Tagger: Added frame (${color}) and tag (${tag}) for ${window.location.href} after DOMContentLoaded`);
        });
    }
}

// --- Check Storage on Page Load ---
const currentUrl = window.location.href;

// Retrieve data for the current URL from storage
chrome.storage.sync.get([currentUrl], (result) => {
    if (chrome.runtime.lastError) {
        console.error("URL Color Tagger: Error retrieving data:", chrome.runtime.lastError);
        return;
    }

    const savedData = result[currentUrl];

    if (savedData && savedData.color && savedData.tag) {
        // If data exists for this URL, add the frame and tag
        addFrameAndTag(savedData.color, savedData.tag);
    } else {
        console.log(`URL Color Tagger: No data found for ${currentUrl}`);
        // Optional: Clean up any old frame/tag if the URL was removed from storage
        const existingFrame = document.getElementById('url-color-tagger-frame');
        if (existingFrame) existingFrame.remove();
        const existingTag = document.getElementById('url-color-tagger-tag');
        if (existingTag) existingTag.remove();
    }
});

// --- Optional: Listen for storage changes ---
// This handles cases where the tag is updated in the popup while the page is open.
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes[currentUrl]) {
        const newData = changes[currentUrl].newValue;
        const oldData = changes[currentUrl].oldValue; // Use if needed

        // Remove existing elements first
        const existingFrame = document.getElementById('url-color-tagger-frame');
        if (existingFrame) existingFrame.remove();
        const existingTag = document.getElementById('url-color-tagger-tag');
        if (existingTag) existingTag.remove();

        if (newData && newData.color && newData.tag) {
            // If new data exists (tag was added or updated), add the frame/tag
            console.log("URL Color Tagger: Storage changed, updating frame/tag.");
            addFrameAndTag(newData.color, newData.tag);
        } else {
            // If newData is null/undefined (tag was removed), elements are already removed.
             console.log("URL Color Tagger: Storage changed, tag removed.");
        }
    }
});
