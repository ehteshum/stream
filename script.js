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
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 4,
            manifestLoadingRetryDelay: 500,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 4,
            levelLoadingRetryDelay: 500,
            fragLoadingTimeOut: 10000,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 500,
            startLevel: -1,
            abrEwmaFastLive: 3,
            abrEwmaSlowLive: 9,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            testBandwidth: true
        });

        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(streamUrl);
            hls.startLoad();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
        hls.on(Hls.Events.ERROR, handleHlsError);
    } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        videoPlayer.src = streamUrl;
        videoPlayer.addEventListener('loadedmetadata', playVideo);
    }
}

function handleHlsError(_, data) {
    if (!data.fatal) return;

    switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
        case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
        default:
            setTimeout(loadStream, 1000);
    }
}

function playVideo() {
    if (videoPlayer.paused) {
        const playPromise = videoPlayer.play();
        if (playPromise) {
            playPromise.catch(() => {
                videoPlayer.muted = true;
                videoPlayer.play();
            });
        }
    }
}

videoPlayer.addEventListener('error', () => setTimeout(loadStream, 1000));
videoPlayer.addEventListener('stalled', () => setTimeout(loadStream, 1000));
document.addEventListener('DOMContentLoaded', loadStream);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && videoPlayer.paused) {
        loadStream();
    }
});
