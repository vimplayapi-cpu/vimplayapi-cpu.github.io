'use client';

import { useRef, useState } from 'react';

import { Frame } from './Frame';
import type { VideoAsset } from '@/lib/db/types';
import { cn } from '@/lib/cn';

/**
 * Studio video player.
 *
 * Deliberately click-to-load: the <video> element is not mounted until the
 * visitor asks for it, so a page with ten studio videos costs nothing until one
 * is played. Never autoplays with sound. Native controls are kept (the brief
 * requires play/pause/mute/fullscreen and native controls are both accessible
 * and consistent across iOS Safari and Android Chrome), with our own poster
 * and play affordance layered on top.
 */
export function VideoPlayer({
  video,
  accent,
  className,
}: {
  video: VideoAsset;
  accent?: string;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (failed) {
    return (
      <div className={cn('panel flex aspect-video items-center justify-center p-8', className)}>
        <div className="text-center">
          <p className="tech-label text-live">PLAYBACK UNAVAILABLE</p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            This video could not be loaded. It may still be processing, or the source file may be
            unavailable.
          </p>
          {video.poster && (
            <a href={video.src} className="btn btn-secondary mt-6 inline-flex" download>
              DOWNLOAD SOURCE
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <figure className={cn('relative', className)}>
      <div className="relative aspect-video overflow-hidden bg-midnight">
        {active ? (
          <video
            ref={videoRef}
            // eslint-disable-next-line jsx-a11y/media-has-caption -- captions are
            // an optional CMS field; when present they are attached below.
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster={video.poster?.webp}
            onError={() => setFailed(true)}
            className="h-full w-full bg-void object-cover"
          >
            <source src={video.src} type={video.mime} />
            Your browser cannot play this video.
            <a href={video.src}>Download it instead.</a>
          </video>
        ) : (
          <>
            {video.poster ? (
              <Frame
                image={video.poster}
                sizes="(max-width: 1024px) 100vw, 60vw"
                alt={video.poster.alt || `${video.title} — video poster frame`}
                className="absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 bg-graphite" />
            )}
            <div aria-hidden className="absolute inset-0 bg-void/45" />

            <button
              type="button"
              onClick={() => setActive(true)}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-5"
            >
              <span
                className="flex h-20 w-20 items-center justify-center border transition-all duration-500 ease-cinematic group-hover:scale-105"
                style={{
                  borderColor: accent ?? 'rgba(242,245,248,0.3)',
                  backgroundColor: `${accent ?? '#3DDCE8'}1A`,
                }}
              >
                <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden fill={accent ?? '#F2F5F8'}>
                  <path d="M0 0l20 12L0 24z" />
                </svg>
              </span>
              <span className="font-mono text-tech uppercase text-chalk">
                PLAY STUDIO VIDEO
              </span>
              <span className="sr-only">{video.title || 'Play studio video'}</span>
            </button>
          </>
        )}
      </div>

      {(video.title || video.caption) && (
        <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-hairline pt-4">
          {video.title && <p className="font-mono text-tech uppercase text-mist">{video.title}</p>}
          {video.caption && <p className="text-sm text-muted">{video.caption}</p>}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Empty state for a studio whose video slot has not been filled yet. Shown
 * instead of hiding the section, so the gap is legible to an administrator.
 */
export function VideoEmptyState({ className }: { className?: string }) {
  return (
    <div className={cn('panel frame-ticks flex aspect-video items-center justify-center p-8', className)}>
      <div className="max-w-sm text-center">
        <p className="tech-label">NO VIDEO UPLOADED</p>
        <p className="mt-3 text-sm text-muted">
          A cinematic studio video can be uploaded for this environment from the media library in
          the back office.
        </p>
      </div>
    </div>
  );
}
