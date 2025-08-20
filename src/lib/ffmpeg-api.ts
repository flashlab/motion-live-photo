// Server API endpoints for FFmpeg operations
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:3000';

export interface FFmpegProcessOptions {
  outputFormat?: 'mp4' | 'gif';
  quality?: 'high' | 'medium' | 'low';
  width?: number;
  height?: number;
  startTime?: string;
  duration?: string;
  mute?: boolean;
  rotate?: string;
}

export interface FFmpegProcessResult {
  success: boolean;
  outputUrl?: string;
  filename?: string;
  error?: string;
  message?: string;
}

export class FFmpegAPIService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async processFile(file: File, options: FFmpegProcessOptions = {}): Promise<FFmpegProcessResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add options to form data
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const response = await fetch(`${this.baseUrl}/api/ffmpeg/process`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('FFmpeg API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process file'
      };
    }
  }

  async extractVideo(file: File): Promise<FFmpegProcessResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/ffmpeg/extract-video`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Video extraction error:', error);
      return {
        success: false,
        error: error.message || 'Failed to extract video'
      };
    }
  }

  async extractFrame(file: File, timestamp: string = '00:00:01'): Promise<FFmpegProcessResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', timestamp);

      const response = await fetch(`${this.baseUrl}/api/ffmpeg/extract-frame`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Frame extraction error:', error);
      return {
        success: false,
        error: error.message || 'Failed to extract frame'
      };
    }
  }

  async getFFmpegInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ffmpeg/info`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('FFmpeg info error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get FFmpeg info'
      };
    }
  }

  async uploadFile(file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  }

  async uploadMultipleFiles(files: File[]): Promise<any> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${this.baseUrl}/api/upload-multiple`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Multiple upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload files'
      };
    }
  }
}

// Create a singleton instance
export const ffmpegAPI = new FFmpegAPIService();