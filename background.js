// Queue system for processing usernames
let isProcessing = false;
const queue = [];

// Helper function to wait for specified milliseconds
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Process the next username in the queue
async function processNextInQueue() {
    if (isProcessing || queue.length === 0) return;
    
    isProcessing = true;
    const { username, sendResponse } = queue.shift();
    console.log(`[Background] Processing next in queue: ${username}. Remaining in queue: ${queue.length}`);

    try {
        // Create a hidden tab to fetch the profile
        const tab = await new Promise((resolve) => {
            chrome.tabs.create({
                url: `https://twitter.com/${username}`,
                active: false,
                selected: false
            }, resolve);
        });

        console.log(`[Background] Created hidden tab with id: ${tab.id}`);

        // Wait for the tab to load and get the join date
        await new Promise((resolve) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    // Add a 3-second delay before checking for the join date
                    console.log(`[Background] Page loaded, waiting 3 seconds for content to render...`);
                    delay(3000).then(() => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                                const joinDateElement = document.querySelector('span[data-testid="UserJoinDate"]');
                                return joinDateElement ? joinDateElement.textContent.replace('Joined ', '') : null;
                            }
                        }, (results) => {
                            const joinDate = results?.[0]?.result || null;
                            console.log(`[Background] Found join date for ${username}: ${joinDate}`);
                            
                            // Close the tab
                            chrome.tabs.remove(tab.id);
                            
                            // Send the result back
                            sendResponse({ joinDate });
                            resolve();
                        });
                    });
                }
            });
        });
    } catch (error) {
        console.error(`[Background] Error processing ${username}:`, error);
        sendResponse({ joinDate: null });
    }

    isProcessing = false;
    console.log(`[Background] Finished processing ${username}`);
    
    // Process next item in queue
    processNextInQueue();
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FETCH_PROFILE') {
        console.log(`[Background] Received request for user: ${request.username}`);
        
        // Add to queue
        queue.push({
            username: request.username,
            sendResponse: sendResponse
        });
        
        console.log(`[Background] Added ${request.username} to queue. Queue length: ${queue.length}`);
        
        // Start processing if not already processing
        processNextInQueue();
        
        return true; // Keep the message channel open for async response
    }
}); 