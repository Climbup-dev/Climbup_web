'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

// Module-level token cache across client navigations: lessonId -> { token, expiresAt }
const STREAM_TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

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
  const mediaRecoveryCountRef = useRef<number>(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Playback retry handler
  const retryPlayback = useCallback(() => {
    setPlaybackError(false);
    setIsLoading(true);
    const v = activeVideo.current;
    if (v) {
      v.load();
      v.play().catch(() => {});
    }
  }, [activeVideo]);

  useEffect(() => {
    setIsLoading(true);
    let isDisposed = false;
    let timer: NodeJS.Timeout | null = null;
    mediaRecoveryCountRef.current = 0;
    const backendBase = getBackendBaseUrl();

    // 1. Cleanly tear down existing HLS session to eliminate memory leaks
    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.stopLoad();
        hlsInstanceRef.current.detachMedia();
        hlsInstanceRef.current.destroy();
      } catch {}
      hlsInstanceRef.current = null;
    }

    async function initSecureStream() {
      // 2. Fetch or reuse cached short-lived signed stream token
      let token = authToken || '';
      const now = Date.now();
      const cached = STREAM_TOKEN_CACHE.get(lessonId);

      if (cached && cached.expiresAt > now) {
        token = cached.token;
      } else {
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
            if (d.signed_token) {
              token = d.signed_token;
              // Cache for 50 minutes (server TTL 60m)
              STREAM_TOKEN_CACHE.set(lessonId, { token, expiresAt: now + 50 * 60 * 1000 });
            }
          }
        } catch (err) {
          console.warn('[Secure Player] Token fetch notice, attempting direct fallback:', err);
        }
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
            try {
              hlsInstanceRef.current.stopLoad();
              hlsInstanceRef.current.detachMedia();
              hlsInstanceRef.current.destroy();
            } catch {}
            hlsInstanceRef.current = null;
          }
          activeVideo.current.src = `/api/stream/drive/${driveId}${tokenParam}`;
          activeVideo.current.load();
          activeVideo.current.play().catch(() => {
            setIsLoading(false);
          });
          setPlaybackError(false);
          return;
        }
        setIsLoading(false);
        setPlaybackError(true);
      };

      if (Hls.isSupported()) {
        let networkRetries = 0;
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startFragPrefetch: true,               // Prefetch next chunk in background for gapless continuous streaming
          backBufferLength: 45,                  // Evict past chunks older than 45s to prevent browser RAM bloating
          maxBufferLength: 30,                   // 30s forward buffer for rapid startup
          maxMaxBufferLength: 60,                // 60s max buffer cap
          maxBufferSize: 40 * 1024 * 1024,       // 40MB max buffer allocation in browser memory
          capLevelToPlayerSize: true,            // Auto-limit quality to player size (saves bandwidth & decoding CPU)
          progressive: true,                     // Fast chunk demuxing
          highBufferWatchdogPeriod: 2,           // Buffer health watchdog
          manifestLoadingTimeOut: 15000,
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 800,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 4,
          fragLoadingTimeOut: 20000,
          fragLoadingRetryDelay: 800,
          xhrSetup: (xhr: XMLHttpRequest) => {
            const injectHeaders = () => {
              try {
                if (xhr.readyState === 1) {
                  xhr.setRequestHeader('X-Climbup-Player', 'amirshaikh320340');
                  if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  }
                }
              } catch (e) {
                // Header state guarded
              }
            };
            if (xhr.readyState === 1) {
              injectHeaders();
            } else {
              const origOpen = xhr.open;
              xhr.open = function (...args: any[]) {
                const res = origOpen.apply(this, args as any);
                injectHeaders();
                return res;
              };
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
        }, 15000);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          clearTimeout(watchdog);
          setPlaybackError(false);
          activeVideo.current?.play().catch(() => {
            setIsLoading(false);
          });
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            clearTimeout(watchdog);
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              if (mediaRecoveryCountRef.current === 0) {
                mediaRecoveryCountRef.current++;
                console.info('[Secure Player] Recovering from media error...');
                hls.recoverMediaError();
              } else if (mediaRecoveryCountRef.current === 1) {
                mediaRecoveryCountRef.current++;
                console.info('[Secure Player] Swapping audio codec to recover...');
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } else {
                fallbackToByteRange();
              }
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
          } else if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
            // Non-fatal micro-stall: gently nudge playback if video is stuck
            const v = activeVideo.current;
            if (v && !v.paused && v.readyState >= 2) {
              v.currentTime = Math.min(v.duration || 0, v.currentTime + 0.1);
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

      // 3. Dynamic Forensic Canvas Watermark (Crisp, High-DPI scaled, Low CPU)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const draw = () => {
          if (!ctx || !canvas) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.font = "500 12px 'Inter', sans-serif";
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
          ctx.shadowBlur = 4;
          const text = `${userEmail} • ${new Date().toLocaleTimeString()}`;
          const x = 30 + Math.random() * Math.max(10, canvas.width - 240);
          const y = 30 + Math.random() * Math.max(10, canvas.height - 40);
          ctx.fillText(text, x, y);
        };
        draw();
        timer = setInterval(draw, 7000);
      }
    }

    initSecureStream();

    return () => {
      isDisposed = true;
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.stopLoad();
          hlsInstanceRef.current.detachMedia();
          hlsInstanceRef.current.destroy();
        } catch {}
        hlsInstanceRef.current = null;
      }
      const v = activeVideo.current;
      if (v) {
        try {
          v.pause();
          v.removeAttribute('src');
          v.load();
        } catch {}
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
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        className="w-full h-full object-contain"
        onLoadStart={() => setIsLoading(true)}
        onWaiting={() => setIsLoading(true)}
        onSeeking={() => setIsLoading(true)}
        onSeeked={() => {
          if (activeVideo.current && activeVideo.current.readyState >= 3) {
            setIsLoading(false);
          }
        }}
        onPlaying={() => setIsLoading(false)}
        onTimeUpdate={() => onTimeUpdate?.(activeVideo.current?.currentTime || 0)}
        onCanPlay={() => {
          setPlaybackError(false);
          setIsLoading(false);
        }}
        onLoadedData={() => {
          setPlaybackError(false);
          setIsLoading(false);
        }}
        onError={() => {
          setIsLoading(false);
          setPlaybackError(true);
        }}
      />
      {/* Video Loading & Buffering Spinner */}
      {isLoading && !playbackError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
          style={{
            background: 'radial-gradient(circle at center, rgba(10, 15, 30, 0.5) 0%, rgba(2, 6, 23, 0.8) 100%)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
          aria-label="Loading video"
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3.5px solid rgba(255, 255, 255, 0.15)',
              borderTopColor: '#3b82f6',
              borderRightColor: '#60a5fa',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.45)',
              animation: 'spin 0.85s linear infinite',
            }}
          />
          <span
            style={{
              marginTop: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#e2e8f0',
              letterSpacing: '0.4px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
            }}
          >
            Loading video...
          </span>
        </div>
      )}
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
            onClick={retryPlayback}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-600/30"
          >
            Retry Playback
          </button>
        </div>
      )}
    </div>
  );
}
