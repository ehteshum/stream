const videoPlayer = document.getElementById('videoPlayer');
const qualitySelector = document.getElementById('qualitySelector');
const streamStats = document.getElementById('streamStats');
const loadingOverlay = document.querySelector('.loading-overlay');
const errorOverlay = document.querySelector('.error-overlay');
let hls = null;
let statsInterval = null;

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showError(show, message = 'Stream error occurred') {
    errorOverlay.style.display = show ? 'flex' : 'none';
    errorOverlay.querySelector('.error-message').textContent = message;
}

function updateStreamStats() {
    if (!hls) return;
    
    const stats = hls.stats;
    const level = hls.currentLevel > -1 ? hls.levels[hls.currentLevel] : null;
    const quality = level ? `${level.height}p` : 'Auto';
    const bitrate = level ? `${Math.round(level.bitrate / 1000)} Kbps` : 'N/A';
    const buffer = Math.round(hls.media.buffered.length ? hls.media.buffered.end(0) - hls.media.currentTime : 0);
    
    streamStats.innerHTML = `
        Quality: ${quality}<br>
        Bitrate: ${bitrate}<br>
        Buffer: ${buffer}s<br>
        Dropped Frames: ${stats.droppedFrames}
    `;
}

function updateQualityLevels() {
    if (!hls || !hls.levels) return;
    
    // Clear existing options except Auto
    while (qualitySelector.options.length > 1) {
        qualitySelector.remove(1);
    }
    
    // Add available qualities
    hls.levels.forEach((level, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `${level.height}p (${Math.round(level.bitrate / 1000)} Kbps)`;
        qualitySelector.add(option);
    });
    
    // Set current quality
    qualitySelector.value = hls.currentLevel === -1 ? 'auto' : hls.currentLevel;
}

function loadStream() {
    const streamUrl = CONFIG.streamUrl;
    if (!streamUrl) return;

    showError(false);
    showLoading(true);

    if (hls) {
        hls.destroy();
        hls = null;
    }

    if (statsInterval) {
        clearInterval(statsInterval);
    }

    if (Hls.isSupported()) {
        const hlsConfig = {
            debug: false,
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
            progressive: true,
            xhrSetup: function(xhr, url) {
                xhr.withCredentials = false;
                
                if (!url.startsWith('http')) {
                    const baseUrl = CONFIG.streamUrl.substring(0, CONFIG.streamUrl.lastIndexOf('/') + 1);
                    url = baseUrl + url;
                    xhr.open('GET', url, true);
                }
            }
        };

        hls = new Hls(hlsConfig);

        // Error handling
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.group('HLS Error');
            console.log('Error Type:', data.type);
            console.log('Error Details:', data.details);
            console.log('Fatal:', data.fatal);
            console.groupEnd();
            
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        showError(true, 'Network error occurred. Retrying...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        showError(true, 'Media error occurred. Recovering...');
                        hls.recoverMediaError();
                        break;
                    default:
                        showError(true, 'Fatal error occurred. Please try again.');
                        break;
                }
            }
        });

        // Loading states
        hls.on(Hls.Events.MANIFEST_LOADING, () => {
            showLoading(true);
            showError(false);
        });

        hls.on(Hls.Events.MANIFEST_LOADED, () => {
            showLoading(true);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            showLoading(false);
            updateQualityLevels();
            
            // Start stats monitoring
            if (statsInterval) clearInterval(statsInterval);
            statsInterval = setInterval(updateStreamStats, 1000);
        });

        // Initialize player
        try {
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(streamUrl);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    playVideo();
                });
            });
        } catch (error) {
            console.error('Error during player initialization:', error);
            showError(true, 'Failed to initialize player. Please try again.');
        }
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari and iOS devices
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', playVideo);
    } else {
        showError(true, 'Your browser does not support HLS playback. Please try a different browser.');
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
                        videoPlayer.muted = true;
                        return videoPlayer.play();
                    }
                });
            }
        }
    } catch (error) {
        console.error('Play error:', error);
        showError(true, 'Playback error occurred. Please try again.');
    }
}

// Quality selection
qualitySelector.addEventListener('change', (e) => {
    if (!hls) return;
    
    const level = e.target.value === 'auto' ? -1 : parseInt(e.target.value);
    hls.currentLevel = level;
});

// Error handling
videoPlayer.addEventListener('error', (e) => {
    console.error('Video error:', e.target.error);
    showError(true, 'Video playback error. Retrying...');
    setTimeout(loadStream, 2000);
});

videoPlayer.addEventListener('stalled', () => {
    showLoading(true);
    setTimeout(() => {
        if (videoPlayer.readyState < 3) {
            loadStream();
        }
    }, 5000);
});

videoPlayer.addEventListener('playing', () => {
    showLoading(false);
    showError(false);
});

videoPlayer.addEventListener('waiting', () => {
    showLoading(true);
});

videoPlayer.addEventListener('canplay', () => {
    showLoading(false);
});

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && videoPlayer.paused) {
        loadStream();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', loadStream);
