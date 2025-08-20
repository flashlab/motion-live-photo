import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';

// ES模块环境下获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadTime: new Date().toISOString()
    };

    res.json({
      success: true,
      file: fileInfo,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      details: error.message 
    });
  }
});

// Multiple file upload endpoint
app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const filesInfo = req.files.map(file => ({
      id: uuidv4(),
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadTime: new Date().toISOString()
    }));

    res.json({
      success: true,
      files: filesInfo,
      count: filesInfo.length,
      message: 'Files uploaded successfully'
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      details: error.message 
    });
  }
});

// Get file info
app.get('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stats = fs.statSync(filePath);
  res.json({
    filename: filename,
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime
  });
});

// Delete file
app.delete('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlinkSync(filePath);
  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

// FFmpeg processing endpoint
app.post('/api/ffmpeg/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { 
      outputFormat = 'mp4',
      quality = 'medium',
      width,
      height,
      startTime,
      duration,
      mute = false,
      rotate
    } = req.body;

    const inputPath = req.file.path;
    const outputId = uuidv4();
    const outputExt = outputFormat === 'gif' ? 'gif' : 'mp4';
    const outputPath = path.join(__dirname, 'uploads', `${outputId}.${outputExt}`);

    // Build FFmpeg command
    let command = ffmpeg(inputPath);

    // Set output format
    if (outputFormat === 'gif') {
      command.outputFormat('gif');
    }

    // Set video codec based on quality
    if (quality === 'high') {
      command.videoCodec('libx264').outputOptions(['-crf 18', '-preset slow']);
    } else if (quality === 'medium') {
      command.videoCodec('libx264').outputOptions(['-crf 23', '-preset medium']);
    } else {
      command.videoCodec('libx264').outputOptions(['-crf 28', '-preset fast']);
    }

    // Set dimensions
    if (width && height) {
      command.size(`${width}x${height}`);
    }

    // Set time range
    if (startTime) {
      command.seekInput(parseFloat(startTime));
    }
    if (duration) {
      command.duration(parseFloat(duration));
    }

    // Mute audio if requested
    if (mute === 'true') {
      command.noAudio();
    }

    // Rotate video if requested
    if (rotate) {
      command.outputOptions([`-vf "rotate=${rotate}"`]);
    }

    // Execute FFmpeg command
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing:', Math.round(progress.percent) + '%');
      })
      .on('end', () => {
        // Clean up input file
        fs.unlinkSync(inputPath);
        
        res.json({
          success: true,
          outputUrl: `/uploads/${outputId}.${outputExt}`,
          filename: `${outputId}.${outputExt}`,
          message: 'FFmpeg processing completed successfully'
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        // Clean up input file
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        res.status(500).json({
          error: 'FFmpeg processing failed',
          details: err.message
        });
      })
      .save(outputPath);

  } catch (error) {
    console.error('FFmpeg processing error:', error);
    res.status(500).json({
      error: 'FFmpeg processing failed',
      details: error.message
    });
  }
});

// Extract video from motion photo
app.post('/api/ffmpeg/extract-video', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const outputId = uuidv4();
    const outputPath = path.join(__dirname, 'uploads', `${outputId}_video.mp4`);

    ffmpeg(inputPath)
      .on('start', (commandLine) => {
        console.log('Extract video command:', commandLine);
      })
      .on('end', () => {
        // Clean up input file
        fs.unlinkSync(inputPath);
        
        res.json({
          success: true,
          videoUrl: `/uploads/${outputId}_video.mp4`,
          filename: `${outputId}_video.mp4`,
          message: 'Video extracted successfully'
        });
      })
      .on('error', (err) => {
        console.error('Video extraction error:', err);
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        res.status(500).json({
          error: 'Video extraction failed',
          details: err.message
        });
      })
      .save(outputPath);

  } catch (error) {
    console.error('Video extraction error:', error);
    res.status(500).json({
      error: 'Video extraction failed',
      details: error.message
    });
  }
});

// Extract frame from video
app.post('/api/ffmpeg/extract-frame', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { timestamp = '00:00:01' } = req.body;
    const inputPath = req.file.path;
    const outputId = uuidv4();
    const outputPath = path.join(__dirname, 'uploads', `${outputId}_frame.jpg`);

    ffmpeg(inputPath)
      .seekInput(timestamp)
      .frames(1)
      .on('start', (commandLine) => {
        console.log('Extract frame command:', commandLine);
      })
      .on('end', () => {
        // Clean up input file
        fs.unlinkSync(inputPath);
        
        res.json({
          success: true,
          imageUrl: `/uploads/${outputId}_frame.jpg`,
          filename: `${outputId}_frame.jpg`,
          message: 'Frame extracted successfully'
        });
      })
      .on('error', (err) => {
        console.error('Frame extraction error:', err);
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        res.status(500).json({
          error: 'Frame extraction failed',
          details: err.message
        });
      })
      .save(outputPath);

  } catch (error) {
    console.error('Frame extraction error:', error);
    res.status(500).json({
      error: 'Frame extraction failed',
      details: error.message
    });
  }
});

// Get FFmpeg info
app.get('/api/ffmpeg/info', (req, res) => {
  try {
    // Check if FFmpeg is available using the proper ES module import
    import('child_process').then(({ exec }) => {
      exec('ffmpeg -version', (error, stdout, stderr) => {
        if (error) {
          return res.json({
            success: false,
            error: 'FFmpeg is not installed on the server',
            message: 'Please install FFmpeg to use video processing features',
            installCommand: 'brew install ffmpeg'
          });
        }
        
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to get FFmpeg formats' });
          }
          
          ffmpeg.getAvailableCodecs((err, codecs) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to get FFmpeg codecs' });
            }
            
            res.json({
              success: true,
              formats: Object.keys(formats).slice(0, 20), // Return first 20 formats
              codecs: Object.keys(codecs).slice(0, 20), // Return first 20 codecs
              message: 'FFmpeg info retrieved successfully'
            });
          });
        });
      });
    }).catch(err => {
      console.error('Failed to import child_process:', err);
      res.json({
        success: false,
        error: 'FFmpeg is not available',
        message: 'Please install FFmpeg to use video processing features',
        installCommand: 'brew install ffmpeg'
      });
    });
  } catch (error) {
    console.error('FFmpeg info error:', error);
    res.status(500).json({
      error: 'Failed to get FFmpeg info',
      details: error.message
    });
  }
});

// Proxy endpoint for external API calls (to handle CORS)
app.post('/api/proxy/*', async (req, res) => {
  try {
    const targetUrl = req.path.replace('/api/proxy/', '');
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers.authorization && { 'Authorization': req.headers.authorization }
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed',
      details: error.message 
    });
  }
});

// Serve the frontend for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Motion Live Photo Server running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`📤 Upload directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  
  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Created upload directory: ${uploadDir}`);
  }
});