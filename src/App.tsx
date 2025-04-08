import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FFMPEG_URL } from "@/lib/const";
import {
  Download,
  UploadIcon,
  FilePlus,
  Loader,
  Play,
  RotateCw,
  Upload,
  ChevronDown,
  Film,
  Video,
  ArrowRight,
  Image,
  Check,
  Copy,
  Trash2,
  ImageUpscale,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LivePhoto, LivePhotoIcon } from '@/components/LivePhoto';
import { resizeDimensions, humanFileSize } from '@/lib/utils';
import readMotion from "./lib/extractmotion";

interface MediaDimensions {
  width: number;
  height: number;
}

interface BlobUrl {
  url: string;
  size: number;
}

function App() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const [videoFile, setVideoFile] = useState<BlobUrl | null>(null);
  const [imageFile, setImageFile] = useState<BlobUrl | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<BlobUrl | null>(null);
  const [convertedImageUrl, setconvertedImageUrl] = useState<BlobUrl | null>(null);

  const [videoDimension, setVideoDimension] = useState<MediaDimensions | null>(null);
  const [imageDimension, setImageDimension] = useState<MediaDimensions | null>(null);
  const newVideoDimensions = useMemo(() => {
    return videoDimension ? resizeDimensions(videoDimension.width, videoDimension.height, 720, 960) : null;
  }, [videoDimension]);
  const newImageDimensions = useMemo(() => {
    return imageDimension ? resizeDimensions(imageDimension.width, imageDimension.height, 1008, 1344) : null;
  }, [imageDimension]);

  const [fileName, setfileName] = useState<string>("");
  const [picServer, setPicServer] = useState<string>("");
  const [picServerToken, setPicServerToken] = useState<string>("");
  const [mediaTab, setMediaTab] = useState("video");
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const isMotion = useMemo(() => !!(videoFile && imageFile), [videoFile, imageFile]);
  const isFileSelect = useMemo(() => !!(videoFile || imageFile), [videoFile, imageFile]);
  const converted = useMemo(() => !!(convertedVideoUrl || convertedImageUrl), [convertedVideoUrl, convertedImageUrl]);
  const [isCoreMT, setIsCoreMT] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFileSelect(files[0]),
    accept: {
      "video/*": [".mp4", ".jpg"],
    },
    multiple: false,
    disabled: loading, // Disable dropzone while loading
  });

  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    const { videoWidth, videoHeight } = videoRef.current;
    setVideoDimension({
      width: videoWidth,
      height: videoHeight,
    });
  };

  const onLoadedImage = () => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    setImageDimension({
      width: naturalWidth,
      height: naturalHeight,
    });
  }

  const onTabChange = (value: string) => {
    setMediaTab(value);
  }

  const handleLog = (e: any, flag: boolean): void => {
    const logContainer = logContainerRef.current;
    if (!logContainer?.textContent) return;
    e.stopPropagation();
    if (flag) {
      navigator.clipboard.writeText(logContainer.textContent);
      setCopied(true);
      setTimeout(() => {
        setCopied(false)
      }, 3000)
     } else setLogMessages([]);;
  };

  const handleDownload = (quene: any): void => {
    for (const mime in quene) {
      if (!quene[mime]) continue;
      const link = document.createElement("a");
      link.href = quene[mime];
      link.download = `${fileName}_new.${mime}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileSelect = (file: File): void => {
    // get file name
    const fullFileName = file.name;
    setfileName(fullFileName.replace(/\.[^/.]+$/, ""));
    // release existing object URL
    if (convertedVideoUrl) URL.revokeObjectURL(convertedVideoUrl.url);
    if (convertedImageUrl) URL.revokeObjectURL(convertedImageUrl.url);
    if (videoFile) URL.revokeObjectURL(videoFile.url);
    if (imageFile) URL.revokeObjectURL(imageFile.url);
    // clean log and error message
    setLogMessages([]);
    // clean file handler
    setConvertedVideoUrl(null);
    setconvertedImageUrl(null);
    setVideoFile(null);
    setImageFile(null);
    setVideoDimension(null);
    setImageDimension(null);
    // reset statment
    setProgress(0);
    setLoading(false);
    // check if motion photo or video file.
    if (fullFileName.endsWith('.jpg')) {
      readMotion(file).then(
        data => {
          setVideoFile(data[0]);
          setImageFile(data[1]);
          if (data[2].size > 0) setLogMessages((prev) => [...prev, ...data[2].url]);
        }, err => {
          toast({
            description: err,
          });
          setImageFile({url: URL.createObjectURL(file), size: file.size});
          setMediaTab("image");
        }
      );
    } else {
      setVideoFile({url: URL.createObjectURL(file), size: file.size});
      setMediaTab("video");
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    setProgress(0);
    const uploadFile: any = {jpg: convertedImageUrl, mov: convertedVideoUrl};
    for (const mime in uploadFile) {
      if (!uploadFile[mime]) continue;
      const formData = new FormData();
      const blob = await fetch(uploadFile[mime].url).then(r => r.blob());
      formData.append('file', blob, `${fileName}.${mime}`);
      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(e.loaded / e.total);
        });
        xhr.onload = () => {
          if (mime == "mov") setLoading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`HTTP error Status: ${xhr.status}`));
          };
        }
        xhr.onerror = () => {
          if (mime == "mov") setLoading(false);
          reject(new Error('Network error occurred'));
        };
      });
      xhr.open('POST', `${picServer}${fileName}.${mime}`, true);
      xhr.setRequestHeader('Authorization', picServerToken);
      xhr.setRequestHeader('Content-Type', blob.type);
      xhr.send(formData);
      uploadPromise;  // use await for single thread
    }
  }

  const load = async (mt: boolean = false) => {
    setLoading(true);
    const baseLib = FFMPEG_URL[mt ? "core_mt" : "core"];
    const setUrlProgress = ({ total: _total, received: _received }: {
      total: number;
      received: number;
    }) => {
      setProgress(Math.max(0, (_received / (_total > 0 ? _total : baseLib.size)) * 100));
    };
    const ffmpeg = ffmpegRef.current;
    ffmpeg.terminate();

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseLib.url}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${baseLib.url}/ffmpeg-core.wasm`,
          "application/wasm",
          true,
          setUrlProgress
        ),
        workerURL: mt ? await toBlobURL(
          `${baseLib.url}/ffmpeg-core.worker.js`,
          "text/javascript",
        ) : "",
      });
      setLoaded(true);
    } catch (err: any) {
      toast({
        description: `Failed to load converter: ${err}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const transcode = async () => {
    if (!isFileSelect) return;
    setLoading(true);
    setProgress(0);
    if (convertedImageUrl) URL.revokeObjectURL(convertedImageUrl.url);
    setconvertedImageUrl(null);
    if (convertedVideoUrl) URL.revokeObjectURL(convertedVideoUrl.url);
    setConvertedVideoUrl(null);

    const ffmpeg = ffmpegRef.current;

    
    // Listen to progress event instead of log.
    // progress event is experimental, be careful when using it
    // @ts-ignore
    const logListener = ({ message, type }) => {
      setLogMessages((prev) => [...prev, message]);
    }
    const progListener = ({ progress: prog }: {progress: number}) => {
      setProgress(Math.min(100, prog * 100));
    }
    ffmpeg.on("progress", progListener);
    ffmpeg.on("log", logListener);
    if (imageFile) {
      await ffmpeg.writeFile(
        "input.jpg",
        await fetchFile(imageFile.url),
      );
      try {
        await ffmpeg.exec([
          "-v",
          "level+info",
          "-i",
          "input.jpg",
          "-vf",
          "scale=min(1008\\,iw):min(1344\\,ih):force_original_aspect_ratio=decrease",
          "output.jpg",
        ]);

        const data = await ffmpeg.readFile("output.jpg");
        const imageBlob = new Blob([data], { type: "image/jpeg" });
        setconvertedImageUrl({url: URL.createObjectURL(imageBlob), size: imageBlob.size});
      } catch (e) {
        toast({
          description: `⚠️Error transcoding image: ${e}`,
        });
        await load(isCoreMT);
        setLoading(true);
      }
    }
    if (videoFile) {
      await ffmpeg.writeFile(
        "input.mp4",
        await fetchFile(videoFile.url),
      );
      try {
        await ffmpeg.exec([
          "-v",
          "level+info",
          "-i",
          "input.mp4",
          "-vf",
          "scale=min(720\\,iw):min(960\\,ih):force_original_aspect_ratio=decrease",
          ...["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"],
          "output.mov",
        ]);

        const data = await ffmpeg.readFile("output.mov");
        const blob = new Blob([data], { type: "video/quicktime" });
        setConvertedVideoUrl({url: URL.createObjectURL(blob), size: blob.size});
      } catch (e) {
        toast({
          description: `⚠️Error transcoding video: ${e}`,
        });
      }
    }
    ffmpeg.off("log", logListener);
    ffmpeg.off("progress", progListener);
    setLoading(false);
    toast({
      description: "Convert finished: try clicking on live photo tab.",
    });
    // if (!dimensions && (videoFile || imageFile)) {
    //   await ffmpeg.ffprobe(["-v", "error", "-select_streams", "v", "-show_entries", "stream=width\\,height", "-of", "csv=p=0:s=x",
    //     videoFile ? 'input.mp4' : 'input.jpg',
    //     "-o", "output.txt"
    //   ])
    // }
  };

  // Handle auto-scrolling logs
  useEffect(() => {
    const logContainer = logContainerRef.current;
    if (!logContainer || !shouldAutoScrollRef.current) return;

    logContainer.scrollTop = logContainer.scrollHeight;
  }, [logMessages]);

  // Check if user is scrolling up
  const handleScroll = () => {
    const logContainer = logContainerRef.current;
    if (!logContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    shouldAutoScrollRef.current = isNearBottom;
  };

  return (
    <div className="dark:bg-gray-800 flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[500px] p-4 dark:bg-gray-700 dark:text-white dark:border-gray-500">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Motion mp4 to Live mov Converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center dark:bg-gray-600 ${isDragActive
                  ? "bg-gray-200 border-blue-500 dark:bg-gray-500"
                  : "border-gray-300"
                }`}
            >
              <input {...getInputProps()} />
              <FilePlus className="h-6 w-6 text-gray-500 dark:text-white mb-2" />
              <p className="text-sm text-gray-500 dark:text-white text-center">
                {isDragActive
                  ? "Drop video or motion photo here..."
                  : "Drag and drop mp4/jpg, or click to select one"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 dark:text-black dark:border-gray-500"
                disabled={loading} // Disable the button while loading
              >
                <Upload className="h-4 w-4" />
                Select Media
              </Button>
            </div>

            <Tabs value={mediaTab} onValueChange={onTabChange} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="video" disabled={!videoFile}>
                  <code className="flex items-center gap-1">
                    <Video size={18} /> Video
                  </code>
                </TabsTrigger>
                <TabsTrigger value="image" disabled={!imageFile}>
                  <code className="flex items-center gap-1">
                    <Image size={18} /> Image
                  </code>
                </TabsTrigger>
                <TabsTrigger value="motion" disabled={!isMotion || !convertedImageUrl}>
                  <code className="flex items-center gap-1">
                  <LivePhotoIcon /> Live
                  </code>
                </TabsTrigger>
              </TabsList>
              <div className="mt-1 rounded-md">
                <TabsContent value="video" forceMount hidden={mediaTab !== "video"}>
                  <video
                    ref={videoRef}
                    src={videoFile?.url}
                    onLoadedMetadata={onLoadedMetadata}
                    controls
                    className="w-full aspect-video rounded-md mt-2 dark:bg-gray-900"
                  />
                </TabsContent>
                <TabsContent value="image" forceMount={true} hidden={mediaTab !== "image"}>
                  <img
                      ref={imgRef}
                      src={imageFile?.url}
                      className="dark:bg-gray-900"
                      onLoad={onLoadedImage}
                    />
                </TabsContent>
                <TabsContent value="motion">
                  <LivePhoto url={convertedImageUrl?.url} videoUrl={convertedVideoUrl?.url} />
                </TabsContent>
              </div>
            </Tabs>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t-2 border-dashed">
              {videoDimension && videoFile && (
                <>
                  <Badge className="rounded-full pl-1 gap-1.5">
                    <Film size={18} />
                    {humanFileSize(videoFile.size)}
                    <ArrowRight size={18} />
                    {convertedVideoUrl ? humanFileSize(convertedVideoUrl.size) : "??"}
                  </Badge>
                  <Badge className="rounded-full pl-1 gap-1.5">
                    <ImageUpscale size={18} />
                    {videoDimension.width}x{videoDimension.height}
                    <ArrowRight size={18} {...(convertedVideoUrl && {color: "#3e9392"})} />
                    {newVideoDimensions!.width}x{newVideoDimensions!.height}
                  </Badge>
                </>)
              }
              {imageDimension && imageFile && (
                <>
                  <Badge className="rounded-full pl-1 gap-1.5">
                    <Image size={18} />
                    {humanFileSize(imageFile.size)}
                    <ArrowRight size={18} />
                    {convertedImageUrl ? humanFileSize(convertedImageUrl.size) : "??"}
                  </Badge>
                  <Badge className="rounded-full pl-1 gap-1.5">
                    <ImageUpscale size={18} />
                    {imageDimension.width}x{imageDimension.height}
                    <ArrowRight size={18} {...(convertedImageUrl && {color: "#3e9392"})} />
                    {newImageDimensions!.width}x{newImageDimensions!.height}
                  </Badge>
                </>)
              }
          </div>

            <div className="flex items-center mt-4 space-x-2">
              <label
                htmlFor="multi-core-switch"
                className="text-sm font-medium dark:text-white"
              >
                Multithreading
              </label>
              <Switch
                id="multi-core-switch"
                checked={isCoreMT}
                onCheckedChange={(checked) => {
                  setIsCoreMT(checked);
                  setLoaded(false);
                  load(checked);
                }}
                disabled={loading || typeof SharedArrayBuffer !== "function"}
              />
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
              {!loaded && (
                <Button
                  variant="outline"
                  className="dark:text-black"
                  disabled={loading}
                  onClick={() => load(isCoreMT)}
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Load wasm
                    </>
                  )}
                </Button>
              )}
              <Button
                disabled={loading || !isFileSelect || !loaded}
                onClick={transcode}
                className="flex-1 dark:text-white"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCw className="h-4 w-4" />
                    FFmpeg
                  </>
                )}
              </Button>
              {(videoFile || imageFile) && (
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(convertedVideoUrl
                      ? {mov: convertedVideoUrl.url, jpg: convertedImageUrl?.url ?? imageFile?.url}
                      : {mp4: videoFile?.url, jpg: convertedImageUrl?.url ?? imageFile?.url}
                    )}
                    className={`dark:text-black ${isMotion && "rounded-r-none"}`}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" {...(converted && {color: "#3e9392"})} />
                    Download
                  </Button>
                  {isMotion && (<DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className={'rounded-l-none border-l-0 px-2'} disabled={loading}>
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDownload(convertedVideoUrl
                        ? {mov: convertedVideoUrl.url}
                        : {mp4: videoFile?.url}
                      )}><Film size={18} />Video</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(convertedImageUrl
                        ? {jpg: convertedImageUrl.url}
                        : {jpg: imageFile?.url})}><Image size={18} />Image</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>)}
                </div>
              )}
            </div>
            {loading && (
              <Progress value={progress} className="mt-2 dark:bg-white" />
            )}

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="upload">
              <AccordionTrigger className="dark:text-white">
                Fast Upload
              </AccordionTrigger>
              <AccordionContent>
              <form
                className="space-y-4 pt-2 mx-2"
                onSubmit={(e) => {e.preventDefault();handleUpload()}}
              >
                <label htmlFor="api-url">
                  API URL
                </label>
                <Input
                  id="api-url"
                  type="text"
                  placeholder="https://api.example.com/upload/{filename}"
                  value={picServer}
                  onChange={(e) => setPicServer(e.target.value)}
                  disabled={loading}
                  required
                />
                
                <label htmlFor="token">
                  Authorization Token
                </label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Bearer token123..."
                  value={picServerToken}
                  onChange={(e) => setPicServerToken(e.target.value)}
                  disabled={loading}
                  required
                />
                
                {/* Upload Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !isFileSelect}
                >
                  {loading ? (
                    <>
                      <UploadIcon className="mr-1 h-4 w-4 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-1 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </form>
              </AccordionContent>
              </AccordionItem>
              <AccordionItem value="log">
                <AccordionTrigger className="dark:text-white">
                  Click to show Logs
                  <div className="flex ml-auto mr-2 items-center gap-2 [&>svg]:rotate-none! [&>svg]:transition-colors">
                    <Trash2 size={16} role="button"
                      onClick={(e) => {handleLog(e, false)}}
                    />
                    {copied ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                    <Copy size={16}  role="button"
                      onClick={(e) => {handleLog(e, true)}}
                    />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    ref={logContainerRef}
                    onScroll={handleScroll}
                    className={`mt-2 rounded-md overflow-auto max-h-60 dark:border-gray-500 dark:bg-gray-900 dark:text-gray-200`}
                  >
                    {logMessages.map((message, index) => (
                      <pre key={index} className="p-2 text-sm">
                        {message}
                      </pre>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
