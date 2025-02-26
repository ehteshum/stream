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
            backBufferLength: 90,
            manifestLoadingTimeOut: 30000,
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 30000,
            levelLoadingMaxRetry: 3,
            levelLoadingRetryDelay: 1000
        });

        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(streamUrl));
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
            setTimeout(loadStream, 2000);
    }
}

function playVideo() {
    const playPromise = videoPlayer.play();
    if (playPromise) {
        playPromise.catch(() => {
            videoPlayer.muted = true;
            videoPlayer.play();
        });
    }
}

videoPlayer.addEventListener('error', () => setTimeout(loadStream, 2000));
videoPlayer.addEventListener('stalled', () => setTimeout(loadStream, 2000));
document.addEventListener('DOMContentLoaded', loadStream);
document.addEventListener('visibilitychange', () => !document.hidden && loadStream());
