import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {TooltipProvider, Tooltip, TooltipContent, TooltipTrigger} from "@/components/mobile-tooltip";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import ModeToggle from "@/components/mode-toggle";
import IconButton from "@/components/icon-btn";
import DropdownInput from "@/components/droplist-input";
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
  Video,
  ArrowRight,
  Image,
  Trash2,
  ImageUpscale,
  SaveAll,
  CircleAlert,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LivePhoto, LivePhotoIcon } from '@/components/LivePhoto';
import { resizeDimensions, humanFileSize, parseFileName } from '@/lib/utils';

interface MediaDimensions {
  width: number;
  height: number;
}

interface BlobUrl {
  url: string;
  size: number;
  filetype: string;
}

const fileWorker = new Worker(new URL('./lib/extractmotion.ts', import.meta.url), {type: "module"});

function App() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [mediaTab, setMediaTab] = useState("video");
  const loadStorageJson = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) ?? '') } catch(err) { return undefined }
  };

  const [fileName, setfileName] = useState<string>("");
  const [captureStamp, setCaptureStamp] = useState<number>(-1);
  const [videoFile, setVideoFile] = useState<BlobUrl | null>(null);
  const [imageFile, setImageFile] = useState<BlobUrl | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<BlobUrl | null>(null);
  const [convertedImageUrl, setconvertedImageUrl] = useState<BlobUrl | null>(null);

  const defaultDimension = [1008, 1344, 720, 960];
  const [maxDimensions, setMaxDimensions] = useState<number[]>(loadStorageJson("defaultDimension") ?? defaultDimension);
  const [videoDimension, setVideoDimension] = useState<MediaDimensions | null>(null);
  const [imageDimension, setImageDimension] = useState<MediaDimensions | null>(null);
  const newImageDimensions = useMemo(() => {
    return imageDimension ? resizeDimensions(imageDimension.width, imageDimension.height, maxDimensions[0], maxDimensions[1]) : null;
  }, [imageDimension, maxDimensions]);
  const newVideoDimensions = useMemo(() => {
    return videoDimension ? resizeDimensions(videoDimension.width, videoDimension.height, maxDimensions[2], maxDimensions[3]) : null;
  }, [videoDimension, maxDimensions]);

  const [serverConfig, setServerConfig] = useState<{url: string, token: string}[]>(loadStorageJson('serverConfig') ?? []);
  const [endPoint, setEndPoint] = useState<string>(serverConfig[0]?.url ?? "");
  const [endPointToken, setEndPointToken] = useState<string>(serverConfig[0]?.token ?? "");
  const [usePost, setUsePost] = useState(localStorage.getItem('usePost') === "true" ? true : false);
  const [keepAudio, setKeepAudio] = useState(localStorage.getItem('keepAudio') === "true" ? true : false);


  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const isMotion = useMemo(() => !!(videoFile && imageFile), [videoFile, imageFile]);
  const isFileSelect = useMemo(() => !!(videoFile || imageFile), [videoFile, imageFile]);
  const [isCoreMT, setIsCoreMT] = useState(false);
  const { toast } = useToast();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFileSelect(files[0]),
    accept: {
      "video/*": [".mp4", ".jpg"],
    },
    multiple: false,
    disabled: loading, // Disable dropzone while loading
  });

  fileWorker.onmessage = (e: MessageEvent) => {
    switch (e.data.type) {
      case "res":
        if (videoRef.current) videoRef.current.src = e.data.video.url;
        setVideoFile(e.data.video);
        setImageFile(e.data.image);
        setCaptureStamp(e.data.video.stamp/1000000);
        setLoading(false);
        toast({
          description: "🚀 Motion photo loaded.",
        });
        break;
      case "log":
        setLogMessages((prev) => [...prev, e.data.msg]);
        break;
      case "err":
        setImageFile({url: URL.createObjectURL(e.data.rawfile), size: e.data.rawfile.size, filetype: "jpg"});
        setMediaTab("image");
        setLoading(false);
        toast({
          description: `🚀 Image loaded, Not motion: ${e.data.msg}`,
        });
    };
  };

  fileWorker.onerror = () => {
    toast({
      description: `⚠️ Error while extracting motion photo.`,
    });
    setLoading(false);
  };

  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.src === videoFile?.url) {
      const { videoWidth, videoHeight } = videoRef.current;
      setVideoDimension({
        width: videoWidth,
        height: videoHeight,
      })
    } else if (!videoDimension) {
      // use log dimension if original video not loaded
      const videoLogStart = logMessages.findIndex(v => /input\.mp4/.test(v));
      if (videoLogStart > 0) {
        // Search for dimensions and rotaion in 25 next logs
        const videoLogSlice = logMessages.slice(videoLogStart, videoLogStart + 25);
        const ffHWline = videoLogSlice.find(v => /Stream.*?Video.*?,\s\d+x\d+,/.test(v));
        if (ffHWline) {
          const ffHW = ffHWline.match(/,\s(\d+)x(\d+),/);
          const isRotate = videoLogSlice.some((v) => /-90\.00\sdegrees/.test(v));
          if (ffHW)
            setVideoDimension({width: ffHW[isRotate ? 2 : 1] as unknown as number,
                              height: ffHW[isRotate ? 1 : 2] as unknown as number
          });
        };
      };
    }
  };

  const onVideoError = () => {
    toast({
      description: `⚠️ Error load video: codec not support? try transcode.`,
    });
  }

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

  const onSetDimensions = (e: ChangeEvent<HTMLInputElement>, n: number) => {
    setMaxDimensions(
      maxDimensions.map((c, i) => {return i === n ? e.target.value as unknown as number : c})
    )
  }

  const handleSaveConfig = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const configs = serverConfig;
    if (!!endPoint) {
      const newConfig = {url: endPoint, token: endPointToken};
      const matchIndex = configs.findIndex(o => o.url === endPoint);
      if (matchIndex > -1) configs.splice(matchIndex, 1);
      configs.unshift(newConfig);
      setServerConfig(configs);
    }
    
    localStorage.setItem('serverConfig', JSON.stringify(configs));
    localStorage.setItem('defaultDimension', JSON.stringify(maxDimensions));
    localStorage.setItem('usePost', usePost ? "true" : "false");
    localStorage.setItem('keepAudio', keepAudio ? "true" : "false");
    return Promise.resolve();
  }

  const handleLog = async (e: React.MouseEvent, flag: boolean) => {
    e.stopPropagation();
    const logContainer = logContainerRef.current;
    if (!logContainer?.textContent) return Promise.reject('empty log');
    if (flag) {
      try {
        await navigator.clipboard.writeText(logContainer.textContent);
      } catch(err) {
        toast({
          description: `⚠️ Error copy logs: ${err}`,
        });
        return Promise.reject(err);
      }
    } else setLogMessages([]);
    return Promise.resolve();
  };

  const handleDownload = (quene: Array<BlobUrl | null>): void => {
    for (const media of quene) {
      if (!media) continue;
      const link = document.createElement("a");
      link.href = media.url;
      link.download = `${fileName}_new.${media.filetype}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileSelect = (file: File): void => {
    // get file name
    const {name, ext} = parseFileName(file.name);
    setfileName(name);

    if (!imageFile || videoFile || ext === "jpg") {
      // Feel free to remove image related stuff
      if (convertedImageUrl) URL.revokeObjectURL(convertedImageUrl.url);
      if (imageFile) URL.revokeObjectURL(imageFile.url);
      setconvertedImageUrl(null);
      setImageFile(null);
      setImageDimension(null);
    }
    // release existing object URL
    if (convertedVideoUrl) URL.revokeObjectURL(convertedVideoUrl.url);
    if (videoFile) URL.revokeObjectURL(videoFile.url);
    
    // clean log and error message
    setLogMessages([]);
    // clean file handler
    setConvertedVideoUrl(null);
    setVideoFile(null);
    setVideoDimension(null);
    // reset statment
    setProgress(0);
    setLoading(false);
    // check if motion photo or video file.
    if (ext === "jpg") {
      setLoading(true);
      fileWorker.postMessage(file);
    } else {
      const newfile = URL.createObjectURL(file);
      if (videoRef.current) videoRef.current.src = newfile;
      setVideoFile({url: newfile, size: file.size, filetype: ext});
      setMediaTab("video");
      toast({
        description: "🚀 Video file loaded. ",
      });
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    setProgress(0);
    const uploadFile: (BlobUrl| null)[] = [convertedVideoUrl, convertedImageUrl];
    for (const media of uploadFile) {
      if (!media) continue;
      const realEndPoint = endPoint.replace("{filename}", `${fileName}.${media.filetype}`);
      const blob = await fetch(media.url).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, `${fileName}.${media.filetype}`);
      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
        });
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setLogMessages((prev) => [...prev, `${xhr.status} ${xhr.responseText}`]);
            resolve();
          } else {
            reject(new Error(`HTTP error Status: ${xhr.status} ${xhr.statusText}`));
          };
        }
        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };
      });
      xhr.open(usePost ? 'POST' : 'PUT', `${realEndPoint}`, true);
      if (endPointToken) xhr.setRequestHeader('Authorization', endPointToken);
      xhr.send(usePost ? formData : blob);
      uploadPromise
        .then(() => {
          toast({
            description: `🚀 Uploaded: ${fileName}.${media.filetype}`,
          });
        })
        .catch((err) => {
          toast({
            description: `⚠️ Error uploading ${fileName}.${media.filetype}: ${err}`,
          });
        }).finally(() => {
          if (media.filetype == "mov") setLoading(false);
          setProgress(0);
        });
    }
  }

  const load = async (mt: boolean = false) => {
    setLoading(true);
    const baseLib = FFMPEG_URL[mt ? "core_mt" : "core"];
    const setUrlProgress = ({ total: _total, received: _received }: {
      total: number;
      received: number;
    }) => {
      setProgress(Math.round((_received / (_total > 0 ? _total : baseLib.size)) * 100));
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
      toast({
        description: `🚀 Success loading ffmpeg core files`,
      });
    } catch (err: any) {
      toast({
        description: `⚠️ Failed to load converter: ${err}`,
      });
      setProgress(0);
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
      setProgress(Math.round(Math.min(100, prog * 100)));
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
          `scale=min(${maxDimensions[0]}\\,iw):min(${maxDimensions[1]}\\,ih):force_original_aspect_ratio=decrease`,
          "output.jpg",
        ]);

        const data = await ffmpeg.readFile("output.jpg");
        const imageBlob = new Blob([data], { type: "image/jpeg" });
        setconvertedImageUrl({url: URL.createObjectURL(imageBlob), size: imageBlob.size, filetype: "jpg"});
      } catch (e) {
        toast({
          description: `⚠️ Error transcoding image: ${e}, try again later`,
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
          `scale=min(${maxDimensions[2]}\\,iw):min(${maxDimensions[3]}\\,ih):force_original_aspect_ratio=decrease`,
          ...["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"],
          ...keepAudio ? ["-acodec", "copy"] : ["-an"],
          "output.mov",
        ]);

        const data = await ffmpeg.readFile("output.mov");
        const blob = new Blob([data], { type: "video/quicktime" });
        const newfile = URL.createObjectURL(blob);
        setConvertedVideoUrl({url: newfile, size: blob.size, filetype: "mov"});
        // use converted video if raw video broken
        if (videoRef.current && videoRef.current.readyState < HTMLMediaElement.HAVE_METADATA) videoRef.current.src = newfile;
      } catch (e) {
        toast({
          description: `⚠️ Error transcoding video: ${e}, try again later`,
        });
        setProgress(0);
      }
    }
    ffmpeg.off("log", logListener);
    ffmpeg.off("progress", progListener);
    setLoading(false);
    toast({
      description: `🚀 Finish transcoding，try clicking on live photo tab.`,
    });
    // if (!dimensions && (videoFile || imageFile)) {
    //   await ffmpeg.ffprobe(
    // ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width\\,height", "-of", "csv=p=0:s=x",
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
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Card className="max-w-full md:max-w-[700px] mx-auto md:p-2 my-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            Motion photo Parser Tool
          <ModeToggle />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center`}
            >
              <input {...getInputProps()} />
              <FilePlus className="h-6 w-6 mb-2" />
              <p className="text-sm text-center">
                {isDragActive
                  ? "Drop video or motion photo here..."
                  : "Drag and drop mp4/jpg, or click to select one"}
              </p>
              <Button
              variant="outline"
                size="sm"
                className="mt-2"
                disabled={loading} // Disable the button while loading
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Select Media
                  </>
                )}
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
                    onLoadedMetadata={onLoadedMetadata}
                    onError={onVideoError}
                    controls
                    className="w-full aspect-video rounded-md mt-2"
                  />
                </TabsContent>
                <TabsContent value="image" forceMount={true} hidden={mediaTab !== "image"}>
                  <img
                      ref={imgRef}
                      src={imageFile?.url}
                      onLoad={onLoadedImage}
                    />
                </TabsContent>
                <TabsContent value="motion">
                  <LivePhoto url={convertedImageUrl?.url} videoUrl={convertedVideoUrl?.url} stamp={captureStamp} />
                </TabsContent>
              </div>
            </Tabs>

            <div id="meta_panel" className="grid gap-3 pt-4 m-0 border-t-2 border-dashed has-[div]:mb-4" >
              {videoFile && (
                <>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <Video size={18} />
                    {humanFileSize(videoFile.size)}
                    <ArrowRight size={18} />
                    {convertedVideoUrl ? humanFileSize(convertedVideoUrl.size) : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <ImageUpscale size={18} />
                    {videoDimension ? `${videoDimension.width}x${videoDimension.height}` : "??"}
                    <ArrowRight size={18} {...(convertedVideoUrl && {color: "#3e9392"})} />
                    {newVideoDimensions ? `${newVideoDimensions.width}x${newVideoDimensions.height}` : "??"}
                  </Badge>
                </>)
              }
              {imageFile && (
                <>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <Image size={18} />
                    {humanFileSize(imageFile.size)}
                    <ArrowRight size={18} />
                    {convertedImageUrl ? humanFileSize(convertedImageUrl.size) : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <ImageUpscale size={18} />
                    {imageDimension ? `${imageDimension.width}x${imageDimension.height}` : "??"}
                    <ArrowRight size={18} {...(convertedImageUrl && {color: "#3e9392"})} />
                    {newImageDimensions ? `${newImageDimensions.width}x${newImageDimensions.height}` : "??"}
                  </Badge>
                </>)
              }
          </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={isCoreMT}
                onCheckedChange={(checked) => {
                  setIsCoreMT(checked);
                  setLoaded(false);
                  load(checked);
                }}
                disabled={loading || typeof SharedArrayBuffer !== "function"}
              />
              <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="text-xs inline mr-3">
                          Multithreading
                        </label>
                      </TooltipTrigger>
                      <TooltipContent>
                        Multi-threaded core is faster, but unstable and not supported by all browsers.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

              <Switch
                checked={keepAudio}
                onCheckedChange={(checked) => {
                  setKeepAudio(checked);
                  localStorage.setItem('keepAudio', checked ? "true" : "false");
                }}
                disabled={loading}
              />
              <label className="text-xs inline">
                Keep Audio
              </label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-6"><ImageUpscale size={18} /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-50">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Dimensions</h4>
                      <RotateCcw
                        size={20} 
                        className="absolute right-2 top-4"
                        role="button"
                        onClick={() => setMaxDimensions(defaultDimension)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Set max pixels for the new media.
                      </p>
                    </div>
                    <div className="grid gap-2 [&>div]:grid [&>div]:grid-cols-3 [&>div]:items-center [&>div]:gap-4
                                    [&_label]:flex [&_label]:gap-2 [&_input]:col-span-2 [&_input]:h-8">
                      <div>
                        <label htmlFor="iwidth"><Image size={22} /> <MoveHorizontal size={22} /></label>
                        <Input
                          id="iwidth"
                          type="number"
                          onChange={(e) => onSetDimensions(e, 0)}
                          value={maxDimensions[0]}
                        />
                      </div>
                      <div>
                        <label htmlFor="iheight"><Image size={22} /> <MoveVertical size={22} /></label>
                        <Input
                          id="iheight"
                          type="number"
                          onChange={(e) => onSetDimensions(e, 1)}
                          value={maxDimensions[1]}
                        />
                      </div>
                      <div>
                        <label htmlFor="vwidth"><Video size={22} /> <MoveHorizontal size={22} /></label>
                        <Input
                          id="vwidth"
                          type="number"
                          onChange={(e) => onSetDimensions(e, 2)}
                          value={maxDimensions[2]}
                        />
                      </div>
                      <div>
                        <label htmlFor="vheight"><Video size={22} /> <MoveVertical size={22} /></label>
                        <Input
                          id="vheight"
                          type="number"
                          onChange={(e) => onSetDimensions(e, 3)}
                          value={maxDimensions[3]}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
              {!loaded && (
                <Button
                  variant="outline"
                  size="sm"
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
                className="flex-auto"
                size="sm"
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
                <div className="inline-flex items-center flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload([convertedVideoUrl ?? videoFile,
                                                   convertedImageUrl ?? imageFile])}
                    className={`flex-auto ${isMotion && "rounded-r-none"}`}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  {isMotion && (<DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={'rounded-l-none border-l-0 px-2'} disabled={loading}>
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDownload([convertedVideoUrl ?? videoFile])}>
                        <Video size={18} />Video
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload([convertedImageUrl ?? imageFile])}>
                        <Image size={18} />Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>)}
                </div>
              )}
            </div>
            <div className="w-full flex items-center justify-center gap-3 mt-2">
              <Progress value={progress} className="flex-auto" />
              <span className="text-xs w-9">{progress}%</span>
            </div>

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="upload">
              <AccordionTrigger>
                Fast Upload
                <div className="flex ml-auto mr-2 items-center gap-2">
                  <IconButton 
                    onAction={handleSaveConfig}
                    icon={SaveAll}
                    actionLabel="Save"
                    successLabel="Saved"
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent>
              <form
                className="space-y-4 pt-2 mx-2 [&_*]:text-xs"
                onSubmit={(e) => {e.preventDefault();handleUpload()}}
              >
                <div className="flex justify-between items-center m-0">
                  <label htmlFor="api-url">
                    API URL
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert size={16} />
                      </TooltipTrigger>
                      <TooltipContent>Use <code>{`{filename}`}</code> to represent file name in url</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                </div>
                <DropdownInput
                  required
                  id="api-url"
                  value={endPoint}
                  placeholder="https://api.abc.com/upload/{filename}" 
                  options={serverConfig.map(({url}, i) => ({id: i, label: url}))}
                  onDelete={(i) => setServerConfig(serverConfig.filter((_v, index) => index !== i))}
                  onChange={(s) => setEndPoint(s)}
                  onSelect={(o) => {
                    setEndPoint(o.label);
                    setEndPointToken(serverConfig[o.id].token);
                  }}
                />
                <div className="flex justify-between items-center m-0">
                  <label htmlFor="token">
                    Authorization Token
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleAlert size={16} />
                      </TooltipTrigger>
                      <TooltipContent>Authorization key value in request header</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="token"
                  type="password"
                  placeholder="Bearer token123..."
                  value={endPointToken}
                  onChange={(e) => setEndPointToken(e.target.value)}
                />
                <div className="flex items-center mt-4 space-x-2">
                  <Switch
                    id="upload-method-switch"
                    checked={usePost}
                    onCheckedChange={(checked) => { setUsePost(checked) }}
                    disabled={loading}
                  />
                  <label htmlFor="upload-method-switch">
                    {usePost ? "POST" : "PUT"} Method
                  </label>
                </div>

                <Button
                  variant="outline"
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
                <AccordionTrigger>
                  Click to show Logs
                  <div className="flex ml-auto mr-2 items-center gap-2">
                    <Trash2 size={16} role="button"
                      onClick={(e) => {handleLog(e, false)}}
                    />
                    <IconButton 
                      onAction={handleLog}
                      actionParams={true}
                      actionLabel="Copy"
                      successLabel="Copied"
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    ref={logContainerRef}
                    onScroll={handleScroll}
                    className={`mt-2 rounded-md overflow-auto max-h-60 overscroll-auto md:overscroll-contain`}
                  >
                    <pre className="p-2 text-sm">
                      {logMessages.join("\n")}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
          <SiteFooter />
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}

export default App;
