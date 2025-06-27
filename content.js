// Function to fetch account creation date
async function fetchAccountCreationDate(username) {
    try {
        console.log(`[Content] Fetching data for user: ${username}`);
        
        // First, check if we already have the date in storage
        const result = await chrome.storage.local.get(username);
        if (result[username]) {
            console.log(`[Content] Found cached date for ${username}: ${result[username]}`);
            return result[username];
        }

        console.log(`[Content] No cache found for ${username}, requesting from background`);
        // If not in storage, fetch it using the background script
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'FETCH_PROFILE',
                username: username
            }, (response) => {
                resolve(response);
            });
        });

        if (response && response.joinDate) {
            console.log(`[Content] Received join date for ${username}: ${response.joinDate}`);
            // Store the creation date in Chrome storage
            await chrome.storage.local.set({ [username]: response.joinDate });
            return response.joinDate;
        }
        
        console.log(`[Content] No join date found for ${username}`);
        return null;
    } catch (error) {
        console.error(`[Content] Error fetching data for ${username}:`, error);
        return null;
    }
}

// Function to extract join date from profile page
function extractJoinDate() {
    const joinDateElement = document.querySelector('span[data-testid="UserJoinDate"]');
    if (joinDateElement) {
        return joinDateElement.textContent.replace('Joined ', '');
    }
    return null;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EXTRACT_JOIN_DATE') {
        const joinDate = extractJoinDate();
        sendResponse({ joinDate });
    }
    return true;
});

// Function to add creation date to timestamp
async function addCreationDate(postElement) {
    // Find the username element
    const usernameElement = postElement.querySelector('div[data-testid="User-Name"] a');
    if (!usernameElement) return;
    
    // Extract username from the href
    const href = usernameElement.getAttribute('href');
    if (!href) return;
    const username = href.split('/')[1];
    console.log(username, "username");
    // Find the timestamp element
    const timestampElement = postElement.querySelector('time');
    if (!timestampElement || timestampElement.dataset.creationDateAdded) return;
    
    const creationDate = await fetchAccountCreationDate(username);
    if (creationDate) {
        console.log(`[Content] Adding join date to tweet for ${username}`);
        // Create a new span for the creation date
        const creationSpan = document.createElement('span');
        creationSpan.textContent = ` · Joined ${creationDate}`;
        creationSpan.style.color = 'rgb(83, 100, 113)'; // Twitter's gray color
        
        // Insert after the timestamp
        timestampElement.parentNode.insertBefore(creationSpan, timestampElement.nextSibling);
        timestampElement.dataset.creationDateAdded = 'true';
    }
}

// Function to observe DOM changes for new posts
function observeNewPosts() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Look for tweet articles
                    const posts = node.querySelectorAll('article[data-testid="tweet"]');
                    posts.forEach(addCreationDate);
                }
            });
        });
    });

    // Start observing the main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
        observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
    }
}

// Initial processing of existing posts
function processExistingPosts() {
    const posts = document.querySelectorAll('article[data-testid="tweet"]');
    posts.forEach(addCreationDate);
}

// Initialize the extension
function init() {
    console.log('[Content] Extension initialized, looking for test username only');
    processExistingPosts();
    observeNewPosts();
}

// Run initialization when the page is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
} 