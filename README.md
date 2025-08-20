# Live Photo and Motion Photo playground on browser

[中文介绍](https://blog.zzbd.org/motion-live-photo-webui/) | [Blog article](https://blog.zzbd.org/en/motion-live-photo-webui/)

A modern web application that converts and compresses [live photo](https://developer.apple.com/design/human-interface-guidelines/live-photos) and [motion photo](https://developer.android.com/media/platform/motion-photo-format?hl=zh-cn) files using server-side FFmpeg processing. Preview any image-video pair as live photo in your browser with [LivePhotosKit JS](https://developer.apple.com/documentation/livephotoskitjs). Create motion photos with ease. Contributions welcome!

✨ Main features:

1. **Recognition and preview** motion photo series jpg files (Google/Xiaomi/Oppo etc.).
2. **Server-side FFmpeg processing** - Convert and reduce media (resize, crop, rotate, mute) with adjustable parameters, built-in compare slider for visualization.
3. **Video snapshot** - Take snapshots from videos as static images with custom timestamps.
4. **Motion photo creation** - Recreate motion photo jpg files with custom XMP metadata (experimental).
5. **Flexible API** - Upload/download functionality with cloud API integration (e.g., Cloudflare Image).
6. **Real-time processing logs** with timestamps.
7. **Local configuration** - Save settings locally and load from clipboard.
8. **HEIC/HEIF support** - Export HEIC/JPG and MOV files from iPhone before import.
9. **Multi-language support** and dark theme.
10. **Server-side architecture** - Improved performance and reliability compared to browser-based processing.

UI inspired by [video-dark2light-ffmpeg](https://github.com/The-Best-Codes/video-dark2light-ffmpeg). The motion photo parse and generate algorithm was modified from [https://motion-photo-parser.site.0to1.cf](https://motion-photo-parser.site.0to1.cf/). Heic/heif file compatibility drived by [heic-to](https://github.com/hoppergee/heic-to).

You can find deployed version at the URL below:

[https://motion-live.vercel.app/](https://motion-live.vercel.app/)
[https://motion-live.js.org/](https://motion-live.js.org/)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- FFmpeg (automatically installed in Docker)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/motion-live-photo.git
   cd motion-live-photo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

### Running the Application

#### Option 1: Docker (Recommended for Production)

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

Access the application at: http://localhost:3000

#### Option 2: Local Development

```bash
# Start the backend server (terminal 1)
npm run dev:server

# Start the frontend development server (terminal 2)
npm run dev
```

Access the application at: http://localhost:5173

### Usage

1. **Upload a motion photo** - Drag and drop or click to select a motion photo file
2. **Preview the motion photo** - The app will automatically detect and preview the motion photo
3. **Convert and process** - Use the controls to resize, crop, rotate, or mute the video
4. **Download the result** - Save the processed motion photo or video

### Architecture

The application uses a modern **server-side architecture**:

- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend**: Node.js + Express + FFmpeg (port 3000)
- **Processing**: Server-side FFmpeg with fluent-ffmpeg
- **File handling**: Multer for uploads with automatic cleanup

### API Endpoints

- `POST /api/upload` - Upload single file
- `POST /api/upload-multiple` - Upload multiple files
- `POST /api/ffmpeg/process` - Process file with FFmpeg
- `POST /api/ffmpeg/extract-video` - Extract video from motion photo
- `POST /api/ffmpeg/extract-frame` - Extract frame from video
- `GET /api/ffmpeg/info` - Get FFmpeg system information
- `GET /api/health` - Health check

### Environment Variables

```bash
# Backend
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
HOSTNAME=0.0.0.0
MAX_FILE_SIZE=104857600  # 100MB

# Frontend (development)
BACKEND_URL=http://localhost:3000
FRONTEND_PORT=5173
```

### File Formats Supported

- **Input**: JPG, PNG, HEIC, HEIF, MP4, MOV
- **Output**: MP4, GIF, JPG, PNG
- **Motion Photo**: Google, Xiaomi, Oppo formats

### Performance Features

- **Server-side processing** - Better performance than browser-based FFmpeg
- **Automatic file cleanup** - No storage bloat
- **Real-time progress tracking** - Monitor processing status
- **Memory efficient** - Optimized for large files
- **Scalable architecture** - Ready for production deployment

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


# Compare jpg compress quality

| ffmpeg wasm                                                  | squoosh.app                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| ![ffmpeg](https://github.com/user-attachments/assets/3ca8b022-9165-4682-98fd-d4e4ffd7c6ce) | ![squoosh](https://github.com/user-attachments/assets/dbc70c95-e09f-4a32-b76f-79b14ebe7066) |
| 82.2kb                                                       | 114kb                                                        |