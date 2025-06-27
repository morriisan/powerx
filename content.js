// Function to fetch account creation date
async function fetchAccountCreationDate(username) {
    try {
        // First, check if we already have the date in storage
        const result = await chrome.storage.local.get(username);
        if (result[username]) {
            return result[username];
        }

        // If not in storage, fetch it from the API
        // Note: Replace this URL with the actual API endpoint for your platform
        const response = await fetch(`https://api.platform.com/users/${username}`);
        const data = await response.json();
        
        // Store the creation date in Chrome storage
        const creationDate = new Date(data.created_at).toLocaleDateString();
        await chrome.storage.local.set({ [username]: creationDate });
        
        return creationDate;
    } catch (error) {
        console.error('Error fetching account creation date:', error);
        return null;
    }
}

// Function to add creation date to timestamp
async function addCreationDate(postElement) {
    const timestampElement = postElement.querySelector('.timestamp');
    const usernameElement = postElement.querySelector('.username');
    
    if (!timestampElement || !usernameElement) return;
    
    const username = usernameElement.textContent.trim();
    
    // Check if we already added the creation date
    if (timestampElement.dataset.creationDateAdded) return;
    
    const creationDate = await fetchAccountCreationDate(username);
    if (creationDate) {
        timestampElement.textContent += ` · Account created: ${creationDate}`;
        timestampElement.dataset.creationDateAdded = 'true';
    }
}

// Function to observe DOM changes for new posts
function observeNewPosts() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Adjust these selectors based on the actual structure of the posts
                    const posts = node.querySelectorAll('.post');
                    posts.forEach(addCreationDate);
                }
            });
        });
    });

    // Start observing the main content area
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
    }
}

// Initial processing of existing posts
function processExistingPosts() {
    // Adjust this selector based on the actual structure of the posts
    const posts = document.querySelectorAll('.post');
    posts.forEach(addCreationDate);
}

// Initialize the extension
function init() {
    processExistingPosts();
    observeNewPosts();
}

// Run initialization when the page is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 