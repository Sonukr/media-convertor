import React, { forwardRef, useEffect, useRef, useState } from "react";
import { BigPlayButton, Player, ControlBar, PlayToggle, CurrentTimeDisplay, TimeDivider, DurationDisplay, ProgressControl, VolumeMenuButton, FullscreenToggle, PlaybackRateMenuButton, ForwardControl, ReplayControl } from "video-react";
import "video-react/dist/video-react.css";
import "./MediaPlayer.css";
import { initializeHls } from "./helper";

interface MediaPlayerProps {
    source: string;
    poster: string;
    startTime: number;
    preload?: "auto" | "metadata" | "none";
}

const MediaPlayer = forwardRef<HTMLMediaElement, MediaPlayerProps>(
    ({ source, poster, startTime = 0, preload = "metadata" }) => {
        const playerRef = useRef<Player>(null);
        useEffect(() => {
            const mediaElement = playerRef.current?.video.video;
            if (!mediaElement || !source) return;

            const cleanup = initializeHls(mediaElement, source, (type) => {
                console.log(type);
            });

            return () => {
                cleanup?.();
            };
        }, [source]);

        useEffect(() => {
            const mediaElement = playerRef.current?.video.video;
            if (mediaElement) {
                mediaElement.currentTime = startTime;
            }
        }, [startTime]);

        return (
            <div>
                <Player 
                    ref={playerRef}
                    preload={preload}
                    playsInline
                    aspectRatio="16:9"
                    src={source}
                    poster={poster}
                    startTime={startTime}
                >
                    <BigPlayButton position="center" />
                    <ControlBar>
                        <ReplayControl seconds={10} order={1.1} />
                        <ForwardControl seconds={10} order={1.2} />
                        <CurrentTimeDisplay order={4.1} />
                        <TimeDivider order={4.2} />
                        <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.1]} order={7.1} />
                        <VolumeMenuButton order={1.3}/>
                        
                    </ControlBar>
                </Player>
            </div>
        );
    }
);

export default MediaPlayer;