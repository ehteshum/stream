document.addEventListener('DOMContentLoaded', function() {
    const adminForm = document.getElementById('adminForm');
    const status = document.getElementById('status');
    const currentUrl = document.getElementById('currentUrl');
    const testStreamBtn = document.getElementById('testStream');
    const streamUrlInput = document.getElementById('streamUrl');

    // Display current stream URL
    currentUrl.textContent = CONFIG.streamUrl;

    // Pre-fill the stream URL input with current value
    streamUrlInput.value = CONFIG.streamUrl;

    adminForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        const streamUrl = streamUrlInput.value.trim();
        
        // Simple password check - you should change this password
        if (password === 'admin123') {
            try {
                // Validate URL format
                if (!streamUrl.toLowerCase().endsWith('.m3u8')) {
                    showStatus('Invalid stream URL format. Must be an M3U8 URL.', 'error');
                    return;
                }

                // Create the new config content
                const newConfig = `// Stream configuration
const CONFIG = {
    streamUrl: "${streamUrl}"  // Updated: ${new Date().toLocaleString()}
};`;

                // Use the Blob API to create a downloadable file
                const blob = new Blob([newConfig], { type: 'text/javascript' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'config.js';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showStatus('Stream URL updated! Download and replace config.js with the new file.', 'success');
                
                // Update the current URL display
                currentUrl.textContent = streamUrl;
                
                // Clear the password field
                document.getElementById('password').value = '';
            } catch (error) {
                console.error('Error updating config:', error);
                showStatus('Error updating configuration.', 'error');
            }
        } else {
            showStatus('Invalid password!', 'error');
        }
    });

    // Test stream functionality
    testStreamBtn.addEventListener('click', function() {
        const streamUrl = streamUrlInput.value.trim();
        
        if (!streamUrl) {
            showStatus('Please enter a stream URL to test.', 'error');
            return;
        }

        // Open the stream URL in a new tab
        window.open(streamUrl, '_blank');
    });

    function showStatus(message, type = 'success') {
        status.textContent = message;
        status.className = 'mt-4 text-center text-sm ' + 
            (type === 'error' ? 'text-red-400' : 'text-emerald-400');
    }
}); 