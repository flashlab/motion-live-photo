'use client'

import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import { Loader } from 'lucide-react';

type LivePhotosKit = typeof import('livephotoskit')
declare global {
  interface Window {
    LivePhotosKit: LivePhotosKit
  }
}

export function LivePhoto({ url, videoUrl, stamp, className }: { url?: string; videoUrl?: string; stamp?: number; className?: string }) {
  const livePhotoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initializeLivePhotosKit = async () => {
      const LivePhotosKit = (await import('livephotoskit'))
      if (livePhotoRef.current && url && videoUrl) {
        LivePhotosKit.augmentElementAsPlayer(livePhotoRef.current, {
          effectType: 'live',
          photoSrc: url,
          videoSrc: videoUrl,
          showsNativeControls: true,
          photoTime: (stamp && stamp >= 0) ? stamp : null
        })
      }
    };

    if (url && videoUrl) initializeLivePhotosKit();
  }, [livePhotoRef, url, videoUrl])

  return (
      <div ref={livePhotoRef} className={
        cn(className, "relative w-full object-contain h-100")
      } >
        {!window.LivePhotosKit && (<Loader className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />)}
      </div>
  )
}

export function LivePhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" >
      <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />
      <path d="M15.9 20.11l0 .01" />
      <path d="M19.04 17.61l0 .01" />
      <path d="M20.77 14l0 .01" />
      <path d="M20.77 10l0 .01" />
      <path d="M19.04 6.39l0 .01" />
      <path d="M15.9 3.89l0 .01" />
      <path d="M12 3l0 .01" />
      <path d="M8.1 3.89l0 .01" />
      <path d="M4.96 6.39l0 .01" />
      <path d="M3.23 10l0 .01" />
      <path d="M3.23 14l0 .01" />
      <path d="M4.96 17.61l0 .01" />
      <path d="M8.1 20.11l0 .01" />
      <path d="M12 21l0 .01" />
    </svg>
  )
};