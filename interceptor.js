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
                                            console.log('📝 Found user data:', {
                                                screen_name: userCore.screen_name,
                                                name: userCore.name,
                                                created_at: userCore.created_at
                                            });
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
        console.log('👀 Fetch Request:', resource?.toString());
        
        try {
            const response = await originalFetch.apply(this, args);
            console.log('📨 Fetch Response for:', resource?.toString());
            
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
                                        console.log('📝 Found user data:', {
                                            screen_name: userCore.screen_name,
                                            name: userCore.name,
                                            created_at: userCore.created_at
                                        });
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
})(); 