'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { getBackendBaseUrl, extractGoogleDriveId } from '@/utils/videoHelpers';

interface SecurePlayerProps {
  lessonId: string;
  videoUrl?: string;
  userEmail?: string;
  authToken?: string;
  onTimeUpdate?: (currentSeconds: number) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export function SecureHLSVideoPlayer({
  lessonId,
  videoUrl,
  userEmail = 'Student',
  authToken,
  onTimeUpdate,
  videoRef
}: SecurePlayerProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeVideo = videoRef || localRef;
  const hlsInstanceRef = useRef<Hls | null>(null);
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    let isDisposed = false;
    let timer: NodeJS.Timeout | null = null;
    const backendBase = getBackendBaseUrl();

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    async function initSecureStream() {
      // 1. Fetch short-lived signed stream token
      let token = authToken || '';
      try {
        let res = await fetch(`/api/lessons/${lessonId}/stream-token`, {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!res.ok) {
          res = await fetch(`${backendBase}/api/lessons/${lessonId}/stream-token`, {
            method: 'POST',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
        }
        if (res.ok) {
          const d = await res.json();
          if (d.signed_token) token = d.signed_token;
        }
      } catch (err) {
        console.warn('[Secure Player] Token fetch notice, attempting direct fallback:', err);
      }

      if (isDisposed || !activeVideo.current) return;

      const tokenParam = token ? `?st=${encodeURIComponent(token)}` : '';
      const hlsUrl = `/api/lessons/${lessonId}/hls/master.m3u8${tokenParam}`;
      const directHlsUrl = `${backendBase}/api/lessons/${lessonId}/hls/master.m3u8${tokenParam}`;

      const fallbackToByteRange = () => {
        if (isDisposed || !activeVideo.current) return;
        const driveId = videoUrl ? extractGoogleDriveId(videoUrl) : '';
        if (driveId) {
          if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
            hlsInstanceRef.current = null;
          }
          activeVideo.current.src = `/api/stream/drive/${driveId}${tokenParam}`;
          activeVideo.current.load();
          activeVideo.current.play().catch(() => {});
          setPlaybackError(false);
          return;
        }
        setPlaybackError(true);
      };

      if (Hls.isSupported()) {
        let networkRetries = 0;
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingTimeOut: 30000,
          manifestLoadingMaxRetry: 3,
          fragLoadingTimeOut: 35000,
          xhrSetup: (xhr) => {
            try {
              xhr.setRequestHeader('X-Climbup-Player', 'amirshaikh320340');
              if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
            } catch (e) {
              console.warn('XHR header error:', e);
            }
          }
        });

        hlsInstanceRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(activeVideo.current);

        const watchdog = setTimeout(() => {
          if (isDisposed) return;
          const v = activeVideo.current;
          if (v && (v.paused || v.readyState < 2) && v.currentTime === 0) {
            fallbackToByteRange();
          }
        }, 18000);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          clearTimeout(watchdog);
          setPlaybackError(false);
          activeVideo.current?.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              networkRetries++;
              if (networkRetries <= 2) {
                hls.loadSource(directHlsUrl);
                hls.startLoad();
              } else {
                fallbackToByteRange();
              }
            } else {
              fallbackToByteRange();
            }
          }
        });
      } else if (activeVideo.current.canPlayType('application/vnd.apple.mpegurl')) {
        activeVideo.current.src = hlsUrl;
        activeVideo.current.load();
        activeVideo.current.onerror = () => fallbackToByteRange();
      } else {
        fallbackToByteRange();
      }

      // 2. Start Dynamic Forensic Canvas Watermark
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const draw = () => {
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = "500 12px 'Inter', sans-serif";
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 4;
          const text = `${userEmail} • ${new Date().toLocaleTimeString()}`;
          const x = 30 + Math.random() * Math.max(10, canvas.width - 240);
          const y = 30 + Math.random() * Math.max(10, canvas.height - 40);
          ctx.fillText(text, x, y);
        };
        draw();
        timer = setInterval(draw, 5000);
      }
    }

    initSecureStream();

    return () => {
      isDisposed = true;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      if (timer) clearInterval(timer);
    };
  }, [lessonId, videoUrl, userEmail, authToken]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      <video
        ref={activeVideo}
        playsInline
        controls
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        className="w-full h-full object-contain"
        onTimeUpdate={() => onTimeUpdate?.(activeVideo.current?.currentTime || 0)}
        onCanPlay={() => setPlaybackError(false)}
      />
      {/* Floating forensic anti-piracy canvas watermark */}
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
      {playbackError && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
          <p className="text-white text-sm font-semibold mb-3">Video playback temporarily unavailable.</p>
          <button
            onClick={() => {
              setPlaybackError(false);
              activeVideo.current?.load();
              activeVideo.current?.play().catch(() => {});
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-600/30"
          >
            Retry Playback
          </button>
        </div>
      )}
    </div>
  );
}
