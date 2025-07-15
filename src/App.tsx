import { ChangeEvent, ClipboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/mobile-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import ModeToggle from "@/components/mode-toggle";
import IconButton from "@/components/icon-btn";
import DropdownInput from "@/components/droplist-input";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { LivePhoto, LivePhotoIcon, defaultXmpString } from '@/components/LivePhoto';
import { PixBox, InputBtn, UpOpt } from '@/components/widget';
import { useToast } from "@/hooks/use-toast";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { FFMPEG_URL } from "@/lib/const";
import { resizeDimensions, humanFileSize, parseFileName } from '@/lib/utils';

interface MediaDimensions {
  width: number;
  height: number;
}

interface BlobUrl {
  blob: File;
  url: string;
  ext: string;
  tag: string;
}

interface RequestParam {
  key: string;
  value: string;
}

interface SvrConfig {
  url: string;
  headers: RequestParam[];
  bodys: RequestParam[];
  post: boolean;
}

import {
  Download,
  UploadIcon,
  Loader,
  Route,
  RotateCw,
  Upload,
  ChevronDown,
  Video,
  ArrowRight,
  Aperture,
  Trash2,
  ImageUpscale,
  SaveAll,
  CircleAlert,
  MoveHorizontal,
  MoveVertical,
  Infinity,
  Camera,
  Clapperboard,
  FlagTriangleLeft,
  FlagTriangleRight,
  Plus,
  Languages,
  SquarePen,
} from "lucide-react";

let fileWorker: Worker | null = null;

function App() {
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [mediaTab, setMediaTab] = useState("video");
  const loadStorageJson = (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) ?? '') } catch (err) { return undefined }
  };

  const [videoFile, setVideoFile] = useState<BlobUrl | null>(null);
  const [imageFile, setImageFile] = useState<BlobUrl | null>(null);
  const [motionPhoto, setMotionPhoto] = useState<BlobUrl | null>(null);
  const [convertedMotionPhoto, setConvertedMotionPhoto] = useState<BlobUrl | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<BlobUrl | null>(null);
  const [convertedImageUrl, setconvertedImageUrl] = useState<BlobUrl | null>(null);

  const [captureStamp, setCaptureStamp] = useState<number>(-1);  //seconds
  const [extractStamp, setExtractStamp] = useState<number>(0);
  const [beginStamp, setBeginStamp] = useState<number>(NaN);
  const [stopStamp, setStopStamp] = useState<number>(NaN);
  const [xmpString, setXmpString] = useState<string>('');

  const defaultDimension = [1008, 1344, 720, 960];
  const [maxDimensions, setMaxDimensions] = useState<number[]>(loadStorageJson("defaultDimension") ?? defaultDimension);
  const [videoDimension, setVideoDimension] = useState<MediaDimensions | null>(null);
  const [imageDimension, setImageDimension] = useState<MediaDimensions | null>(null);
  const newImageDimensions = useMemo(() => {
    return imageDimension ? resizeDimensions(imageDimension.width, imageDimension.height, maxDimensions?.at(0) || 0, maxDimensions?.at(1) || 0) : null;
  }, [imageDimension, maxDimensions]);
  const newVideoDimensions = useMemo(() => {
    return videoDimension ? resizeDimensions(videoDimension.width, videoDimension.height, maxDimensions?.at(2) || 0, maxDimensions?.at(3) || 0) : null;
  }, [videoDimension, maxDimensions]);

  const [serverConfig, setServerConfig] = useState<SvrConfig[]>(loadStorageJson('serverConfig') ?? []);
  const [endPoint, setEndPoint] = useState<string>(serverConfig?.at(0)?.url ?? "");
  const [endPointHeader, setEndPointHeader] = useState<RequestParam[]>(serverConfig?.at(0)?.headers ?? []);
  const [endPointHeaderKey, setEndPointHeaderKey] = useState<string>(endPointHeader?.at(0)?.key ?? "");
  const [endPointHeaderValue, setEndPointHeaderValue] = useState<string>(endPointHeader?.at(0)?.value ?? "");
  const [endPointBody, setEndPointBody] = useState<RequestParam[]>(serverConfig?.at(0)?.bodys ?? [{ key: "file", value: "{File}" }]);
  const [endPointBodyKey, setEndPointBodyKey] = useState<string>(endPointBody?.at(0)?.key ?? "");
  const [endPointBodyValue, setEndPointBodyValue] = useState<string>(endPointBody?.at(0)?.value ?? "");
  const [usePost, setUsePost] = useState<boolean>(serverConfig?.at(0)?.post ?? false);
  const [keepAudio, setKeepAudio] = useState(localStorage.getItem('keepAudio') === "true" ? true : false);
  const [isCoreMT, setIsCoreMT] = useState(localStorage.getItem('isCoreMT') === "true" ? true : false);

  const defaultXmp = {hasXmp: false, hasExtraXmp: false, xmp: defaultXmpString};
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const motionXmpRef = useRef(defaultXmp);

  const videoTypes = ["mp4", "mov", "webm"];
  const videoMimeTypes = ["video/mp4", "video/quicktime", "video/webm"];
  const subVideoTypes = videoTypes.slice(0, 2); // mp4 and mov
  const imageTypes = ["jpg", "png"];
  const isFileSelect = useMemo(() => !!(videoFile || imageFile), [videoFile, imageFile]);
  const [coreLoad, setCoreLoad] = useState(false);
  const [loading, setLoading] = useState(0); // 0: idle, 1: download wasm, 2: parsing image, 4: ffmpeg, 8: uploading
  const [convertedVideoExt, setConvertedVideoExt] = useState(0); // 0: mp4, 1: mov, 2: webm
  const [isConvert, setIsConvert] = useState(3); // 1: image, 2: video, 3: both
  const [isUpload, setIsUpload] = useState(0); // 1: image, 2: video, 4: converted image, 8: converted video, 16: motion photo, 32: converted motion photo
  const [isExtractRaw, setisExtractRaw] = useState(1); // 1: extract from raw, 2: extract from converted, 4: only stamp change
  const { t, i18n: { changeLanguage, language } } = useTranslation();
  const [currLang, setCurrLang] = useState(language)
  const { toast } = useToast();
  const { getRootProps, getInputProps, open, isDragActive, isDragAccept, isDragReject, inputRef } = useDropzone({
    onDrop: (files) => files[0] && handleFileSelect(files[0]),
    accept: {
      "video/*": [],
      "image/*": [],
    },
    multiple: false,
    noClick: true,
    disabled: (loading & 2) !== 0, // Disable dropzone while parsing image
  });

  const parseImageFile = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const { name, ext } = parseFileName(file.name);
      const isHeif = ['heic', 'heif'].includes(ext) || file.type === 'image/heic' || file.type === 'image/heif';
      if (isHeif) {
        // heic to jpeg
        setLogMessages(prev => [...prev, `📣 HEIC image detected, converting to JPEG...`]);
        import('heic-to').then(({ heicTo }) => {
          // TODO: Customize Heic-to params.
          heicTo({ blob: file, type: 'image/jpeg', quality: 0.8 }).then((blob) => {
            setImageFile({
              blob: new File([blob], name + '_heic.jpg'),
              url: URL.createObjectURL(blob),
              ext: "jpg",
              tag: 'heicDerived',
            });
            setMediaTab("image");
            resolve(t('toast.heicDone'));
          }).catch((err) => {
            setLogMessages(prev => [...prev, `❌ HEIC image ${err}`]);
            reject(new Error(`HEIC image`));
          });
        });
      } else {
        motionWorker(file).then((data: any) => {
          motionXmpRef.current = {
            hasXmp: data.hasXmp,
            hasExtraXmp: data.hasExtraXmp,
            xmp: data.xmp || defaultXmpString,
          };
          setImageFile({ blob: data.image, url: URL.createObjectURL(data.image), ext: 'jpg', tag: 'embed' });
          setVideoFile({ blob: data.video, url: URL.createObjectURL(data.video), ext: 'mp4', tag: 'embed' });
          setMotionPhoto({ blob: file, url: URL.createObjectURL(file), ext: "jpg", tag: 'motion'});
          setCaptureStamp(data.video.stamp);
          setMediaTab("video");
          resolve(t('toast.motionLoad'));
        }).catch((err: any) => {
          setLogMessages(prev => [...prev, `❌ Motion image ${err}`]);
          reject(new Error(`Motion image`))
        })
      }
    })
  }

  const cleanMotion = (): void => {
    // reset motionXmpRef except xmp
    const { xmp, ...resetKeys } = defaultXmp;
    motionXmpRef.current = {...motionXmpRef.current, ...resetKeys};
    // clean object
    if (motionPhoto) URL.revokeObjectURL(motionPhoto.url);
    if (convertedMotionPhoto) URL.revokeObjectURL(convertedMotionPhoto.url);
    setMotionPhoto(null);
    setConvertedMotionPhoto(null);
  }

  const motionWorker = (file: any) => {
    return new Promise((resolve, reject) => {
      if (!fileWorker) {
        // Initialize worker if not already done
        fileWorker = new Worker(new URL('./lib/extractmotion.ts', import.meta.url), { type: "module" });
      }
      fileWorker.onmessage = (e: MessageEvent) => {
        switch (e.data.type) {
          case "res":
            resolve(e.data);
            break;
          case "log":
            setLogMessages(prev => [...prev, e.data.msg]);
            break;
          case "err":
            setLogMessages(prev => [...prev, e.data.msg]);
            reject(new Error(`motion photo`));
        };
      };

      fileWorker.onerror = (err) => {
        setLogMessages(prev => [...prev, `❌ worker module ${err.message}`]);
        reject(new Error(`worker module`));
      };
      fileWorker.postMessage(file);
    })
  }

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
      const videoLogStart = logMessages.findIndex(v => new RegExp(`input\.${videoFile!.ext}`).test(v));
      if (videoLogStart > 0) {
        // Search for dimensions and rotaion in 25 next logs
        const videoLogSlice = logMessages.slice(videoLogStart, videoLogStart + 25);
        const ffHWline = videoLogSlice.find(v => /Stream.*?Video.*?,\s\d+x\d+,/.test(v));
        if (ffHWline) {
          const ffHW = ffHWline.match(/,\s(\d+)x(\d+),/);
          const isRotate = videoLogSlice.some((v) => /-90\.00\sdegrees/.test(v));
          if (ffHW)
            setVideoDimension({
              width: ffHW[isRotate ? 2 : 1] as unknown as number,
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
      maxDimensions.map((c, i) => { return i === n ? e.target.value as unknown as number : c })
    )
  }

  const handleSaveConfig = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const configs = serverConfig;
    if (!!endPoint) {
      const newConfig = { url: endPoint, headers: endPointHeader, bodys: endPointBody, post: usePost };
      const matchIndex = configs.findIndex(o => o.url === endPoint);
      if (matchIndex > -1) configs.splice(matchIndex, 1);
      configs.unshift(newConfig);
      setServerConfig(configs);
    }

    localStorage.setItem('serverConfig', JSON.stringify(configs));
    return Promise.resolve();
  }

  const handleLog = async (e: React.MouseEvent, flag: boolean) => {
    e.stopPropagation();
    const logContainer = logContainerRef.current;
    if (!logContainer?.textContent) return Promise.reject('empty log');
    if (flag) {
      try {
        await navigator.clipboard.writeText(logContainer.textContent);
      } catch (err: any) {
        setLogMessages(prev => [...prev, `❌ ${t('toast.err.copyLogs')} ${err.message}`]);
        toast({
          description: t('toast.err.copyLogs'),
        });
        return Promise.reject(err);
      }
    } else setLogMessages([]);
    return Promise.resolve();
  };

  const handleI18n = () => {
    const newLang = currLang === "en" ? "zh" : "en";
    setCurrLang(newLang);
    changeLanguage(newLang);
  }
  const handleDownload = (media: BlobUrl): void => {
    // TODO: Generate motion photo.
    const link = document.createElement("a");
    link.href = media.url;
    link.download = media.blob.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRename = (media: BlobUrl, index: number): void => {
    let newName = prompt(t('title.rename'), media.blob.name.replace(/(\.[^.]+)?$/, ""));
    const setter = [setImageFile, setVideoFile, setconvertedImageUrl, setConvertedVideoUrl][index];
    if (!newName) return;
    newName = newName.trim().replace(/[\\/:"*?<>|]/g, ''); // Remove illegal characters
    if (newName !== "") {
      setter(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          blob: new File([prev.blob], `${newName}.${media.ext}`, { type: prev.blob.type }),
          url: prev.url, // keep the old url, or regenerate if needed
        };
      });
      toast({
        description: t('toast.renamed') + `${newName}.${media.ext}`,
      });
    }
  }

  const handleFileSelect = async (file: File) => {
    // get file name
    const { ext } = parseFileName(file.name);
    const mime = file.type;
    // console.log(mime);
    if (mime.startsWith("video/")) {
      setVideoFile({ blob: file, url: URL.createObjectURL(file), ext: ext, tag: 'raw' });
      setXmpString(prev => fixXmp(prev, file.size));
      setMediaTab("video");
      toast({
        description: t('toast.videoLoad'),
      });
    } else if (mime.startsWith("image/")) {
      setLoading(prev => prev | 2);
      cleanMotion();
      parseImageFile(file).then((msg) => {
        toast({
          description: msg,
        });
      }).catch((err: any) => {
        // If not motion photo, load as image.
        setImageFile({ blob: file, url: URL.createObjectURL(file), ext: ext, tag: 'raw' });
        setMediaTab("image");
        toast({
          description: t('toast.err.load') + err.message + t('toast.err.checkLogs'),
        });
      }).finally(() => {
        setLoading(prev => prev & ~2);
      });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    let uploadCount = 0;
    setProgress(0);
    const uploadFile: (BlobUrl)[] = [imageFile, videoFile, convertedImageUrl, convertedVideoUrl, motionPhoto, convertedMotionPhoto].filter(
      (o, i): o is BlobUrl => o !== null && (isUpload & (2 ** i)) !== 0
    );
    for (const media of uploadFile) {
      setLoading(prev => prev | 8);
      const realEndPoint = endPoint.replace("{filename}", media.blob.name);
      const formData = new FormData();
      for (const body of endPointBody) {
        if (body.value === "{File}") formData.append(body.key, media.blob, media.blob.name);
        else formData.append(body.key, body.value);
      }
      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
        });
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setLogMessages(prev => [...prev, `🚩 ${xhr.status} ${xhr.responseText}`]);
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
      for (const header of endPointHeader) {
        xhr.setRequestHeader(header.key, header.value);
      }
      xhr.send(usePost ? formData : media.blob);
      uploadPromise
        .then(() => {
          setLogMessages(prev => [...prev, t('toast.upload') + media.blob.name]);
          toast({
            description: t('toast.upload') + media.blob.name,
          });
        })
        .catch((err) => {
          setLogMessages(prev => [...prev, `❌ Error uploading ${media.blob.name}: ${err}`]);
          toast({
            description: `⚠️ Error uploading ${media.blob.name}`,
          });
        }).finally(() => {
          if (++uploadCount >= uploadFile.length) setLoading(prev => prev & ~8);
          setProgress(0);
        });
    }
  };

  const handlePasteFile = async (event: ClipboardEvent<HTMLInputElement>) => {
    if (!inputRef.current) return;
    if (event.clipboardData?.files) {
      (inputRef.current as unknown as HTMLInputElement).files =
        event.clipboardData.files;
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const handleCreateMotion = async () => {
    setLoading(prev => prev | 2);
    motionWorker({
      ...motionXmpRef.current,
      xmp: xmpString,  // use textArea value.
      image: motionPhoto?.blob ?? convertedImageUrl?.blob ?? imageFile?.blob,
      video: convertedVideoUrl?.blob ?? videoFile?.blob,
    }).then((data: any) => {
      setConvertedMotionPhoto({blob: data.file, url: URL.createObjectURL(data.file), ext: "jpg", tag: 'newMotion' })
      toast({
        description: '🚀 Success create motion photo, click download button.',
      });
    }).catch(() => {
      toast({
        description: '❌ Error create motion photo, check logs for detail.',
      });
    }).finally(() => {
        setLoading(prev => prev & ~2);
      })
  }

  const loadWasm = () => {
    setLoading(prev => prev | 1);

    loadFFmpeg().then(() => {
      setCoreLoad(true);
      toast({
        description: `🚀 Success loading ffmpeg core files`,
      });
    }).catch((err) => {
      setProgress(0);
      setLogMessages(prev => [...prev, `❌ Error loading ffmpeg core files: ${err}`]);
      toast({
        description: `⚠️ Failed to load ffmpeg wasm`,
      })
    }).finally(() => {
      setLoading(prev => prev & ~1);
    });
  };

  const loadFFmpeg = async (): Promise<boolean> => {
    const ffmpeg = ffmpegRef.current;
    ffmpeg.terminate();
    const baseLib = FFMPEG_URL[isCoreMT ? "core_mt" : "core"];
    const setUrlProgress = ({ total: _total, received: _received }: {
      total: number;
      received: number;
    }) => {
      setProgress(Math.round((_received / (_total > 0 ? _total : baseLib.size)) * 100));
    };
    return ffmpeg.load({
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
      workerURL: isCoreMT ? await toBlobURL(
        `${baseLib.url}/ffmpeg-core.worker.js`,
        "text/javascript",
      ) : "",
    })
  }

  const transcode = async () => {
    setLoading(prev => prev | 4);
    localStorage.setItem('defaultDimension', JSON.stringify(maxDimensions));
    localStorage.setItem('keepAudio', keepAudio ? "true" : "false");
    localStorage.setItem('isCoreMT', isCoreMT ? "true" : "false");
    ffexec({ obj: (imageFile && (isConvert & 1) !== 0) ? imageFile : null, arg: 1 },
      { obj: (videoFile && (isConvert & 2) !== 0) ? videoFile : null, arg: 2 });
  };

  const extractjpg = async () => {
    if (isExtractRaw === 4) {
      setCaptureStamp(extractStamp);
      setXmpString(fixXmp(undefined, undefined, extractStamp));
      toast({
        description: `🚀 Live photo stamp changed.`,
      });
    } else {
      setLoading(prev => prev | 4);
      cleanMotion();
      ffexec({ obj: null, arg: 0 }, { obj: isExtractRaw === 2 ? convertedVideoUrl : videoFile, arg: 3 })
    }
  };

  const ffexec = async (img: { obj: BlobUrl | null; arg: number; }, film: { obj: BlobUrl | null; arg: number; }) => {
    if (!img.obj && !film.obj) return;

    const ffmpeg = ffmpegRef.current;
    setProgress(0);
    // Abort worker.
    if ((loading & 4) !== 0) {
      setLoading(prev => prev & ~4);
      return ffmpeg.terminate()
    };

    const argsHead = [
      "-v",
      "level+info",
      "-y",
    ];
    const ffmpegArgs = [[
      "-loglevel",
      "quiet",
      "-i",
      "empty.webm",
      "empty.mp4",
    ], [
      "-i",
      `input.${img?.obj?.ext}`,
      "-vf",
      `scale=min(${maxDimensions?.at(0) || 99999}\\,iw):min(${maxDimensions?.at(1) || 99999}\\,ih):force_original_aspect_ratio=decrease`,
      `output.${img?.obj?.ext}`, //TODO: Converted image file type option.
    ], [
      ...beginStamp ? ["-ss", beginStamp.toFixed(3)] : [],
      ...stopStamp ? ["-t", (stopStamp - beginStamp).toFixed(3)] : [],
      "-i",
      `input.${film?.obj?.ext}`,
      ...["-vf", `scale=min(${maxDimensions?.at(2) || 99999}\\,iw):min(${maxDimensions?.at(3) || 99999}\\,ih):force_original_aspect_ratio=decrease`],
      ...["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"],
      ...keepAudio ? ["-acodec", "copy"] : ["-an"],
      `output.${videoTypes[convertedVideoExt]}`,
    ], [
      "-ss",
      (extractStamp / 1000000).toFixed(3),
      "-i",
      `input.${film?.obj?.ext}`,
      "-frames:v",
      "1",
      "-update",
      "1",
      "extract.jpg",  // force extract jpg
    ]]

    // Listen to progress event instead of log.
    // progress event is experimental, be careful when using it
    // @ts-ignore
    const logListener = ({ message, type }) => {
      setLogMessages(prev => [...prev, message]);
    }
    const progListener = ({ progress: prog }: { progress: number }) => {
      setProgress(Math.round(Math.min(100, prog * 100)));
    }
    ffmpeg.on("progress", progListener);
    ffmpeg.on("log", logListener);
    if (img.obj) {
      await ffmpeg.writeFile(
        `input.${img.obj.ext}`,
        await fetchFile(img.obj.blob),
      );
      try {
        await ffmpeg.exec([...argsHead, ...ffmpegArgs[img.arg]]);
        const data = await ffmpeg.readFile(`output.${img.obj.ext}`);
        // TODO: determine image MIME.
        const imageBlob = new File(
          [data],
          img.obj.blob.name.replace(/(\.[^.]+)?$/, "_conv$1"),
          { type: img.obj.blob.type }
        );
        setconvertedImageUrl({
          blob: imageBlob,
          url: URL.createObjectURL(imageBlob),
          ext: img.obj.ext,
          tag: 'converted',
        });
      } catch (e) {
        setLogMessages(prev => [...prev, `❌ Error transcoding image: ${e}`]);
        toast({
          description: `⚠️ Error transcoding image! Auto reload core`,
        });
        // reload wasm on image proceeding err.
        loadWasm();
      }
    }
    if (film.obj) {
      await ffmpeg.writeFile(
        `input.${film.obj.ext}`,
        await fetchFile(film.obj.blob),
      );
      try {
        if (film.arg === 3) {
          // pre excute with meaningless command to solve mp4-to-jpg error.
          await ffmpeg.exec(ffmpegArgs[0]);
          await ffmpeg.exec([...argsHead, ...ffmpegArgs[3]]);
          const data = await ffmpeg.readFile("extract.jpg");
          const extBlob = new File(
            [data],
            film.obj.blob.name.replace(/(\.[^.]+)?$/, "_cut.jpg"),
            { type: "image/jpeg" }
          );
          // force extract jpg filetype.
          setImageFile({ blob: extBlob, url: URL.createObjectURL(extBlob), ext: "jpg", tag: 'snapshot' });
          setCaptureStamp(extractStamp);
        } else {
          await ffmpeg.exec([...argsHead, ...ffmpegArgs[film.arg]]);
          const data = await ffmpeg.readFile(`output.${videoTypes[convertedVideoExt]}`);
          const videoBlob = new File(
            [data],
            film.obj.blob.name.replace(/(\.[^.]+)?$/,"_conv." + videoTypes[convertedVideoExt]),
            { type: videoMimeTypes[convertedVideoExt] }
          );
          const newfile = URL.createObjectURL(videoBlob);
          setConvertedVideoUrl({ blob: videoBlob, url: newfile, ext: videoTypes[convertedVideoExt], tag: 'converted' });
          // use converted video if raw video broken.
          if (videoRef.current && videoRef.current.readyState < HTMLMediaElement.HAVE_METADATA) videoRef.current.src = newfile;
        }
      } catch (e) {
        setLogMessages(prev => [...prev, `❌ Error transcoding video: ${e}`]);
        toast({
          description: `⚠️ Error transcoding video! Try resort task.`,
        });
        setProgress(0);
      }
    }
    ffmpeg.off("log", logListener);
    ffmpeg.off("progress", progListener);
    setLoading(prev => prev & ~4);
    toast({
      description: `🚀 Finish transcoding，check live photo tab.`,
    });
  };

  const fixXmp = (xmpContent?: string, videoSize?: number, stamp?: number) => {
    if (!xmpContent && xmpString) xmpContent = xmpString;
    if (!xmpContent) xmpContent = motionXmpRef.current.xmp;
    if (!stamp && captureStamp >= 0) stamp = captureStamp;
    if (!videoSize) videoSize = (convertedVideoUrl ?? videoFile)?.blob.size ?? 0;
    // find OpCamera:VideoLength="..."/GCamera:MicroVideoOffset="..."/Item:Length="..."(after Item:Semantic="MotionPhoto")
    // replace ... with videoSize
    const regex = /OpCamera:VideoLength="(\d+)"/g;
    let newXmpContent = xmpContent.replace(regex, `OpCamera:VideoLength="${videoSize}"`);
    const regex2 = /GCamera:MicroVideoOffset="(\d+)"/g;
    newXmpContent = newXmpContent.replace(regex2, `GCamera:MicroVideoOffset="${videoSize}"`);
    const regex3 = /Item:Semantic="MotionPhoto"((.|\r|\n)*?)Item:Length="(\d+)"/g;
    newXmpContent = newXmpContent.replace(regex3, `Item:Semantic="MotionPhoto"$1Item:Length="${videoSize}"`);
    // Timestamp
    const regex4 = /(Camera:MotionPhoto\w*?PresentationTimestampUs=")\d+/g;
    if (stamp) newXmpContent = newXmpContent.replace(regex4, `$1${stamp}`);
    return newXmpContent;
  }

  // Handle auto-scrolling logs
  useEffect(() => {
    const logContainer = logContainerRef.current;
    if (!logContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainer;
    if (scrollHeight - scrollTop - clientHeight < 50) logContainer.scrollTop = logContainer.scrollHeight;
  }, [logMessages]);

  useEffect(() => {
    if (imageFile) setXmpString(fixXmp());
    // revoke all images if raw image updated
    return () => {
      if (imageFile) URL.revokeObjectURL(imageFile.url);
      setImageDimension(null);
      setconvertedImageUrl(null);
      // setCaptureStamp(-1);
      // setXmpString(motionXmpRef.current.xmp);
    };
  }, [imageFile?.url]);

  useEffect(() => {
    return () => {
      if (convertedImageUrl) URL.revokeObjectURL(convertedImageUrl.url);
    };
  }, [convertedImageUrl?.url]);

  useEffect(() => {
    if (videoRef.current && videoFile && videoRef.current.src !== videoFile.url) {
      videoRef.current.src = videoFile.url;
    }
    // revoke both videos if raw video updated
    return () => {
      if (videoFile) URL.revokeObjectURL(videoFile.url);
      setVideoDimension(null)
      setConvertedVideoUrl(null)
    };
  }, [videoFile?.url]);

  useEffect(() => {
    if (convertedVideoUrl && videoTypes.includes(convertedVideoUrl.ext)) {
      setConvertedVideoExt(videoTypes.indexOf(convertedVideoUrl.ext));
    }
    if (convertedVideoUrl && xmpString) {setXmpString(prev => fixXmp(prev))}
    return () => {
      if (convertedVideoUrl) URL.revokeObjectURL(convertedVideoUrl.url);
    };
  }, [convertedVideoUrl?.url]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Card className="max-w-full md:max-w-[700px] mx-auto md:p-2 my-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <h2 className="flex-1">📸 {t('title.head')} <sup>2025</sup></h2>
            <Button variant="outline" size="icon" onClick={handleI18n} className="rounded-r-none border-r-0">
              <Languages className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">Toggle language</span>
            </Button>
            <ModeToggle />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 [&_.lucide]:w-4 [&_.lucide]:h-4">
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-4 flex flex-col
              items-center justify-center bg-origin-border sm:-bg-linear-28 -bg-linear-48
              from-(--color-input) from-0% from-(--color-input) from-42% to-(--color-background) to-42% to-(--color-background) to-42%]`}
              onPaste={handlePasteFile}
            >
              <input {...getInputProps()} />
              <p className="text-sm text-center">
                {!isDragActive && t('input.title')}
                {isDragAccept && t('input.dragAccept')}
                {isDragReject && t('input.dragReject')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={open}
                disabled={(loading & 14) !== 0} // Disable the button while 2|4|8 is active
              >
                {(loading & 2) !== 0 ? (
                  <>
                    <Loader className="animate-spin" />
                    Loading..
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t('input.select')}
                  </>
                )}
              </Button>
              <div className="flex flex-wrap justify-center gap-x-3 *:mt-2 text-xs">
              <div className="flex gap-x-1">
                {subVideoTypes.map((type) => (
                  <Badge
                    key={type}
                    className={type === videoFile?.ext ? undefined : "bg-(--color-input) text-(--color-foreground)"}
                  >
                    {type}
                  </Badge>
                ))}
                <Badge className={videoFile && !subVideoTypes.includes(videoFile.ext) ? undefined : "bg-(--color-input) text-(--color-foreground)"}>
                  {(videoFile && !subVideoTypes.includes(videoFile.ext)) ? videoFile.ext : '..'}
                </Badge></div><div className="flex gap-x-1">
                {imageTypes.map((type) => (
                  <Badge
                    key={type}
                    className={type === imageFile?.ext ? undefined : "bg-(--color-background) text-(--color-foreground)"}
                  >
                    {type}
                  </Badge>
                ))}
                <Badge className={imageFile && !imageTypes.includes(imageFile.ext) ? undefined : "bg-(--color-background) text-(--color-foreground)"}>
                  {(imageFile && !imageTypes.includes(imageFile.ext)) ? imageFile.ext : '..'}
                </Badge></div>
              </div>
            </div>

            <Tabs value={mediaTab} onValueChange={onTabChange} className="w-full">
              <TabsList className="w-full grid grid-cols-3 [&_code]:flex [&_code]:items-center [&_code]:gap-1 [&_code]:capitalize">
                <TabsTrigger value="video" disabled={!videoFile}>
                  <code>
                    <Video size={18} /> {t('label.video')}
                  </code>
                </TabsTrigger>
                <TabsTrigger value="image" disabled={!imageFile}>
                  <code>
                    <Aperture size={18} /> {t('label.image')}
                  </code>
                </TabsTrigger>
                <TabsTrigger value="motion" disabled={!(videoFile && imageFile)}>
                  <code>
                    <LivePhotoIcon /> {t('label.live')}
                  </code>
                </TabsTrigger>
              </TabsList>
              <div className="mt-1">
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
                    className="max-h-screen mx-auto"
                  />
                </TabsContent>
                <TabsContent value="motion">
                  <LivePhoto
                    url={convertedImageUrl?.url ?? imageFile?.url}
                    videoUrl={convertedVideoUrl?.url ?? videoFile?.url}
                    stamp={captureStamp / 1000000}
                    aspectRatio={imageDimension ? imageDimension.width / imageDimension.height : 16 / 9}
                    className="max-h-screen mx-auto"
                  />
                  <i className="text-muted-foreground text-xs float-right">Powered by LivePhotosKit JS</i>
                </TabsContent>
              </div>
            </Tabs>

            <div id="meta_panel"
              className="grid gap-y-3 border-t-2 border-dashed has-[div]:pt-4 *:font-normal *:sm:rounded-full *:pl-1 *:gap-1.5 sm:gap-x-3">
              {videoFile && (
                <>
                  <Badge variant="outline" className="rounded-r-none">
                    <Video />
                    {humanFileSize(videoFile.blob.size)}
                    <ArrowRight />
                    {convertedVideoUrl ? humanFileSize(convertedVideoUrl.blob.size) : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-l-none">
                    <ImageUpscale />
                    {videoDimension ? (<>{videoDimension.width} <span className="hidden md:inline">x </span>{videoDimension.height}</>) : "??"}
                    <ArrowRight {...(convertedVideoUrl && { color: "#3e9392" })} />
                    <div className="text-end">
                      {newVideoDimensions ? (<>{newVideoDimensions.width} <span className="hidden md:inline">x </span>{newVideoDimensions.height}</>) : "??"}
                    </div>
                  </Badge>
                </>
              )}
              {imageFile && (
                <>
                  <Badge variant="outline" className="rounded-r-none">
                    <Aperture />
                    {humanFileSize(imageFile.blob.size)}
                    <ArrowRight />
                    {convertedImageUrl ? humanFileSize(convertedImageUrl.blob.size) : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-l-none">
                    <ImageUpscale />
                    {imageDimension ? (<>{imageDimension.width} <span className="hidden md:inline">x </span>{imageDimension.height}</>) : "??"}
                    <ArrowRight {...(convertedImageUrl && { color: "#3e9392" })} />
                    <div className="text-end">
                      {newImageDimensions ? (<>{newImageDimensions.width} <span className="hidden md:inline">x </span>{newImageDimensions.height}</>) : "??"}
                    </div>
                  </Badge>
                </>)
              }
            </div>

            <div className="flex justify-between *:flex *:items-center *:space-x-2">
              <div>
                <Switch
                  checked={isCoreMT}
                  onCheckedChange={(checked) => {
                    setIsCoreMT(checked);
                    setCoreLoad(false);
                    // load(checked);
                  }}
                  disabled={(loading & 1) !== 0 || typeof SharedArrayBuffer !== "function"}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="text-xs inline-flex">
                        {t('label.multithread')} <CircleAlert className="ml-1" />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('tips.multiCore')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-6"><Clapperboard /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-50">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h4 className="font-medium leading-none flex gap-1 mb-2">{t('title.videoSet')} <CircleAlert size={16} /></h4>
                        </TooltipTrigger>
                        <TooltipContent>Set ffmpeg params, click button to apply current time of video</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="grid gap-2 **:text-xs">
                      <div className="flex justify-between items-center">
                        <label>
                          {t('label.keepAudio')}
                        </label>
                        <Switch
                          checked={keepAudio}
                          onCheckedChange={(checked) => {
                            setKeepAudio(checked);
                            localStorage.setItem('keepAudio', checked ? "true" : "false");
                          }}
                          disabled={(loading & 4) !== 0}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <label>
                          {t('label.outputFormat')}
                        </label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-6">
                              { videoTypes[convertedVideoExt] }
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {[...videoTypes].map((type, i) => (
                              <DropdownMenuItem
                                key={type}
                                onClick={() => setConvertedVideoExt(i)}
                              >
                                { type }
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid gap-1.5">
                        <label>{t('label.cutRange')}</label>
                        <InputBtn icon={FlagTriangleLeft} tar={beginStamp} setter={setBeginStamp} videoRef={videoRef} />
                        <InputBtn icon={FlagTriangleRight} tar={stopStamp} setter={setStopStamp} videoRef={videoRef} />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-6"><ImageUpscale /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-50 [&_.lucide]:w-4 [&_.lucide]:h-4">
                    <div className="grid gap-4">
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="font-medium leading-none flex gap-1 flex-1">{t('title.scale')} <CircleAlert size={16} /></h4>
                            </TooltipTrigger>
                            <TooltipContent>Set max pixels, keep original or reset with buttons on the right</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Infinity
                          role="button"
                          onClick={() => setMaxDimensions([0, 0, 0, 0])}
                        />
                        <RotateCw
                          role="button"
                          onClick={() => setMaxDimensions(defaultDimension)}
                        />
                      </div>
                      <div className="grid gap-2 [&>div]:grid [&>div]:grid-cols-3 [&>div]:items-center [&>div]:gap-4
                                      [&_label]:flex [&_label]:gap-2 [&_input]:col-span-2 [&_input]:h-8">
                        <PixBox labelid="iwidth" value={maxDimensions?.at(0) || 0} onChange={e => onSetDimensions(e, 0)}>
                          <Aperture /><MoveHorizontal />
                        </PixBox>
                        <PixBox labelid="iheight" value={maxDimensions?.at(1) || 0} onChange={e => onSetDimensions(e, 1)}>
                          <Aperture /><MoveVertical />
                        </PixBox>
                        <PixBox labelid="vwidth" value={maxDimensions?.at(2) || 0} onChange={e => onSetDimensions(e, 2)}>
                          <Video /><MoveHorizontal />
                        </PixBox>
                        <PixBox labelid="vheight" value={maxDimensions?.at(3) || 0} onChange={e => onSetDimensions(e, 3)}>
                          <Video /><MoveVertical />
                        </PixBox>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover onOpenChange={(open: boolean) => {
                  open && videoRef.current && setExtractStamp(videoRef.current.currentTime * 1000000)
                }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-6"><Camera /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-50">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="font-medium leading-none flex gap-1">{t('title.snapshot')} <CircleAlert size={16} /></h4>
                            </TooltipTrigger>
                            <TooltipContent>Ffmpeg needed, except only change timestamp value.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-muted-foreground text-sm">
                          {t('tips.cutVideo')}
                        </p>
                      </div>
                      <div className="grid gap-3">
                        <Input
                          type="number"
                          step={0.1}
                          value={extractStamp / 1000000}
                          placeholder="seconds"
                          onChange={(e) => setExtractStamp(e.target.valueAsNumber * 1000000)}
                        />
                        <div className="flex">
                          <Button
                            disabled={!isFileSelect || (isExtractRaw !== 4 && (!coreLoad || (loading & 6) !== 0))}
                            onClick={extractjpg}
                            className="flex-auto rounded-r-none"
                            size="sm"
                          >
                            {(loading & 4) !== 0 ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin" />
                                Abort!
                              </>
                            ) : (
                              <>
                                <RotateCw className="h-4 w-4" />
                                {t('btn.snapshot')}
                              </>
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" className='rounded-l-none border-l-0 px-2' disabled={(loading & 4) !== 0}>
                                <ChevronDown />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <UpOpt disabled={!videoFile} index={1} tar={isExtractRaw} setter={setisExtractRaw} ratio={true}>{t('option.raw')}{t('option.video')}</UpOpt>
                              <UpOpt disabled={!convertedVideoUrl} index={2} tar={isExtractRaw} setter={setisExtractRaw} ratio={true}>{t('option.converted')}{t('option.video')}</UpOpt>
                              <UpOpt index={4} tar={isExtractRaw} setter={setisExtractRaw} ratio={true}>{t('option.onlyTimestamp')}</UpOpt>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
              {!coreLoad && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(loading & 1) !== 0}
                  onClick={loadWasm}
                >
                  {(loading & 1) !== 0 ? (
                    <>
                      <Loader className="animate-spin" />
                      Loading..
                    </>
                  ) : (
                    <>
                      <Route className="h-4 w-4" />
                      {t('btn.wasm')} (~{humanFileSize(FFMPEG_URL[isCoreMT ? "core_mt" : "core"].size, false, 0)})
                    </>
                  )}
                </Button>
              )}
              <div className="inline-flex flex-auto">
                <Button
                  disabled={!isFileSelect || !coreLoad || isConvert == 0}
                  onClick={transcode}
                  className="flex-auto rounded-r-none"
                  size="sm"
                >
                  {coreLoad && (loading & 4) !== 0 ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Abort!
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
                    <Button size="sm" className='rounded-l-none border-l-0 px-2' disabled={(loading & 4) !== 0 || !isFileSelect || !coreLoad}>
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <UpOpt disabled={!imageFile} index={1} tar={isConvert} setter={setIsConvert}>{t('option.transcode')}{t('option.image')}</UpOpt>
                    <UpOpt disabled={!videoFile} index={2} tar={isConvert} setter={setIsConvert}>{t('option.transcode')}{t('option.video')}</UpOpt>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isFileSelect && (<DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-auto"
                    disabled={(loading & 6) !== 0}
                  >
                    <Download className="h-4 w-4" />
                    {t('btn.dl')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="dropdown-content-width-full">
                  {[imageFile, videoFile, convertedImageUrl, convertedVideoUrl, convertedMotionPhoto].map((file, i) => (
                    file && (
                      <DropdownMenuItem
                        key={file.url}
                        className="[&:hover>svg]:block gap-2"
                        onClick={() => handleDownload(file)}
                      >
                        <span className="flex-auto whitespace-nowrap overflow-hidden text-ellipsis">
                          {t(`option.${file.tag ?? 'unknown'}`)} {file.ext} ({humanFileSize(file.blob.size)})
                        </span>
                        <SquarePen size={16}
                          className='md:hidden hover:bg-card rounded-sm cursor-pointer'
                          onClick={(e) => {e.stopPropagation(); handleRename(file, i)}}
                        />
                      </DropdownMenuItem>
                    )))}
                </DropdownMenuContent>
              </DropdownMenu>)}
            </div>
            <div className="w-full flex items-center justify-center gap-3 mt-2">
              <Progress value={progress} className="flex-auto" />
              <span className="text-xs text-center w-9">{progress}%</span>
            </div>

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="motion">
                <AccordionTrigger>
                  🔅{t('title.motion')}
                  <div className="flex ml-auto mr-2 items-center gap-2">
                    <Trash2 size={16} role="button"
                      onClick={(e) => { e.stopPropagation(); setXmpString(''); motionXmpRef.current = defaultXmp }}
                    />
                    <IconButton
                      onAction={async (e) => {
                        e.stopPropagation();
                        setXmpString(fixXmp(motionXmpRef.current.xmp));
                      }}
                      icon={RotateCw}
                      actionLabel="Restore"
                      successLabel="Restored"
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid w-full gap-2 [&_*]:text-xs p-1">
                    <div className="flex justify-between items-center m-0">
                      <label htmlFor="xmpinput">XMP meta</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleAlert size={16} />
                          </TooltipTrigger>
                          <TooltipContent>{t('tips.createMotio')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea
                      id="xmpinput"
                      rows={8}
                      placeholder="Xmp needed, support google/OPPO/Xiaomi."
                      value={xmpString}
                      onChange={e => setXmpString(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={(loading & 6) !== 0 || !(videoFile && imageFile)}
                      onClick={handleCreateMotion}
                    >
                      <LivePhotoIcon /> {t('btn.createMotion')}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      * {t('tips.motiontips')}<br/>
                      * {t('tips.imagePrior')}<br/>
                      * {t('tips.videoPrior')}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="upload">
                <AccordionTrigger>
                  ⚡️{t('title.upload')}
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
                    className="space-y-4 pt-2 pb-4 mx-2 [&_*]:text-xs"
                    onSubmit={handleUpload}
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
                      options={serverConfig.map(({ url }, i) => ({ id: i, label: url }))}
                      onDelete={(i) => setServerConfig(serverConfig.filter((_v, index) => index !== i))}
                      onChange={(s) => setEndPoint(s)}
                      onSelect={(o) => {
                        setEndPoint(o.label);
                        setEndPointHeader(serverConfig[o.id].headers ?? []);
                        setEndPointBody(serverConfig[o.id].bodys ?? []);
                        setUsePost(serverConfig[o.id].post ?? false);
                      }}
                    />
                    <div className="flex justify-between items-center m-0">
                      <label htmlFor="endpointheader">
                        Request Header ({endPointHeader.length})
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleAlert size={16} />
                          </TooltipTrigger>
                          <TooltipContent><i>key:value</i> pairs<br />storage locally in PLAINTEXT!</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center mb-2">
                      <DropdownInput
                        id="endpointheader"
                        value={endPointHeaderKey}
                        className="rounded-r-none"
                        placeholder="Authorization"
                        options={endPointHeader.map(({ key }, i) => ({ id: i, label: key }))}
                        onDelete={(i) => setEndPointHeader(endPointHeader.filter((_v, index) => index !== i))}
                        onChange={(s) => setEndPointHeaderKey(s)}
                        onSelect={(o) => {
                          setEndPointHeaderKey(o.label);
                          setEndPointHeaderValue(endPointHeader[o.id].value);
                        }}
                      />
                      <Input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        autoCapitalize="none"
                        placeholder="Bearer token123.."
                        value={endPointHeaderValue}
                        onChange={(e) => setEndPointHeaderValue(e.target.value)}
                        className="rounded-none border-x-0 focus:border-x focus:z-99"
                      />
                      <Button
                        variant="outline"
                        type="button"
                        className="px-2 rounded-l-none"
                        onClick={() => {
                          if (endPointHeaderKey && endPointHeaderValue) {
                            setEndPointHeader([...endPointHeader, { key: endPointHeaderKey, value: endPointHeaderValue }]);
                            setEndPointHeaderKey("");
                            setEndPointHeaderValue("");
                          }
                        }}
                        disabled={(loading & 8) !== 0}
                      >
                        <Plus />
                      </Button>
                    </div>
                    {usePost && (
                      <>
                        <div className="flex justify-between items-center m-0">
                          <label htmlFor="endpointheader">
                            Request Body ({endPointBody.length})
                          </label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CircleAlert size={16} />
                              </TooltipTrigger>
                              <TooltipContent>use <code>{`{File}`}</code> to represent file.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center mb-2">
                          <DropdownInput
                            id="endpointheader"
                            value={endPointBodyKey}
                            className="rounded-r-none"
                            placeholder="file"
                            options={endPointBody.map(({ key }, i) => ({ id: i, label: key }))}
                            onDelete={(i) => setEndPointBody(endPointBody.filter((_v, index) => index !== i))}
                            onChange={(s) => setEndPointBodyKey(s)}
                            onSelect={(o) => {
                              setEndPointBodyKey(o.label);
                              setEndPointBodyValue(endPointBody[o.id].value);
                            }}
                          />
                          <Input
                            type="text"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            autoCapitalize="none"
                            placeholder="{File}"
                            value={endPointBodyValue}
                            onChange={(e) => setEndPointBodyValue(e.target.value)}
                            className="rounded-none border-x-0 focus:border-x focus:z-99"
                          />
                          <Button
                            variant="outline"
                            type="button"
                            className="px-2 rounded-l-none"
                            onClick={() => {
                              if (endPointBodyKey && endPointBodyValue) {
                                setEndPointBody([...endPointBody, { key: endPointBodyKey, value: endPointBodyValue }]);
                                setEndPointBodyKey("");
                                setEndPointBodyValue("");
                              }
                            }}
                            disabled={(loading & 8) !== 0}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-start min-h-10 space-x-2">
                      <Switch
                        id="upload-method-switch"
                        checked={usePost}
                        onCheckedChange={(checked) => { setUsePost(checked) }}
                        disabled={(loading & 8) !== 0}
                      />
                      <label htmlFor="upload-method-switch">
                        {usePost ? "PUT" : "POST"} METHOD
                      </label>
                    </div>

                    <div className="flex w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        className="flex-1 rounded-r-none"
                        disabled={(loading & 8) !== 0 || isUpload === 0 || !isFileSelect}
                      >
                        {(loading & 8) !== 0 ? (
                          <>
                            <UploadIcon className="mr-1 h-4 w-4 animate-pulse" />
                            {/* TODO: Manually abort uploading. */}
                            Processing..
                          </>
                        ) : (
                          <>
                            <UploadIcon className="mr-1 h-4 w-4" />
                            {t('btn.upload')} ({(isUpload.toString(2).split('1').length - 1) || t('btn.noUpload')})
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className='rounded-l-none border-l-0 px-2'
                            disabled={(loading & 8) !== 0 || !isFileSelect}
                          >
                            <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {[imageFile, videoFile, convertedImageUrl, convertedVideoUrl, motionPhoto, convertedMotionPhoto].map((file, i) => (
                            file && (
                              <UpOpt index={2 ** i} tar={isUpload} setter={setIsUpload}>
                                {t(`option.${file.tag}`)} {file.ext} ({humanFileSize(file.blob.size)})
                              </UpOpt>
                            )
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </form>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="log">
                <AccordionTrigger>
                  📜{t('title.log')}
                  <div className="flex ml-auto mr-2 items-center gap-2">
                    <Trash2 size={16} role="button"
                      onClick={(e) => { handleLog(e, false) }}
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
                    className='mt-2 rounded-md overflow-auto max-h-60 overscroll-auto md:overscroll-contain'
                  >
                    <pre className={"p-2 text-sm" + (logMessages.length == 0 ? " after:content-['Nothing'] text-center text-gray-400" : "")}>
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
