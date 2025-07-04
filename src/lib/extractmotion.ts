
const indexOfSubarrayOptimized = (array: Uint8Array, subarray: Uint8Array) => {
  const firstByte = subarray[0];
  const subLength = subarray.length;

  let startIndex = array.indexOf(firstByte);
  while (startIndex !== -1) {
    if (array.subarray(startIndex, startIndex + subLength).every(
      (value, index) => value === subarray[index]
    )) {
      return startIndex;
    }
    startIndex = array.indexOf(firstByte, startIndex + 1);
  }
  return -1;
}

const extractMotion = async (data: File) => {
  return new Promise<any>((resolve) => {
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
      let photoStamp = -1;
      const patternArray = new TextEncoder().encode('ftyp');
      const ftypIndex = indexOfSubarrayOptimized(uint8Array, patternArray) - 4;
      const skipXMP = false;
      if (xmpStart === -1 || xmpEnd === -1 || skipXMP) {
        if (ftypIndex > 0) {
          postMessage({type: "log", msg: `📣 Ftyp video file head: ${ftypIndex}.`});
          videoStart = ftypIndex;
        } else {
          resolve({type: "err", msg: "🚩 No embed video found."});
        }
      } else {
        const xmpString = fileString.slice(xmpStart, xmpEnd);
        postMessage({type: "log", msg: xmpString});
        const matches = xmpString.matchAll(
          /<Container:Item[^>]*\bItem:Mime=["']video\/mp4["'][^>]*\bItem:Length=["'](\d+)["'][^>]*\/>/g
        );
        const matches_alt = xmpString.matchAll(/GCamera:MicroVideoOffset=["'](\d+)["']/g);
        const matches_stamp = xmpString.matchAll(/PresentationTimestampUs=["'](\d+)["']/g);
        let videoLength = null;

        for (const match of matches) {
          videoLength = parseInt(match[1], 10); // extract length of video
        }
        for (const match of matches_alt) {
          videoLength = parseInt(match[1], 10); // extract length of MicroVideo
        }
        for (const match of matches_stamp) {
          photoStamp = parseInt(match[1], 10); // extract timestamp at which the still photo was captured.
        }

        if (photoStamp !== -1) {
          postMessage({type: "log", msg: `📣 Video timestamp at photo captured: ${photoStamp}.`});
        }

        // Check alignment
        if (videoLength !== null) {
          postMessage({type: "log", msg: `📣 Video locate (reverse lookup from EOF): ${videoLength}.`});
          videoStart = arrayBuffer.byteLength - videoLength;
          if (videoStart !== ftypIndex) {
            postMessage({type: "log", msg: ftypIndex > 0
              ? "⚠️ Warning: video location mismatch with ftyp index."
              : "❌ Error: found XMP meta with unexpected video header."
            });
          }
        } else {
          postMessage({type: "log", msg: "⚠️ No video locaion in XMP meta."});
          resolve({type: "err", msg: "🚩 No video meta found."});
        }
      }

      if (videoStart < 0 || videoStart > arrayBuffer.byteLength) {
        resolve({type: "err", msg: "🚩 No embed video found."});
      }
      postMessage({type: "log", msg: `📣 Calculated video head location: ${videoStart}`});

      const mp4Data = uint8Array.slice(videoStart);
      const blob = new Blob([mp4Data], { type: "video/mp4" });

      const jpegData = uint8Array.slice(0, videoStart);
      const imageBlob = new Blob([jpegData], { type: "image/jpeg" });

      resolve({video: {url: URL.createObjectURL(blob), size: blob.size, ext: "mp4", type: "Embed"},
               image: {url: URL.createObjectURL(imageBlob), size: imageBlob.size, ext: "jpg", type: "Embed"},
               stamp: photoStamp,
               type: "res"
      });
    };
    reader.readAsArrayBuffer(data);
  });
}

onmessage = async (e: MessageEvent<File>) => {
  try {
    postMessage(await extractMotion(e.data));
  } catch (err) {
    postMessage({type: "err", msg: `🚩 Error extracting motion: ${err}`});
  }
}