import Hls from "hls.js";

const hlsConfig = {
    debug: true,
    maxBufferLength: 10,
    maxBufferSize: 5 * 1024,
};

/**
 * Initializes and attaches HLS to a given media element.
 *
 * @param mediaElement - The media element (audio/video) to attach HLS to.
 * @param source - The HLS source URL (ends with .m3u8).
 * @param onMediaTypeDetected - Callback to notify whether the stream is audio or video.
 * @returns A cleanup function to destroy the HLS instance and remove event listeners.
 */
export const initializeHls = (
    mediaElement: HTMLMediaElement,
    source: string,
    onMediaTypeDetected?: (mediaType: "audio" | "video") => void
): (() => void) | null => {
    if (Hls.isSupported() && source.endsWith(".m3u8")) {
        const hls = new Hls(hlsConfig);
        hls.loadSource(source);
        hls.attachMedia(mediaElement);

        hls.on(Hls.Events.FRAG_PARSED, (event, data) => {
            let isVideo = false;
            if (data.frag.elementaryStreams.audio && data.frag.elementaryStreams.video) {
                isVideo = true;
            } else {
                isVideo = false;
            }
            const mediaType = isVideo ? "video" : "audio";
            // console.log(`HLS Manifest loaded. Detected media type: ${mediaType}`);
            onMediaTypeDetected?.(mediaType);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
            // console.log(`HLS Manifest parsed`);
            mediaElement.pause();
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            // console.error("HLS error:", data);
        });

        // Return a cleanup function
        return () => {
            hls.destroy();
        };
    } else {
        mediaElement.src = source;
        mediaElement.load();
        mediaElement.onloadedmetadata = () => {
            const mediaType = (mediaElement as HTMLVideoElement).videoWidth > 0 ? "video" : "audio";
            onMediaTypeDetected?.(mediaType);
        };
        return () => {
            mediaElement.src = "";
        };
    }
};


export const canPlayUrl = async (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const mediaElement = document.createElement('video');

        if (Hls.isSupported() && src.endsWith(".m3u8")) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(mediaElement);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log(`The HLS URL ${src} can be played.`);
                resolve(true);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.log(`The HLS URL ${src} cannot be played. Error: ${data.type}`);
                resolve(false);
            });
        } else {
            const mediaTypes = [
                'audio/mp4',
                'audio/mpeg',
                'audio/ogg',
                'audio/wav',
                'audio/webm',
                'audio/aac',
                'audio/x-wav',
                'video/mp4',
                'video/webm',
                'video/ogg',
                'video/quicktime',
                'video/x-ms-wmv',
                'video/x-flv',
                'video/avi',
                'video/mpeg'
            ];

            const canPlay = mediaTypes.some(type => mediaElement.canPlayType(type) !== '');

            if (!canPlay) {
                console.log(`The URL ${src} cannot be played.`);
                resolve(false);
                return;
            }

            mediaElement.src = src;
            mediaElement.oncanplay = () => {
                console.log(`The URL ${src} can be played.`);
                resolve(true);
            };
            mediaElement.onerror = () => {
                console.log(`The URL ${src} cannot be played.`);
                resolve(false);
            };

            mediaElement.load();
        }
    });
};