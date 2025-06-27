// Wait for the document to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectScript);
} else {
    injectScript();
}

function injectScript() {
    try {
        console.log('🔄 Injecting interceptor script...');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('interceptor.js');
        script.type = 'text/javascript';
        script.onload = () => console.log('✅ Interceptor script loaded!');
        script.onerror = (e) => console.error('❌ Error loading interceptor:', e);
        (document.head || document.documentElement).appendChild(script);
    } catch (error) {
        console.error('❌ Error injecting script:', error);
    }
}
