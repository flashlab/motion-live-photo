# Live Photo and Motion Photo playground on browser

[中文介绍](https://blog.zzbd.org/motion-live-photo-webui/) | [Blog article](https://blog.zzbd.org/en/motion-live-photo-webui/)

A SPA online tool that converted and compressed [live photo](https://developer.apple.com/design/human-interface-guidelines/live-photos) and [motion photo](https://developer.android.com/media/platform/motion-photo-format?hl=zh-cn) for [web scenario](https://x.com/zhizhubaodan/status/1945887608397238688). Or you can preview any image - video (e.g. jpg and mp4 files) pair as live photo on your browser with the aid of [LivePhotosKit JS](https://developer.apple.com/documentation/livephotoskitjs). Or, create motion photo with some lucky. Any PRs are welcomed.

✨ Main features:

1. Recognition and preview motion photo series jpg files (google/xiaomi/oppo..).
2. Convert or Reduce media (pixel, cut, crop, rotate, mute..) by ffmpeg wasm (single/multithread) with parameters adjustable, build-in compare slider enable change visualization of images.
3. Take snapshot of video as static image of motion photo and custom presentation timestamp.
4. Recreate motion photo jpg file from above with ability to custom XMP meta (experimental, oppo/xiaomi full-support).
4. Download / Upload with flexible API of all above, and fetch transformed image from cloud API (e.g. cloudflare image). CORS supported by GM userscript (see [CORS Support Guide](#CORS-Support-Guide)).
5. Realtime logs with time stamps.
6. Save configs locally and load from clipboard.
7. Heic/heif image supported, you should export heic/jpg and mov file from iphone before import.
8. Multi-language and dark theme.

UI inspired by [video-dark2light-ffmpeg](https://github.com/The-Best-Codes/video-dark2light-ffmpeg). The motion photo parse and generate algorithm was modified from [https://motion-photo-parser.site.0to1.cf](https://motion-photo-parser.site.0to1.cf/). Heic/heif file compatibility drived by [heic-to](https://github.com/hoppergee/heic-to).

You can find deployed version at the URL below:

[https://motion-live.vercel.app/](https://motion-live.vercel.app/)
[https://motion-live.js.org/](https://motion-live.js.org/)

# Todo
- [x] highlight selected file type.
- [x] HEVC/HEIF and AVIF support.
- [x] Customize uploaded file name.
- [x] Generate motion photo.
- [x] Split upload and convert state management.
- [x] Cloud conversion with customed API.
- [x] Customize Heic-to params.
- [x] Manually abort uploading.
- [x] Converted image file type option.
- [x] Visualized cut and rotate media.
- [ ] More XMP template.

# CORS Support Guide

Install Tampermonkey userscript from [greasyfork](https://greasyfork.org/zh-CN/scripts/547102-cors-plugin-for-motion-live).

# Compare jpg compress quality

| ffmpeg wasm                                                  | squoosh.app                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![ffmpeg](https://github.com/user-attachments/assets/3ca8b022-9165-4682-98fd-d4e4ffd7c6ce) | ![squoosh](https://github.com/user-attachments/assets/dbc70c95-e09f-4a32-b76f-79b14ebe7066) |
| 82.2kb                                                       | 114kb                                                        |