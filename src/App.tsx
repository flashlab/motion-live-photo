import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import ModeToggle from "@/components/mode-toggle";
import IconButton from "@/components/icon-btn";
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
  Trash2,
  ImageUpscale,
  SaveAll,
  CircleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { LivePhoto, LivePhotoIcon } from '@/components/LivePhoto';
import { resizeDimensions, humanFileSize, parseFileName } from '@/lib/utils';
import readMotion from "./lib/extractmotion";

interface MediaDimensions {
  width: number;
  height: number;
}

interface BlobUrl {
  url: string;
  size: number;
  filetype: string;
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
  const [endPoint, setendPoint] = useState<string>(localStorage.getItem('endPoint') ?? "");
  const [endPointToken, setendPointToken] = useState<string>(localStorage.getItem('endPointToken') ?? "");
  const [usePost, setUsePost] = useState(localStorage.getItem('usePost') === "true" ? true : false);
  const [keepAudio, setKeepAudio] = useState(localStorage.getItem('keepAudio') === "true" ? true : false);
  const [mediaTab, setMediaTab] = useState("video");
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

  const handleSaveConfig = async (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('endPoint', endPoint);
    localStorage.setItem('endPointToken', endPointToken);
    localStorage.setItem('usePost', usePost ? "true" : "false");
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
    if (ext === "jpg") {
      readMotion(file).then(
        data => {
          if (videoRef.current) videoRef.current.src = data[0].url;
          setVideoFile(data[0]);
          setImageFile(data[1]);
          if (data[2].size > 0) setLogMessages((prev) => [...prev, ...data[2].url]);
        }, err => {
          toast({
            description: err,
          });
          setImageFile({url: URL.createObjectURL(file), size: file.size, filetype: "jpg"});
          setMediaTab("image");
        }
      );
    } else {
      const newfile = URL.createObjectURL(file);
      if (videoRef.current) videoRef.current.src = newfile;
      setVideoFile({url: newfile, size: file.size, filetype: ext});
      setMediaTab("video");
    }
    toast({
      description: `🚀 ${!!(videoFile && imageFile) ? "Motion photo": "File"} loaded!`,
    });
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
            resolve();
          } else {
            reject(new Error(`HTTP error Status: ${xhr.status}`));
          };
        }
        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };
      });
      xhr.open(usePost ? 'POST' : 'PUT', `${realEndPoint}`, true);
      xhr.setRequestHeader('Authorization', endPointToken);
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
          "scale=min(1008\\,iw):min(1344\\,ih):force_original_aspect_ratio=decrease",
          "output.jpg",
        ]);

        const data = await ffmpeg.readFile("output.jpg");
        const imageBlob = new Blob([data], { type: "image/jpeg" });
        setconvertedImageUrl({url: URL.createObjectURL(imageBlob), size: imageBlob.size, filetype: "jpg"});
        toast({
          description: `🚀 Success convert image`,
        });
      } catch (e) {
        toast({
          description: `⚠️ Error transcoding image: ${e}`,
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
          ...["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"],
          ...keepAudio ? ["-acodec", "copy"] : ["-an"],
          "output.mov",
        ]);

        const data = await ffmpeg.readFile("output.mov");
        const blob = new Blob([data], { type: "video/quicktime" });
        const newfile = URL.createObjectURL(blob);
        setConvertedVideoUrl({url: newfile, size: blob.size, filetype: "mov"});
        if (!videoDimension) {
          if (videoRef.current) videoRef.current.src = newfile;
          const videoLogStart = logMessages.findIndex(v => /input\.mp4/.test(v));
          if (videoLogStart > 0) {
            const ffHWline = logMessages.slice(videoLogStart, videoLogStart + 20).find(v => /Stream.*?Video.*?,\s\d+x\d+,/.test(v));
            if (ffHWline) {
              const ffHW = ffHWline.match(/(\d+)x(\d+)/);
              if (ffHW) setVideoDimension({width: ffHW[1] as unknown as number, height: ffHW[2] as unknown as number})
            }
          }
        }
        toast({
          description: `🚀 Success convert video，try clicking on live photo tab.`,
        });
      } catch (e) {
        toast({
          description: `⚠️ Error transcoding video: ${e}`,
        });
        setProgress(0);
      }
    }
    ffmpeg.off("log", logListener);
    ffmpeg.off("progress", progListener);
    setLoading(false);
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
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Card className="max-w-full md:max-w-[700px] mx-auto md:p-2 my-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            Motion photo to Live photo Converter
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
                    onLoadedMetadata={onLoadedMetadata}
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
                  <LivePhoto url={convertedImageUrl?.url} videoUrl={convertedVideoUrl?.url} />
                </TabsContent>
              </div>
            </Tabs>

            <div id="meta_panel" className="grid gap-3 pt-4 m-0 border-t-2 border-dashed has-[div]:mb-4" >
              {videoFile && (
                <>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <Film size={18} />
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
              <label className="text-xs inline mr-3">
                Multithreading
              </label>

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
                        <Film size={18} />Video
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
                  <CircleAlert size={16} />
                </div>
                <Input
                  id="api-url"
                  type="text"
                  placeholder="https://api.abc.com/upload/{filename}"
                  value={endPoint}
                  onChange={(e) => setendPoint(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="flex justify-between items-center m-0">
                  <label htmlFor="token">
                    Authorization Token
                  </label>
                  <CircleAlert size={16} />
                </div>
                <Input
                  id="token"
                  type="password"
                  placeholder="Bearer token123..."
                  value={endPointToken}
                  onChange={(e) => setendPointToken(e.target.value)}
                  disabled={loading}
                  required
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
          <SiteFooter />
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}

export default App;
