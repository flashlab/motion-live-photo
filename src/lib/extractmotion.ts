interface BlobUrl {
  url: any;
  size: number;
}

const indexOfSubarrayOptimized = (array: Uint8Array, subarray: Uint8Array) => {
  const firstByte = subarray[0];
  const subLength = subarray.length;

  let startIndex = array.indexOf(firstByte);
  while (startIndex !== -1) {
    if (array.subarray(startIndex, startIndex + subLength).every((value, index) => value === subarray[index])) {
      return startIndex;
    }
    startIndex = array.indexOf(firstByte, startIndex + 1);
  }
  return -1;
}

export default function readMotion(file: File): Promise<BlobUrl[]> {
  return new Promise((resolve, reject) => {
    let msg = [];
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      const textDecoder = new TextDecoder();
      const fileString = textDecoder.decode(uint8Array);
      // Extract XMP metadata
      const xmpStart = fileString.indexOf('<x:xmpmeta');
      const xmpEnd = fileString.indexOf('</x:xmpmeta>') + 12;
      let videoStart = -1;
      const patternArray = new TextEncoder().encode('ftyp');
      const ftypIndex = indexOfSubarrayOptimized(uint8Array, patternArray) - 4;
      const skipXMP = false;
      if (xmpStart === -1 || xmpEnd === -1 || skipXMP) {
        if (ftypIndex > 0) {
          msg.push(`ftyp video file head: ${ftypIndex}.`);
          videoStart = ftypIndex;
        } else {
          reject("No embed video found.");
        }
      } else {
        const xmpString = fileString.slice(xmpStart, xmpEnd);
        msg.push(xmpString);
        const matches = xmpString.matchAll(/<Container:Item[^>]*\bItem:Mime=["']video\/mp4["'][^>]*\bItem:Length=["'](\d+)["'][^>]*\/>/g);
        const matches_alt = xmpString.matchAll(/GCamera:MicroVideoOffset=["'](\d+)["']/g);
        let videoLength = null;
  
        for (const match of matches) {
          videoLength = parseInt(match[1], 10); // extract length of video
        }
        for (const match of matches_alt) {
          videoLength = parseInt(match[1], 10); // extract length of MicroVideo
        }
  
        // Check alignment
        if (videoLength !== null) {
          msg.push(`video locate (reverse lookup from EOF): ${videoLength}.`);
          videoStart = arrayBuffer.byteLength - videoLength;
          if (videoStart !== ftypIndex) {
            msg.push(ftypIndex > 0
              ? "⚠️Warning: video location mismatch with ftyp index."
              : "⚠️Error: found XMP meta with unexpected video header.");
          }
        } else {
          msg.push("⚠️No video locaion in XMP meta.");
          reject("Not motion photo.");
        }
      }
  
      if (videoStart < 0 || videoStart > arrayBuffer.byteLength) {
        reject("No embed video found.");
      }
      msg.push(`Calculated video head location: ${videoStart}`);
  
      const mp4Data = uint8Array.slice(videoStart);
      const blob = new Blob([mp4Data], { type: "video/mp4" });
  
      const jpegData = uint8Array.slice(0, videoStart);
      const imageBlob = new Blob([jpegData], { type: "image/jpeg" });

      resolve([{url: URL.createObjectURL(blob), size: blob.size}, {url: URL.createObjectURL(imageBlob), size: imageBlob.size}, {url: msg, size: msg.length}])
    };
    reader.readAsArrayBuffer(file);
  });
}