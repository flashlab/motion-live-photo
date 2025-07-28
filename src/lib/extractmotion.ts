const indexOfSubarrayOptimized = (array: Uint8Array, subarray: Uint8Array, skipFirst = false) => {
  const firstByte = subarray[0];
  const subLength = subarray.length;

  let startIndex = array.indexOf(firstByte);
  while (startIndex !== -1) {
    if (array.subarray(startIndex, startIndex + subLength).every(
      (value, index) => value === subarray[index]
    )) {
      if (skipFirst) {
        skipFirst = false;
      } else {
        return startIndex;
      }
    }
    startIndex = array.indexOf(firstByte, startIndex + 1);
  }
  return -1;
}

const findPatternInUint8ArrayReverse = (array: Uint8Array<ArrayBuffer>, pattern: number[]) => {
  const patternLength = pattern.length;
  const arrayLength = array.length;

  for (let i = arrayLength - patternLength; i >= 0; i--) {
    let match = true;
    for (let j = 0; j < patternLength; j++) {
      if (array[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return i;
    }
  }
  return -1;
}

const embedXMP = (xmpData: string) => {
  function stringToUTF8Bytes(str: string) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }
  const xmpPayload = stringToUTF8Bytes(xmpData + '\x0A');
  const xmpMarker = new Uint8Array([0xFF, 0xE1]);
  const xmpHeader = stringToUTF8Bytes('http://ns.adobe.com/xap/1.0/\x00');
  const xmpLength = xmpPayload.length + xmpHeader.length + 2;

  const xmpSegment = new Uint8Array(xmpLength + 2);
  xmpSegment.set(xmpMarker, 0);
  xmpSegment.set([(xmpLength >> 8) & 0xFF, xmpLength & 0xFF], 2);
  xmpSegment.set(xmpHeader, 4);
  xmpSegment.set(xmpPayload, 4 + xmpHeader.length);

  return xmpSegment;
}

const fileToArray = async (file: File) => {
  return new Promise<Uint8Array>((resolve) => {
    const videoReader = new FileReader();
    videoReader.onload = function () {
      resolve(new Uint8Array(videoReader.result as ArrayBuffer));
    }
    videoReader.readAsArrayBuffer(file);
  })
}

type MotionData = {
  image: File;
  video: File;
  xmp: string;
  hasXmp: boolean;
  hasExtraXmp: boolean;
  stamp?: number;
};

const extractMotion = (data: File) => {
  return new Promise<MotionData>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let videoStart = -1;
      let photoStamp = -1;
      let hasExtraXmp =false;
      let hasXmp =false;
      let xmpString = '';
      const arrayBuffer = reader.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      const textDecoder = new TextDecoder();
      const fileString = textDecoder.decode(uint8Array);
      // Extract XMP metadata
      const xmpStart = fileString.indexOf('<x:xmpmeta');
      const xmpEnd = fileString.indexOf('</x:xmpmeta>') + 12;
      // Second XMP metadata from Xiaomi
      const extraXmpStart = fileString.indexOf('<x:xmpmeta', xmpEnd);
      const extraXmpEnd = fileString.indexOf('</x:xmpmeta>', xmpEnd) + 12;
      if (extraXmpStart !== -1 && extraXmpEnd !== 11) {
        const extraXmpString = fileString.slice(extraXmpStart, extraXmpEnd);
        // check keyword
        if (extraXmpString.includes('MicroVideoOffset')) {
          hasExtraXmp = true;
          postMessage({ type: "log", msg: `⚠️ Second XMP meta found: ${extraXmpString}` });
          postMessage({ type: "log", msg: "⚠️ Dup XMP (Xiaomi): Edit APP1 in XMP which contains Exif will broke Exif, future improvement needed." });
        }
      }
      const ftypIndex = indexOfSubarrayOptimized(uint8Array, new TextEncoder().encode('ftyp')) - 4;
      const skipXMP = false;
      if (xmpStart === -1 || xmpEnd === -1 || skipXMP) {
        if (ftypIndex > 0) {
          postMessage({ type: "log", msg: `📣 Ftyp video file head: ${ftypIndex}.` });
          videoStart = ftypIndex;
        } else {
          reject(new Error("⚠️ No embed video found."));
          return;
        }
      } else {
        hasXmp = true;
        xmpString = fileString.slice(xmpStart, xmpEnd);
        const matches = xmpString.matchAll(
          /<Container:Item[^>]*\bItem:Mime=["']video\/mp4["'][^>]*\bItem:Length=["'](\d+)["'][^>]*\/>/g
        );
        const matches_alt = xmpString.matchAll(/GCamera:MicroVideoOffset=["'](\d+)["']/g);
        const matches_stamp = xmpString.matchAll(/PresentationTimestampUs=["'](\d+)["']/g);
        let videoLength: number | null = null;

        for (const match of matches) {
          if (!videoLength) videoLength = parseInt(match[1], 10); // extract length of video
        }
        for (const match of matches_alt) {
          if (!videoLength) videoLength = parseInt(match[1], 10); // extract length of MicroVideo
        }
        for (const match of matches_stamp) {
          if (photoStamp === -1) photoStamp = parseInt(match[1], 10); // extract timestamp at which the still photo was captured.
        }

        if (photoStamp !== -1) {
          postMessage({ type: "log", msg: `📣 Video timestamp at photo captured: ${photoStamp}.` });
        }

        // Check alignment
        if (videoLength !== null) {
          postMessage({ type: "log", msg: `📣 Video locate (reverse lookup from EOF): ${videoLength}.` });
          videoStart = arrayBuffer.byteLength - videoLength;
          if (videoStart !== ftypIndex) {
            postMessage({
              type: "log", msg: ftypIndex > 0
                ? "⚠️ Warning: video location mismatch with ftyp index."
                : "❌ Error: found XMP meta with unexpected video header."
            });
          }
        } else {
          postMessage({ type: "log", msg: "⚠️ No video locaion in XMP meta." });
          reject(new Error("⚠️ No video meta found."));
          return;
        }
      }

      if (videoStart < 0 || videoStart > arrayBuffer.byteLength) {
        reject(new Error("⚠️ No embed video found."));
        return;
      }
      postMessage({ type: "log", msg: `📣 Calculated video head location: ${videoStart}` });

      resolve({
        video: new File([uint8Array.slice(videoStart)], data.name.replace(/(\.[^.]+)?$/, "_embed.mp4"), { type: "video/mp4" }),
        image: new File([uint8Array.slice(0, videoStart)], data.name.replace(/(\.[^.]+)?$/, "_embed.jpg"), { type: "image/jpeg" }),
        stamp: photoStamp,
        hasExtraXmp: hasExtraXmp,
        hasXmp: hasXmp,
        xmp: xmpString,
      });
    };
    reader.onerror = function (e) {
      reject(e.target?.error || new Error("❌ File read error"));
    };
    reader.readAsArrayBuffer(data);
  });
}

const createMotion = async (data: MotionData) => {
  if (data.image.name === "" || !data.xmp) throw new Error('❌ missing xmp or image.');
  const newVideoArray = await fileToArray(data.video);
  return new Promise<File>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const originalArray = new Uint8Array(arrayBuffer);
      let xmpStart = 2;
      let xmpEnd = 2;
      let extraXmpStart = 0;
      let extraXmpEnd = 0;
      let updatedXmpArray = new TextEncoder().encode(data.xmp);
      if (data.hasXmp) {
          xmpStart = indexOfSubarrayOptimized(originalArray, new TextEncoder().encode('<x:xmpmeta'));
          xmpEnd = indexOfSubarrayOptimized(originalArray, new TextEncoder().encode('</x:xmpmeta>')) + 12;
          if (data.hasExtraXmp) {
              extraXmpStart = indexOfSubarrayOptimized(originalArray, new TextEncoder().encode('<x:xmpmeta'), true);
              extraXmpEnd = indexOfSubarrayOptimized(originalArray, new TextEncoder().encode('</x:xmpmeta>'), true) + 12;
          }
      } else {
          postMessage({ type: "log", msg: `📣 No XMP found, de novo construct APP1 field.` });
          updatedXmpArray = embedXMP(data.xmp);
      }
      let videoStart = indexOfSubarrayOptimized(originalArray, new TextEncoder().encode('ftyp')) - 4;
      if (videoStart < 0) {
          postMessage({ type: "log", msg: `📣 No embed video found, try to append on EOF.` });
          videoStart = originalArray.length;
      }
      if (newVideoArray.length <= 0) {
          postMessage({ type: "log", msg: `📣 No extra video provide, keep original one` });
          videoStart = originalArray.length;
      }

      // TODO: fields already hold shift is ignored, e.g. MPF; APP1 field beyond XMP, AKA vendors' additional fields.
      const extraXmpLength = data.hasExtraXmp ? updatedXmpArray.length : 0;
      const updatedFileArray = new Uint8Array(videoStart + newVideoArray.length - xmpEnd + xmpStart + updatedXmpArray.length - extraXmpEnd + extraXmpStart + extraXmpLength);
      let raw_app1 = originalArray.slice(0, xmpStart)
      // Fix header length mark of APP1 field refer to XMP.
      const searchPattern = [0xFF, 0xE1];
      let app1_start = findPatternInUint8ArrayReverse(raw_app1, searchPattern);
      if (app1_start === -1) {
        postMessage({ type: "log", msg: `📣 Try to create an APP1 field containing XMP.` });
      } else {
          const originalLength = (raw_app1[app1_start + 2] << 8) | raw_app1[app1_start + 3];
          const n = updatedXmpArray.length - (xmpEnd - xmpStart);
          const newLength = originalLength + n;
          raw_app1[app1_start + 2] = (newLength >> 8) & 0xFF;
          raw_app1[app1_start + 3] = newLength & 0xFF;
      }
      updatedFileArray.set(raw_app1);
      updatedFileArray.set(updatedXmpArray, xmpStart);
      if (data.hasExtraXmp) {
          // Deal with the second XMP dup in case of Xiaomi
          // console.log(extraXmpStart, extraXmpEnd);
          raw_app1 = originalArray.slice(xmpEnd, extraXmpStart)
          app1_start = findPatternInUint8ArrayReverse(raw_app1, searchPattern);
          const originalLength = (raw_app1[app1_start + 2] << 8) | raw_app1[app1_start + 3];
          const n = updatedXmpArray.length - (extraXmpEnd - extraXmpStart);
          const newLength = originalLength + n;
          raw_app1[app1_start + 2] = (newLength >> 8) & 0xFF;
          raw_app1[app1_start + 3] = newLength & 0xFF;
          updatedFileArray.set(raw_app1, xmpStart + updatedXmpArray.length);
          updatedFileArray.set(updatedXmpArray, extraXmpStart - xmpEnd + xmpStart + updatedXmpArray.length);
          updatedFileArray.set(originalArray.slice(extraXmpEnd, videoStart), extraXmpEnd + updatedXmpArray.length + extraXmpLength - (xmpEnd - xmpStart) - (extraXmpEnd - extraXmpStart));
          updatedFileArray.set(newVideoArray, videoStart + updatedXmpArray.length + extraXmpLength - (xmpEnd - xmpStart) - (extraXmpEnd - extraXmpStart));
      } else {
          updatedFileArray.set(originalArray.slice(xmpEnd, videoStart), xmpStart + updatedXmpArray.length);
          updatedFileArray.set(newVideoArray, videoStart - xmpEnd + xmpStart + updatedXmpArray.length);
      }
      resolve(new File([updatedFileArray], data.image.name.replace(/(\.[^.]+)?$/, "_live.jpg"), { type: "image/jpeg" }));
    };
    reader.onerror = function (e) {
      reject(e.target?.error || new Error("❌ File read error"));
    };
    reader.readAsArrayBuffer(data.image);
  });
}

onmessage = async (e: MessageEvent<File>) => {
  try {
    postMessage({ type: "res", msg:"Motion", obj: e.data instanceof File ? await extractMotion(e.data) : await createMotion(e.data)});
  } catch (err) {
    postMessage({ type: "err", msg: err });
  }
}