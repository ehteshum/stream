const videoPlayer = document.getElementById('videoPlayer');
let hls = null;

function loadStream() {
    const streamUrl = CONFIG.streamUrl;
    if (!streamUrl) return;

    if (hls) {
        hls.destroy();
        hls = null;
    }

    if (Hls.isSupported()) {
        const hlsConfig = {
            debug: true,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferSize: 0,
            maxBufferLength: 30,
            manifestLoadingTimeOut: 20000,
            manifestLoadingMaxRetry: 10,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 20000,
            levelLoadingMaxRetry: 10,
            levelLoadingRetryDelay: 1000,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 10,
            fragLoadingRetryDelay: 1000,
            startLevel: -1,
            defaultAudioCodec: 'mp4a.40.2',
            xhrSetup: function(xhr, url) {
                xhr.withCredentials = false;
                
                // Handle relative URLs for segments
                if (!url.startsWith('http')) {
                    const baseUrl = CONFIG.streamUrl.substring(0, CONFIG.streamUrl.lastIndexOf('/') + 1);
                    url = baseUrl + url;
                    xhr.open('GET', url, true);
                }

                // Log request details for debugging
                console.log('HLS Request URL:', url);
            }
        };

        hls = new Hls(hlsConfig);

        // Enhanced error handling
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.group('HLS Error');
            console.log('Event:', event);
            console.log('Error Type:', data.type);
            console.log('Error Details:', data.details);
            console.log('Fatal:', data.fatal);
            console.log('Full Error Data:', data);
            console.groupEnd();
            
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('Network error, attempting recovery...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('Media error, attempting recovery...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.log('Fatal error, reloading player...');
                        loadStream();
                        break;
                }
            }
        });

        // Detailed event logging
        hls.on(Hls.Events.MANIFEST_LOADING, () => {
            console.log('Manifest loading...');
            videoPlayer.style.opacity = '0.5'; // Visual feedback
        });

        hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
            console.log('Manifest loaded successfully:', data);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('Manifest parsed, found quality levels:', data.levels);
            videoPlayer.style.opacity = '1'; // Restore visibility
        });

        hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
            console.log('Stream level loaded:', data);
        });

        // Initialize the player
        try {
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                console.log('Media attached, loading source...');
                hls.loadSource(streamUrl);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('Starting playback...');
                    playVideo();
                });
            });
        } catch (error) {
            console.error('Error during player initialization:', error);
            setTimeout(loadStream, 2000);
        }
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari and iOS devices
        console.log('Using native HLS support');
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', playVideo);
    } else {
        console.error('HLS not supported in this browser!');
        alert('Your browser does not support HLS playback. Please try a different browser.');
    }
}

function playVideo() {
    try {
        if (videoPlayer.paused) {
            const playPromise = videoPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Playback error:', error);
                    if (error.name === 'NotAllowedError') {
                        console.log('Autoplay blocked, trying muted playback...');
                        videoPlayer.muted = true;
                        return videoPlayer.play();
                    }
                });
            }
        }
    } catch (error) {
        console.error('Play error:', error);
    }
}

// Enhanced error handling for video element
videoPlayer.addEventListener('error', (e) => {
    console.group('Video Error');
    console.error('Video error code:', videoPlayer.error.code);
    console.error('Video error message:', videoPlayer.error.message);
    console.error('Video error:', e.target.error);
    console.groupEnd();
    setTimeout(loadStream, 2000);
});

videoPlayer.addEventListener('stalled', () => {
    console.log('Playback stalled, attempting reload...');
    setTimeout(loadStream, 2000);
});

videoPlayer.addEventListener('ended', () => {
    console.log('Stream ended, reloading...');
    loadStream();
});

// Handle page visibility
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && videoPlayer.paused) {
        console.log('Page visible, resuming playback...');
        loadStream();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', loadStream);
