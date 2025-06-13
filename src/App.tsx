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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FFMPEG_URL } from "@/lib/const";
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
  ext: string;
  name: string;
  embed?: boolean;
}

import {
  Download,
  UploadIcon,
  Loader,
  Play,
  RotateCw,
  Upload,
  ChevronDown,
  Video,
  FileVideo2,
  ArrowRight,
  Aperture,
  FileImage,
  Trash2,
  ImageUpscale,
  SaveAll,
  CircleAlert,
  MoveHorizontal,
  MoveVertical,
  Infinity,
  RefreshCcwDot,
  Camera,
} from "lucide-react";

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

  const [videoFile, setVideoFile] = useState<BlobUrl | null>(null);
  const [imageFile, setImageFile] = useState<BlobUrl | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<BlobUrl | null>(null);
  const [convertedImageUrl, setconvertedImageUrl] = useState<BlobUrl | null>(null);
  const [captureStamp, setCaptureStamp] = useState<number>(-1);  //seconds
  const [extractStamp, setExtractStamp] = useState<number>(0);

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

  const isFileSelect = useMemo(() => !!(videoFile || imageFile), [videoFile, imageFile]);
  const [isConvert, setIsConvert] = useState(3);
  const [isUpload, setIsUpload] = useState(12);
  const [isExtractRaw, setisExtractRaw] = useState(1);
  const [isCoreMT, setIsCoreMT] = useState(false);
  const { toast } = useToast();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && handleFileSelect(files[0]),
    accept: {
      "video/*": [".mp4", ".mov", ".ogg", ".webm"],
      "image/*": [],
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
        const {name} = parseFileName(e.data.name);
        setImageFile({url: URL.createObjectURL(e.data.rawfile), name: name, size: e.data.rawfile.size, ext: "jpg"});
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
      link.download = `${media.name}.${media.ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileSelect = (file: File): void => {
    // get file name
    const {name, ext} = parseFileName(file.name);
    if (file.type.startsWith("video/")) {
      const newfile = URL.createObjectURL(file);
      if (videoRef.current) videoRef.current.src = newfile;
      setVideoFile({url: newfile, size: file.size, name: name, ext: ext});
      setLoading(false);
      setMediaTab("video");
      toast({
        description: "🚀 Video file loaded. ",
      });
    } else {
      setLoading(true);
      fileWorker.postMessage(file);
    }
  };

  const handleUpload = async () => {
    let uploadCount = 0;
    setLoading(true);
    setProgress(0);
    const uploadFile: (BlobUrl)[] = [imageFile, videoFile, convertedImageUrl, convertedVideoUrl].filter(
      (o, i): o is BlobUrl => o !== null && (isUpload & (2**i)) !== 0
    );
    for (const media of uploadFile) {
      const fullName = `${media.name}.${media.ext}`;
      const realEndPoint = endPoint.replace("{filename}", fullName);
      const blob = await fetch(media.url).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, fullName);
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
            description: `🚀 Uploaded: ${fullName}`,
          });
        })
        .catch((err) => {
          toast({
            description: `⚠️ Error uploading ${fullName}: ${err}`,
          });
        }).finally(() => {
          if (++uploadCount >= uploadFile.length) setLoading(false);
          setProgress(0);
        });
    }
  };

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
    ffexec({obj: (imageFile && (isConvert & 1) !== 0) ? imageFile : null, arg: 1},
           {obj: (videoFile && (isConvert & 2) !== 0) ? videoFile : null, arg: 2});
  };
  
  const extractjpg = async () => {
    ffexec({obj: null, arg: 0}, {obj: isExtractRaw == 2 ? convertedVideoUrl : videoFile, arg: 3})
  };

  const ffexec = async (img: { obj: BlobUrl | null; arg: number; }, film: { obj: BlobUrl | null; arg: number; }) => {
    if (!img.obj && !film.obj) return;
    setLoading(true);
    setProgress(0);

    const ffmpegArgs = [[
          "-loglevel",
          "quiet",
          "-i",
          "empty.webm",
          "empty.mp4"
        ], [
          "-v",
          "level+info",
          "-y",
          "-i",
          "input.jpg",
          "-vf",
          `scale=min(${maxDimensions[0]}\\,iw):min(${maxDimensions[1]}\\,ih):force_original_aspect_ratio=decrease`,
          "output.jpg",
        ], [
          "-v",
          "level+info",
          "-y",
          "-i",
          "input.mp4",
          ...["-vf", `scale=min(${maxDimensions[2]}\\,iw):min(${maxDimensions[3]}\\,ih):force_original_aspect_ratio=decrease`],
          ...["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"],
          ...keepAudio ? ["-acodec", "copy"] : ["-an"],
          "output.mov",
        ], [
          "-v",
          "level+info",
          "-y",
          "-i",
          "input.mp4",
          "-ss",
          `${extractStamp.toFixed(2)}`,
          "-frames:v",
          "1",
          "-update",
          "1",
          "extract.jpg"
        ]]
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
    if (img.obj) {
      await ffmpeg.writeFile(
        "input.jpg",
        await fetchFile(img.obj.url),
      );
      try {
        await ffmpeg.exec(ffmpegArgs[img.arg]);
        const data = await ffmpeg.readFile("output.jpg");
        const imageBlob = new Blob([data], { type: "image/jpeg" });
        setconvertedImageUrl({url: URL.createObjectURL(imageBlob), size: imageBlob.size, name: imageFile!.name+"_new", ext: "jpg"});
      } catch (e) {
        toast({
          description: `⚠️ Error transcoding image: ${e}, try to reload core`,
        });
        await load(isCoreMT);
        setLoading(true);
      }
    }
    if (film.obj) {
      await ffmpeg.writeFile(
        "input.mp4",
        await fetchFile(film.obj.url),
      );
      try {
        // pre excute with meaningless command to solve mp4-to-jpg error.
        await ffmpeg.exec(ffmpegArgs[0]);
        await ffmpeg.exec(ffmpegArgs[film.arg]);
        if (film.arg === 3) {
          const data = await ffmpeg.readFile("extract.jpg");
          const blob = new Blob([data], { type: "image/jpeg" });
          const newfile = URL.createObjectURL(blob);
          setImageFile({url: newfile, size: blob.size, name: film.obj.name, ext: "jpg"});
          setCaptureStamp(extractStamp);
        } else {
          const data = await ffmpeg.readFile("output.mov");
          const blob = new Blob([data], { type: "video/quicktime" });
          const newfile = URL.createObjectURL(blob);
          setConvertedVideoUrl({url: newfile, size: blob.size, name: film.obj.name, ext: "mov"});
          // use converted video if raw video broken
          if (videoRef.current && videoRef.current.readyState < HTMLMediaElement.HAVE_METADATA) videoRef.current.src = newfile;
        }
      } catch (e) {
        toast({
          description: `⚠️ Error transcoding video: ${e}, try to reload core`,
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
  };

  // Reused Components
  function PixBox({ children, labelid, index }: {children: React.ReactElement[], labelid: string, index: number}) {
    return (
      <div>
        <label htmlFor={labelid}>
          {children}
        </label>
        <Input
          id={labelid}
          type="number"
          onChange={(e) => onSetDimensions(e, index)}
          value={maxDimensions[index]}
        />
      </div>
    )
  };

  function DlOpt({ children, tar }: {children: React.ReactNode[], tar: BlobUrl|null}) {
    return (
      <DropdownMenuItem disabled={!tar} onClick={() => handleDownload([tar])}>
        {children}
      </DropdownMenuItem>
    )
  };

  function UpOpt({ children, disabled, index, tar, setter, ratio = false }:
    {children: React.ReactNode, disabled: boolean, index: number, tar: number,
     setter: React.Dispatch<React.SetStateAction<number>>, ratio?: boolean}) {
    return (
      <DropdownMenuCheckboxItem
        checked={(tar & index) !== 0}
        disabled={disabled}
        key={index}
        onCheckedChange={(checked) => {
          if (ratio) setter(index)
          else setter(checked ? tar | index : tar & ~index)
        }}
        // Prevent the dropdown menu from closing when the checkbox is clicked
        onSelect={(e) => e.preventDefault()}
      >
        {children}
      </DropdownMenuCheckboxItem>
    )
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

  useEffect(() => {
    // revoke both images if raw image updated
    return () => {
      if (imageFile) URL.revokeObjectURL(imageFile.url);
      setImageDimension(null)
      setconvertedImageUrl(null)
    };
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (convertedImageUrl) URL.revokeObjectURL(convertedImageUrl.url);
    };
  }, [convertedImageUrl]);

  useEffect(() => {
    // revoke both videos if raw video updated
    return () => {
      if (videoFile) URL.revokeObjectURL(videoFile.url);
      setVideoDimension(null)
      setConvertedVideoUrl(null)
    };
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (convertedVideoUrl) URL.revokeObjectURL(convertedVideoUrl.url);
    };
  }, [convertedImageUrl]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Card className="max-w-full md:max-w-[700px] mx-auto md:p-2 my-4">
        <CardHeader>
          <CardTitle className="flex justify-between">
            📸 Motion photo Playground
          <ModeToggle />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 [&_.lucide]:w-4 [&_.lucide]:h-4">
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center`}
            >
              <input {...getInputProps()} />
              <p className="text-sm text-center">
                {isDragActive
                  ? "Auto detect motion photo..."
                  : "Drag and drop to start, or click to select one"}
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
              <div className="flex flex-wrap justify-center gap-x-1 *:mt-2 text-xs text-black/50">
                <Badge variant="outline">mp4</Badge>
                <Badge variant="outline">mov</Badge>
                <Badge variant="outline">ogg</Badge>
                <Badge variant="outline">webm</Badge>
                <Badge variant="secondary">jpg</Badge>
                <Badge variant="secondary">png</Badge>
                <Badge variant="secondary">...</Badge>
              </div>
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
                    <Aperture size={18} /> Image
                  </code>
                </TabsTrigger>
                <TabsTrigger value="motion" disabled={!(videoFile && imageFile)}>
                  <code className="flex items-center gap-1">
                  <LivePhotoIcon /> Live
                  </code>
                </TabsTrigger>
              </TabsList>
              <div className="mt-1 rounded-md">
                <TabsContent value="video" forceMount className="data-[state=inactive]:hidden">
                  <video
                    ref={videoRef}
                    onLoadedMetadata={onLoadedMetadata}
                    onError={onVideoError}
                    controls
                    className="w-full aspect-video rounded-md mt-2"
                  />
                </TabsContent>
                <TabsContent value="image" forceMount className="data-[state=inactive]:hidden">
                  <img
                      ref={imgRef}
                      src={imageFile?.url}
                      onLoad={onLoadedImage}
                    />
                </TabsContent>
                <TabsContent value="motion">
                  <LivePhoto
                    url={convertedImageUrl?.url ?? imageFile?.url}
                    videoUrl={convertedVideoUrl?.url ?? videoFile?.url}
                    stamp={captureStamp}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <div id="meta_panel" className="grid gap-3 pt-4 m-0 border-t-2 border-dashed has-[div]:mb-4">
              {videoFile && (
                <>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <Video />
                    {humanFileSize(videoFile.size)}
                    <ArrowRight />
                    {convertedVideoUrl ? humanFileSize(convertedVideoUrl.size) : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <ImageUpscale />
                    {videoDimension ? `${videoDimension.width}x${videoDimension.height}` : "??"}
                    <ArrowRight {...(convertedVideoUrl && {color: "#3e9392"})} />
                    {newVideoDimensions ? `${newVideoDimensions.width}x${newVideoDimensions.height}` : "??"}
                  </Badge>
                </>
              )}
              {imageFile && (
                <>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <Aperture />
                    {humanFileSize(imageFile.size)}
                    <ArrowRight />
                    {convertedImageUrl ? humanFileSize(convertedImageUrl.size) : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full pl-1 gap-1.5 font-normal">
                    <ImageUpscale />
                    {imageDimension ? `${imageDimension.width}x${imageDimension.height}` : "??"}
                    <ArrowRight {...(convertedImageUrl && {color: "#3e9392"})} />
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
                  // load(checked);
                }}
                disabled={loading || typeof SharedArrayBuffer !== "function"}
              />
              <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="text-xs inline mr-3">
                          Multithread
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
                  <Button variant="outline" size="icon" className="h-6"><ImageUpscale /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-50 [&_.lucide]:w-4 [&_.lucide]:h-4">
                  <div className="grid gap-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-1">
                        <h4 className="font-medium leading-none">Scale</h4>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CircleAlert size={16} />
                            </TooltipTrigger>
                            <TooltipContent>Set max pixels, 0 to keep original</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Infinity
                        role="button"
                        onClick={() => setMaxDimensions([0, 0, 0, 0])}
                      />
                      <RefreshCcwDot
                        role="button"
                        onClick={() => setMaxDimensions(defaultDimension)}
                      />
                    </div>
                    <div className="grid gap-2 [&>div]:grid [&>div]:grid-cols-3 [&>div]:items-center [&>div]:gap-4
                                    [&_label]:flex [&_label]:gap-2 [&_input]:col-span-2 [&_input]:h-8">
                      <PixBox labelid="iwidth" index={0}>
                        <Aperture /><MoveHorizontal />
                      </PixBox>
                      <PixBox labelid="iheight" index={1}>
                        <Aperture /><MoveVertical />
                      </PixBox>
                      <PixBox labelid="vwidth" index={2}>
                        <Video /><MoveHorizontal />
                      </PixBox>
                      <PixBox labelid="vheight" index={3}>
                        <Video /><MoveVertical />
                      </PixBox>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover onOpenChange={(open: boolean) => {
                open && videoRef.current && setExtractStamp(videoRef.current.currentTime)
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-6"><Camera /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-50">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="leading-none font-medium">Snapshot</h4>
                      <p className="text-muted-foreground text-sm">
                        Extract image from video at position (s).
                      </p>
                    </div>
                    <div className="grid gap-3">
                      <Input
                        type="number"
                        step={0.1}
                        value={extractStamp}
                        onChange={(e) => setExtractStamp(e.target.valueAsNumber)}
                      />
                      <div className="flex">
                        <Button
                          disabled={loading || !isFileSelect || !loaded || isConvert == 0}
                          onClick={extractjpg}
                          className="flex-auto rounded-r-none"
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
                              Snapshot
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" className={'rounded-l-none border-l-0 px-2'} disabled={loading || !isFileSelect || !loaded}>
                              <ChevronDown />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <UpOpt disabled={!videoFile} index={1} tar={isExtractRaw} setter={setisExtractRaw} ratio={true}>Raw video</UpOpt>
                            <UpOpt disabled={!convertedVideoUrl} index={2} tar={isExtractRaw} setter={setisExtractRaw} ratio={true}>Converted video</UpOpt>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              <div className="inline-flex flex-auto">
                <Button
                  disabled={loading || !isFileSelect || !loaded || isConvert == 0}
                  onClick={transcode}
                  className="flex-auto rounded-r-none"
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className={'rounded-l-none border-l-0 px-2'} disabled={loading || !isFileSelect || !loaded}>
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <UpOpt disabled={!imageFile} index={1} tar={isConvert} setter={setIsConvert}>transcode image</UpOpt>
                    <UpOpt disabled={!videoFile} index={2} tar={isConvert} setter={setIsConvert}>transcode video</UpOpt>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isFileSelect && (<DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-auto"
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="dropdown-content-width-full">
                  {imageFile?.embed && (<DlOpt tar={imageFile}><Aperture />Extracted image</DlOpt>)}
                  {videoFile?.embed && (<DlOpt tar={videoFile}><Video />Extracted video</DlOpt>)}
                  <DlOpt tar={convertedImageUrl}><FileImage />Converted image</DlOpt>
                  <DlOpt tar={convertedVideoUrl}><FileVideo2 />Converted video</DlOpt>
                </DropdownMenuContent>
              </DropdownMenu>)}
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
                <div className="flex w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    type="submit"
                    className="flex-1 rounded-r-none"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={'rounded-l-none border-l-0 px-2'} disabled={loading || !isFileSelect}>
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <UpOpt disabled={!imageFile} index={1} tar={isUpload} setter={setIsUpload}>{imageFile?.embed ? "Embed" : "Raw"} image</UpOpt>
                      <UpOpt disabled={!videoFile} index={2} tar={isUpload} setter={setIsUpload}>{videoFile?.embed ? "Embed" : "Raw"} video</UpOpt>
                      <UpOpt disabled={!convertedImageUrl} index={4} tar={isUpload} setter={setIsUpload}>Converted image</UpOpt>
                      <UpOpt disabled={!convertedVideoUrl} index={8} tar={isUpload} setter={setIsUpload}>Converted video</UpOpt>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
