const videoPlayer = document.getElementById('videoPlayer');
const status = document.getElementById('status');
let hls = null;

function loadStream() {
    const streamUrl = CONFIG.streamUrl;
    
    if (!streamUrl || streamUrl === "YOUR_DEFAULT_STREAM_URL_HERE") {
        updateStatus('Stream not configured. Please contact administrator.');
        return;
    }

    if (hls) {
        hls.destroy();
    }

    updateStatus('Loading stream...');

    if (Hls.isSupported()) {
        hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            manifestLoadingTimeOut: 60000,
            manifestLoadingMaxRetry: 5,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 60000,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 1000
        });

        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            hls.loadSource(streamUrl);
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        updateStatus('Network error, trying to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        updateStatus('Media error, trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        updateStatus('An error occurred, restarting stream...');
                        setTimeout(() => loadStream(), 2000); // Restart after 2 seconds
                        break;
                }
            }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            updateStatus('Stream loaded successfully');
            playVideo();
        });
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari and iOS devices
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', function() {
            updateStatus('Stream loaded successfully');
            playVideo();
        });
    } else {
        updateStatus('HLS is not supported in your browser');
    }
}

function playVideo() {
    // Try to play with sound first
    let playPromise = videoPlayer.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Unmuted playback failed:", error);
            // If unmuted playback fails, try muted as fallback
            videoPlayer.muted = true;
            videoPlayer.play().catch(error => {
                console.log("Muted playback failed:", error);
                updateStatus('Click play to start streaming');
            }).then(() => {
                // Show a message to unmute if we had to start muted
                updateStatus('Click unmute for sound');
            });
        });
    }
}

// Handle video errors and automatic replay
videoPlayer.addEventListener('error', function() {
    console.log("Video error, attempting to restart...");
    setTimeout(() => loadStream(), 2000); // Restart after 2 seconds
});

// Handle end of stream by restarting
videoPlayer.addEventListener('ended', function() {
    console.log("Stream ended, restarting...");
    loadStream();
});

// Handle stalled playback
videoPlayer.addEventListener('stalled', function() {
    console.log("Playback stalled, attempting to restart...");
    setTimeout(() => loadStream(), 2000);
});

function updateStatus(message) {
    status.textContent = message;
}

// Load the stream automatically when the page loads
document.addEventListener('DOMContentLoaded', loadStream);

// Attempt to restart stream if focus is regained
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        loadStream();
    }
}); 