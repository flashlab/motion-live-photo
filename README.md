# Motion Photo mp4 to Live Photo Converter for web hosting

This is a simple web converter that converts motion photo (google/xiaomi/oppo) to live photo (resized .jpg and .mov file) using an ffmpeg command in your browser. 

The UI was build on the basis of [video-dark2light-ffmpeg](https://github.com/The-Best-Codes/video-dark2light-ffmpeg) created by [BestCodes](https://bestcodes.dev). The motion photo split algorithm was derived from [https://motion-photo-parser.site.0to1.cf](https://motion-photo-parser.site.0to1.cf/).

You can find deployed version at the URL below:

[https://motion-live.vercel.app/](https://motion-live.vercel.app/)

# Compare jpg compress quality

| ffmpeg wasm                                                  | squoosh.app                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![ffmpeg](https://github.com/user-attachments/assets/3ca8b022-9165-4682-98fd-d4e4ffd7c6ce) | ![squoosh](https://github.com/user-attachments/assets/dbc70c95-e09f-4a32-b76f-79b14ebe7066) |
| 82.2kb                                                       | 114kb                                                        |