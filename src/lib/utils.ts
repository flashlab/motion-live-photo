import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
* Resize image to meet dimension requirement of livephotoskit and keep ratio.
* 
* @param originalWidth original width.
* @param originalHeight original height.
* @param maxWidth max width.
* @param maxHeight max height.
* 
* @return new width and height.
*/
export function resizeDimensions(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number) {
  const aspectRatio = originalWidth / originalHeight;
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  if (newWidth > maxWidth && maxWidth > 0) {
    newWidth = maxWidth;
    newHeight = Math.floor(newWidth / aspectRatio);
  }
  if (newHeight > maxHeight && maxHeight > 0) {
    newHeight = maxHeight;
    newWidth = Math.floor(newHeight * aspectRatio);
  }
  return { width: newWidth, height: newHeight };
}

/**
* Format bytes as human-readable text.
* 
* @param bytes Number of bytes.
* @param si True to use metric (SI) units, aka powers of 1000. False to use 
*           binary (IEC), aka powers of 1024.
* @param dp Number of decimal places to display.
* 
* @return Formatted string.
*/
export function humanFileSize(bytes: number, si=false, dp=1) {
 const thresh = si ? 1000 : 1024;

 if (Math.abs(bytes) < thresh) {
   return bytes + ' B';
 }

 const units = si 
   ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
   : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
 let u = -1;
 const r = 10**dp;

 do {
   bytes /= thresh;
   ++u;
 } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


 return bytes.toFixed(dp) + ' ' + units[u];
}

/**
 * Extracts the name and extension from a filename
 * @param {string} filename - The filename to process
 * @return {Object | null} containing the name and extension
 */
export function parseFileName(filename: string) {
  let name = "";
  let ext = "";

  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    name = filename;
  } else {
    name = filename.substring(0, lastDotIndex);
    ext = filename.substring(lastDotIndex + 1).toLowerCase();
  }
  
  return { name: name, ext: ext };
}