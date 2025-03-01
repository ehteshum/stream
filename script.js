const videoPlayer = document.getElementById('videoPlayer');
const loadingOverlay = document.querySelector('.loading-overlay');
const errorOverlay = document.querySelector('.error-overlay');
let hls = null;

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showError(show, message = 'Stream error occurred') {
    errorOverlay.style.display = show ? 'flex' : 'none';
    errorOverlay.querySelector('.error-message').textContent = message;
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

    if (Hls.isSupported()) {
        const hlsConfig = {
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 60,
            maxBufferLength: 30,
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 4,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 15000,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 1000,
            fragLoadingTimeOut: 15000,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 1000,
            startLevel: -1,
            testBandwidth: true,
            progressive: true
        };

        hls = new Hls(hlsConfig);

        hls.on(Hls.Events.ERROR, function(event, data) {
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

        hls.on(Hls.Events.MANIFEST_LOADING, () => {
            showLoading(true);
            showError(false);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            showLoading(false);
            playVideo();
        });

        try {
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                hls.loadSource(streamUrl);
            });
        } catch (error) {
            showError(true, 'Failed to initialize player. Please try again.');
        }
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', playVideo);
    } else {
        showError(true, 'Your browser does not support HLS playback.');
    }
}

function playVideo() {
    try {
        if (videoPlayer.paused) {
            videoPlayer.play().catch(() => {
                videoPlayer.muted = true;
                videoPlayer.play();
            });
        }
    } catch (error) {
        showError(true, 'Playback error occurred.');
    }
}

videoPlayer.addEventListener('error', () => {
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

videoPlayer.addEventListener('waiting', () => showLoading(true));
videoPlayer.addEventListener('canplay', () => showLoading(false));

document.addEventListener('DOMContentLoaded', loadStream);
