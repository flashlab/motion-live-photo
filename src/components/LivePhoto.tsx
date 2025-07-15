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

export function LivePhoto({ url, videoUrl, stamp, className, aspectRatio }:
  { url?: string; videoUrl?: string; stamp?: number; className?: string, aspectRatio:number }) {
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
      <div ref={livePhotoRef} style={{ aspectRatio: aspectRatio }} className={
        cn(className, "relative w-full object-contain")
      } >
        {!window.LivePhotosKit && (<Loader className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />)}
      </div>
  )
}

export function LivePhotoIcon({className}: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" >
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

export const defaultXmpString = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"
        xmlns:OpCamera="http://ns.oplus.com/photos/1.0/camera/"
        xmlns:MiCamera="http://ns.xiaomi.com/photos/1.0/camera/"
        xmlns:Container="http://ns.google.com/photos/1.0/container/"
        xmlns:Item="http://ns.google.com/photos/1.0/container/item/"
      GCamera:MotionPhoto="1"
      GCamera:MotionPhotoVersion="1"
      GCamera:MotionPhotoPresentationTimestampUs="0"
      OpCamera:MotionPhotoPrimaryPresentationTimestampUs="0"
      OpCamera:MotionPhotoOwner="oplus"
      OpCamera:OLivePhotoVersion="2"
      OpCamera:VideoLength="5417125"
      GCamera:MicroVideoVersion="1"
      GCamera:MicroVideo="1"
      GCamera:MicroVideoOffset="5417125"
      GCamera:MicroVideoPresentationTimestampUs="0"
      MiCamera:XMPMeta="&lt;?xml version='1.0' encoding='UTF-8' standalone='yes' ?&gt;">
      <Container:Directory>
        <rdf:Seq>
          <rdf:li rdf:parseType="Resource">
            <Container:Item
              Item:Mime="image/jpeg"
              Item:Semantic="Primary"
              Item:Length="0"
              Item:Padding="0"/>
          </rdf:li>
          <rdf:li rdf:parseType="Resource">
            <Container:Item
              Item:Mime="video/mp4"
              Item:Semantic="MotionPhoto"
              Item:Length="5417125"/>
          </rdf:li>
        </rdf:Seq>
      </Container:Directory>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`