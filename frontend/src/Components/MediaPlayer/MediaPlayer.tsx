import React, { forwardRef, useEffect, useRef, useState } from "react";
import { BigPlayButton, Player, ControlBar, PlayToggle, CurrentTimeDisplay, TimeDivider, DurationDisplay, ProgressControl, VolumeMenuButton, FullscreenToggle } from "video-react";
import "video-react/dist/video-react.css";
import "./MediaPlayer.css";
import { initializeHls } from "./helper";

interface MediaPlayerProps {
    source: string;
    poster: string;
    preload?: "auto" | "metadata" | "none";
}

const MediaPlayer = forwardRef<HTMLMediaElement, MediaPlayerProps>(
    ({ source, poster, preload = "metadata" }) => {
        const playerRef = useRef<Player>(null);
        const [mediaType, setMediaType] = useState<"audio" | "video">("video");

               useEffect(() => {
            const mediaElement = playerRef.current?.video.video;
            if (!mediaElement || !source) return;

            const cleanup = initializeHls(mediaElement, source, (type) => {
                setMediaType(type);
            });

            return () => {
                cleanup?.();
            };
        }, [source]);

        return (
            <div>
                <Player 
                    ref={playerRef}
                    // playsInline
                    // poster={mediaType === "video" ? "/assets/poster.png" : undefined}
                    preload={preload}
                    aspectRatio="16:9"
                    src={source}
                    poster={poster}
                >
                    <BigPlayButton position="center" />
                    <ControlBar autoHide={true}>
                        <PlayToggle />
                        <CurrentTimeDisplay />
                        <TimeDivider />
                        <DurationDisplay />
                        <ProgressControl />
                        <VolumeMenuButton /> 

                    </ControlBar>
                </Player>
            </div>
        );
    }
);

export default MediaPlayer;