"use client";

import React, { useRef } from "react";

export default function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  onEnded,
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative aspect-video w-full min-w-0 max-w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        autoPlay={autoPlay}
        playsInline
        controls
        onEnded={() => {
          if (onEnded) onEnded();
        }}
        className="w-full h-full object-contain block max-w-full"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
