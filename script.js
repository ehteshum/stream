const videoPlayer = document.getElementById('videoPlayer');
let hls = null;

function loadStream() {
    const streamUrl = CONFIG.streamUrl;
    if (!streamUrl) return;

    if (hls) {
        hls.destroy();
        hls = null;
    }

    // fixed android bhaiya
    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 0,
            maxBufferSize: 20 * 1000 * 1000, // 20MB
            maxBufferLength: 15,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 6,
            manifestLoadingRetryDelay: 500,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 6,
            levelLoadingRetryDelay: 500,
            fragLoadingTimeOut: 10000,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 500,
            startLevel: -1,
            abrEwmaFastLive: 1.5,
            abrEwmaSlowLive: 3,
            abrMaxWithRealBitrate: true,
            progressive: true,
            xhrSetup: function(xhr) {
                xhr.withCredentials = false;
            }
        });

        hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('Network error, trying to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('Media error, trying to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.log('Fatal error, trying to reload...');
                        initializePlayer();
                        break;
                }
            }
        });

        initializePlayer();
    } else {
        console.log('HLS not supported, falling back to native player');
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', playVideo);
    }
}

function initializePlayer() {
    try {
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MEDIA_ATTACHED, function() {
            console.log('Media attached');
            hls.loadSource(CONFIG.streamUrl);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                console.log('Manifest parsed');
                playVideo();
            });
        });
    } catch (error) {
        console.error('Error initializing player:', error);
        setTimeout(loadStream, 2000);
    }
}

function playVideo() {
    try {
        if (videoPlayer.paused) {
            const playPromise = videoPlayer.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Playback error:', error);
                    // for changing mute option ( doesnt work)
                    videoPlayer.muted = true;
                    return videoPlayer.play();
                });
            }
        }
    } catch (error) {
        console.error('Play error:', error);
    }
}

// if m3u8 error occurs
videoPlayer.addEventListener('error', (e) => {
    console.error('Video error:', e.target.error);
    setTimeout(loadStream, 2000);
});

// error stalled playback
videoPlayer.addEventListener('stalled', () => {
    console.log('Playback stalled, reloading...');
    setTimeout(loadStream, 2000);
});

// eror ended streams
videoPlayer.addEventListener('ended', () => {
    console.log('Stream ended, reloading...');
    loadStream();
});

// erorrvvisibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && videoPlayer.paused) {
        console.log('Page visible, resuming...');
        loadStream();
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', loadStream);
