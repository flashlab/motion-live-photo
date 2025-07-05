# Motion Photo mp4 to Live Photo Converter for web hosting

A simple web app that converted and compressed motion photo (.jpg file from android/xiaomi/oppo) to live photo (.jpg and .mov file from ios) using ffmpeg wasm. Or you can preview any image/video pair as live photo on your browser with the aid of [LivePhotosKit JS](https://developer.apple.com/documentation/livephotoskitjs). Any PRs are welcomed.

Main features:

1. Recognition and comvert motion photo like image files.
2. Reduce media resolutions and keep ratio on browser.
3. Download extracted and converted media files.
4. Upload files.
5. Realtime logs.
6. Save configs locally.
7. Heic/heif image supported.

The UI was build on the basis of [video-dark2light-ffmpeg](https://github.com/The-Best-Codes/video-dark2light-ffmpeg) created by [BestCodes](https://bestcodes.dev). The motion photo split algorithm was derived from [https://motion-photo-parser.site.0to1.cf](https://motion-photo-parser.site.0to1.cf/). Heic/heif file compatibility drived by [heic-to](https://github.com/hoppergee/heic-to).

You can find deployed version at the URL below:

[https://motion-live.vercel.app/](https://motion-live.vercel.app/)

# Todo
- [x] highlight selected file type.
- [x] HEVC/HEIF and AVIF support.
- [ ] Customize Heic-to params.
- [ ] split upload and convert state management.
- [ ] determine image MIME.
- [ ] Manually abort uploading.
- [ ] Customize uploaded file name.

# Compare jpg compress quality

| ffmpeg wasm                                                  | squoosh.app                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![ffmpeg](https://github.com/user-attachments/assets/3ca8b022-9165-4682-98fd-d4e4ffd7c6ce) | ![squoosh](https://github.com/user-attachments/assets/dbc70c95-e09f-4a32-b76f-79b14ebe7066) |
| 82.2kb                                                       | 114kb                                                        |