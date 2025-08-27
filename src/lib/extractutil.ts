export const XmpStrings = {
  default: `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
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
</x:xmpmeta>`,
  oppo: `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:hdrgm="http://ns.adobe.com/hdr-gain-map/1.0/"
        xmlns:GCamera="http://ns.google.com/photos/1.0/camera/"
        xmlns:OpCamera="http://ns.oplus.com/photos/1.0/camera/"
        xmlns:Container="http://ns.google.com/photos/1.0/container/"
        xmlns:Item="http://ns.google.com/photos/1.0/container/item/"
      hdrgm:Version="1.0"
      GCamera:MotionPhoto="1"
      GCamera:MotionPhotoVersion="1"
      GCamera:MotionPhotoPresentationTimestampUs="0"
      OpCamera:MotionPhotoPrimaryPresentationTimestampUs="0"
      OpCamera:MotionPhotoOwner="oplus"
      OpCamera:OLivePhotoVersion="2"
      OpCamera:VideoLength="6271409">
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
              Item:Length="6271409"/>
          </rdf:li>
        </rdf:Seq>
      </Container:Directory>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`,
  xiaomi: `<x:xmpmeta xmlns:x='adobe:ns:meta/' x:xmptk='Image::ExifTool 13.02'>
<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'>

 <rdf:Description rdf:about=''
  xmlns:GCamera='http://ns.google.com/photos/1.0/camera/'>
  <GCamera:MicroVideo>1</GCamera:MicroVideo>
  <GCamera:MicroVideoOffset>426553</GCamera:MicroVideoOffset>
  <GCamera:MicroVideoPresentationTimestampUs>15000</GCamera:MicroVideoPresentationTimestampUs>
  <GCamera:MicroVideoVersion>1</GCamera:MicroVideoVersion>
  <GCamera:MotionPhoto>1</GCamera:MotionPhoto>
  <GCamera:MotionPhotoPresentationTimestampUs>0</GCamera:MotionPhotoPresentationTimestampUs>
  <GCamera:MotionPhotoVersion>1</GCamera:MotionPhotoVersion>
 </rdf:Description>

 <rdf:Description rdf:about=''
  xmlns:GContainer='http://ns.google.com/photos/1.0/container/'
  xmlns:Item='http://ns.google.com/photos/1.0/container/item/'>
  <GContainer:Directory>
   <rdf:Seq>
    <rdf:li rdf:parseType='Resource'>
     <GContainer:Item rdf:parseType='Resource'>
      <Item:Mime>image/jpeg</Item:Mime>
      <Item:Semantic>Primary</Item:Semantic>
     </GContainer:Item>
    </rdf:li>
    <rdf:li rdf:parseType='Resource'>
     <GContainer:Item rdf:parseType='Resource'>
      <Item:Mime>video/mp4</Item:Mime>
      <Item:Semantic>MotionPhoto</Item:Semantic>
      <Item:Length>326729</Item:Length>
     </GContainer:Item>
    </rdf:li>
   </rdf:Seq>
  </GContainer:Directory>
 </rdf:Description>

 <rdf:Description rdf:about=''
  xmlns:OpCamera='http://ns.oplus.com/photos/1.0/camera/'>
  <OpCamera:MotionPhotoOwner>xhs</OpCamera:MotionPhotoOwner>
  <OpCamera:MotionPhotoPrimaryPresentationTimestampUs>0</OpCamera:MotionPhotoPrimaryPresentationTimestampUs>
  <OpCamera:OLivePhotoVersion>2</OpCamera:OLivePhotoVersion>
  <OpCamera:VideoLength>326729</OpCamera:VideoLength>
 </rdf:Description>
</rdf:RDF>
</x:xmpmeta>`,
  embed: "",
};

export const fixXmpString = (
  xmpContent: string,
  videoSize: number,
  stamp: number
): string => {
  // find OpCamera:VideoLength="..."/GCamera:MicroVideoOffset="..."/Item:Length="..."(after Item:Semantic="MotionPhoto")
  // replace ... with videoSize
  const regex = /(OpCamera:VideoLength(?:=['"]|>))\d+/g;
  let newXmpContent = xmpContent.replace(regex, `$1${videoSize}`);
  const regex2 = /(GCamera:MicroVideoOffset(?:=['"]|>))\d+/g;
  newXmpContent = newXmpContent.replace(regex2, `$1${videoSize}`);
  const regex3 =
    /(?<=Item:Length(?:=['"]|>))\d+(?=.*?\n(?:.*\n)?.*?MotionPhoto)|(?<=MotionPhoto.*?\n(?:.*\n)?[\s<]*?Item:Length(?:=['"]|>))\d+/g;
  newXmpContent = newXmpContent.replace(regex3, String(videoSize));
  // Timestamp
  const regex4 =
    /(Camera:MotionPhoto\w*?PresentationTimestampUs(?:=['"]|>))\d+/g;
  if (stamp) newXmpContent = newXmpContent.replace(regex4, `$1${stamp}`);
  return newXmpContent;
};
