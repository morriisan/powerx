(function() {
    console.log('🔧 Starting request interceptors...');
    
    // Store the original fetch and XHR
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;
    
    // Make sure we haven't already patched
    if (window.fetch.isPatchedByExtension) {
        console.log('⚠️ Already patched, skipping...');
        return;
    }

    // Helper function to store user data
    function storeUserData(userData) {
        try {
            const userId = userData.screen_name;
            if (!userId) return;

            // Get existing stored users or initialize empty object
            const storedUsers = JSON.parse(localStorage.getItem('twitter_user_dates') || '{}');
            
            // Add or update user data
            storedUsers[userId] = {
                created_at: userData.created_at,
                lastUpdated: new Date().toISOString()
            };

            // Store back to localStorage
            localStorage.setItem('twitter_user_dates', JSON.stringify(storedUsers));
        } catch (error) {
            console.error('🚨 Error storing user data:', error);
        }
    }

    // Helper function to get stored user data
    function getStoredUserData(username) {
        try {
            const storedUsers = JSON.parse(localStorage.getItem('twitter_user_dates') || '{}');
            return storedUsers[username];
        } catch (error) {
            console.error('🚨 Error reading stored user data:', error);
            return null;
        }
    }
    
    function addCreationDate(tweetId, userData) {
        // Store the user data first
        storeUserData(userData);

        // Find the tweet container
        const tweetContainer = document.querySelector(`article[data-testid="tweet"][tabindex="0"]`);
        if (!tweetContainer) return;

        // Find the time element (it's usually an <a> with a "time" element inside)
        const timeContainer = tweetContainer.querySelector('time').closest('a');
        if (!timeContainer) return;

        // Check if we already added the creation date
        if (timeContainer.querySelector('.user-created-at')) return;

        // Create and add the creation date element
        const createdAtSpan = document.createElement('span');
        createdAtSpan.className = 'user-created-at';
        createdAtSpan.style.marginLeft = '4px';
        createdAtSpan.style.color = 'rgb(83, 100, 113)';
        const year = new Date(userData.created_at).getFullYear();
        createdAtSpan.textContent = `· ${year}`;
        timeContainer.appendChild(createdAtSpan);

        // Mark this tweet as processed
        timeContainer.dataset.processedDate = 'true';
    }

    // Function to process a tweet using stored data
    function processStoredTweet(tweetElement) {
        try {
            // Check if we already processed this tweet
            const timeContainer = tweetElement.querySelector('time')?.closest('a');
            if (!timeContainer || timeContainer.dataset.processedDate === 'true') return;

            // Find username from the tweet
            const usernameElement = tweetElement.querySelector('div[data-testid="User-Name"] a[href*="/"]');
            if (!usernameElement) return;

            // Extract username from href
            const username = usernameElement.href.split('/').pop();
            if (!username) return;

            // Check if we have stored data for this user
            const storedData = getStoredUserData(username);
            if (storedData) {
                // Create and add the creation date element
                const createdAtSpan = document.createElement('span');
                createdAtSpan.className = 'user-created-at';
                createdAtSpan.style.marginLeft = '4px';
                createdAtSpan.style.color = 'rgb(83, 100, 113)';
                const year = new Date(storedData.created_at).getFullYear();
                createdAtSpan.textContent = `· ${year}`;
                timeContainer.appendChild(createdAtSpan);

                // Mark as processed
                timeContainer.dataset.processedDate = 'true';
            }
        } catch (error) {
            console.error('🚨 Error processing stored tweet:', error);
        }
    }

    // Function to process all visible tweets
    function processVisibleTweets() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        tweets.forEach(processStoredTweet);
    }

    // Set up mutation observer to watch for new tweets
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    // Check if the node itself is a tweet
                    if (node.matches('article[data-testid="tweet"]')) {
                        processStoredTweet(node);
                    }
                    // Check for tweets within the added node
                    const tweets = node.querySelectorAll('article[data-testid="tweet"]');
                    tweets.forEach(processStoredTweet);
                }
            });
        });
    });

    // Start observing the timeline
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Patch XHR
    function PatchedXHR() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        
        xhr.open = function(...args) {
            const [method, url] = args;
            
            this._url = url;
            return originalOpen.apply(this, args);
        };
        
        xhr.send = function(...args) {
            const originalOnLoad = xhr.onload;
            xhr.onload = function() {
                
                if (this._url && this._url.includes('graphql/Ri47TC1RogqkfaInTxucqA/HomeTimeline')) {
                    console.log('🎯 Intercepted HomeTimeline XHR request');
                    try {
                        const data = JSON.parse(this.responseText);
                        if (data.data?.home?.home_timeline_urt?.instructions) {
                            data.data.home.home_timeline_urt.instructions.forEach(instruction => {
                                if (instruction.entries) {
                                    instruction.entries.forEach(entry => {
                                        const userCore = entry.content?.itemContent?.tweet_results?.result?.core?.user_results?.result?.core;
                                        if (userCore) {
                                            const tweetId = entry.content?.itemContent?.tweet_results?.result?.rest_id;
                                            if (tweetId) {
                                                // Add a small delay to ensure the tweet is rendered
                                                setTimeout(() => addCreationDate(tweetId, userCore), 100);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    } catch (error) {
                        console.error('🚨 Error processing XHR response:', error);
                    }
                }
                if (originalOnLoad) originalOnLoad.apply(this, arguments);
            };
            return originalSend.apply(this, args);
        };
        
        return xhr;
    }
    
    // Replace fetch with our version
    window.fetch = async function(...args) {
        const [resource] = args;
        
        try {
            const response = await originalFetch.apply(this, args);
            
            if (resource && resource.toString().includes('graphql/Ri47TC1RogqkfaInTxucqA/HomeTimeline')) {
                console.log('🎯 Intercepted HomeTimeline Fetch request');
                try {
                    const clone = response.clone();
                    const data = await clone.json();
                    
                    if (data.data?.home?.home_timeline_urt?.instructions) {
                        data.data.home.home_timeline_urt.instructions.forEach(instruction => {
                            if (instruction.entries) {
                                instruction.entries.forEach(entry => {
                                    const userCore = entry.content?.itemContent?.tweet_results?.result?.core?.user_results?.result?.core;
                                    if (userCore) {
                                        const tweetId = entry.content?.itemContent?.tweet_results?.result?.rest_id;
                                        if (tweetId) {
                                            // Add a small delay to ensure the tweet is rendered
                                            setTimeout(() => addCreationDate(tweetId, userCore), 100);
                                        }
                                    }
                                });
                            }
                        });
                    }
                } catch (error) {
                    console.error('🚨 Error processing Fetch response:', error);
                }
            }
            
            return response;
        } catch (error) {
            console.error('🚨 Error in fetch:', error);
            throw error;
        }
    };
    
    // Replace XMLHttpRequest
    window.XMLHttpRequest = PatchedXHR;
    
    // Mark as patched
    window.fetch.isPatchedByExtension = true;
    console.log('✅ Request interceptors successfully patched!');

    // Add CSS to handle dark mode
    const style = document.createElement('style');
    style.textContent = `
        @media (prefers-color-scheme: dark) {
            .user-created-at {
                color: rgb(139, 152, 165) !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Process any tweets that are already on the page
    processVisibleTweets();

    // Log how many users we have stored
    try {
        const storedUsers = JSON.parse(localStorage.getItem('twitter_user_dates') || '{}');
        console.log(`📦 Loaded ${Object.keys(storedUsers).length} cached user dates`);
    } catch (error) {
        console.error('🚨 Error reading cached user dates:', error);
    }
})(); 