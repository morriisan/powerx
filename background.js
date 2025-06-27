// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FETCH_PROFILE') {
        console.log(`[Background] Received request for user: ${request.username}`);
        
        // Fetch the profile page
        fetch(`https://x.com/${request.username}`)
            .then(response => {
                console.log(`[Background] Fetched profile for ${request.username}, status: ${response.status}`);
                return response.text();
            })
            .then(html => {
                // Create a temporary DOM parser
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Find the join date element
                const joinDateElement = doc.querySelector('span[data-testid="UserJoinDate"]');
                const joinDate = joinDateElement ? joinDateElement.textContent.replace('Joined ', '') : null;
                
                console.log(`[Background] Found join date for ${request.username}: ${joinDate || 'not found'}`);
                
                // Send the result back to content script
                sendResponse({ joinDate });
            })
            .catch(error => {
                console.error(`[Background] Error fetching profile for ${request.username}:`, error);
                sendResponse({ joinDate: null });
            });
            
        return true; // Keep the message channel open for async response
    }
}); 