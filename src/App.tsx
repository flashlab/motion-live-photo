import {
  ChangeEvent,
  ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/mobile-tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import ModeToggle from "@/components/mode-toggle";
import IconButton from "@/components/icon-btn";
import DropdownInput from "@/components/droplist-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { LivePhoto, LivePhotoIcon, XmpStrings } from "@/components/LivePhoto";
import { InputBtn, UpOpt } from "@/components/widget";
import { useToast } from "@/hooks/use-toast";
import { ffmpegAPI, API_BASE_URL } from "@/lib/ffmpeg-api";
import {
  resizeDimensions,
  humanFileSize,
  parseFileName,
  getLogTimestamp,
} from "@/lib/utils";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import { MyCropper } from "@/components/cropper";
import type { Area } from "react-easy-crop";

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
  post: number;
  mode: number;
}

interface MotionData {
  image: File;
  video: File;
  xmp: string;
  hasXmp: boolean;
  hasExtraXmp: boolean;
  stamp?: number;
  model?: string;
  xy?: MediaDimensions;
}

interface FFProbeStreamSideData {
  rotation?: number;
}

interface FFProbeStream {
  width?: number;
  height?: number;
  side_data_list?: FFProbeStreamSideData[];
}

interface FFProbeOutput {
  streams: FFProbeStream[];
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
  BrushCleaning,
  ImageUpscale,
  SaveAll,
  CircleAlert,
  Expand,
  Camera,
  Clapperboard,
  FlagTriangleLeft,
  FlagTriangleRight,
  Plus,
  Languages,
  SquarePen,
  WrapText,
  Link,
  Timer,
  Server,
} from "lucide-react";

let fileWorker: Worker | null = null;

function App() {
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [mediaTab, setMediaTab] = useState("video");
  const loadStorageJson = <T = unknown,>(key: string): T | undefined => {
    try {
      return JSON.parse(localStorage.getItem(key) || "") as T;
    } catch {
      return undefined;
    }
  };

  const [videoFile, setVideoFile] = useState<BlobUrl | null>(null);
  const [imageFile, setImageFile] = useState<BlobUrl | null>(null);
  const [heicPhoto, setHeicPhoto] = useState<BlobUrl | null>(null);
  const [motionPhoto, setMotionPhoto] = useState<BlobUrl | null>(null);
  const [convertedMotionPhoto, setConvertedMotionPhoto] =
    useState<BlobUrl | null>(null);
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<BlobUrl | null>(
    null
  );
  const [convertedImageUrl, setConvertedImageUrl] = useState<BlobUrl | null>(
    null
  );

  const [captureStamp, setCaptureStamp] = useState<number>(-1); //seconds
  const [extractStamp, setExtractStamp] = useState<number>(0);
  const [beginStamp, setBeginStamp] = useState<number>(NaN);
  const [stopStamp, setStopStamp] = useState<number>(NaN);
  const [xmpString, setXmpString] = useState<string>("");

  const [enableCrop, setEnableCrop] = useState(false);
  const [onlyRotate, setOnlyRotate] = useState(false);
  const [newAspectRatio, setNewAspectRatio] = useState<number>(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [rotateOrder, setRotateOrder] = useState<number[]>([]);

  const defaultDimension = [1008, 1344, 720, 960];
  const [maxDimensions, setMaxDimensions] = useState<number[]>(
    loadStorageJson("defaultDimension") ?? defaultDimension
  );
  const [videoDimension, setVideoDimension] = useState<
    MediaDimensions | undefined
  >(undefined);
  const [imageDimension, setImageDimension] = useState<
    MediaDimensions | undefined
  >(undefined);
  const newImageDimensions = useMemo(() => {
    return imageDimension
      ? resizeDimensions(
          imageDimension.width,
          imageDimension.height,
          maxDimensions?.at(0) || 0,
          maxDimensions?.at(1) || 0,
          !onlyRotate && newAspectRatio
        )
      : null;
  }, [imageDimension, maxDimensions, newAspectRatio, onlyRotate]);
  const newVideoDimensions = useMemo(() => {
    return videoDimension
      ? resizeDimensions(
          videoDimension.width,
          videoDimension.height,
          maxDimensions?.at(2) || 0,
          maxDimensions?.at(3) || 0,
          !onlyRotate && newAspectRatio
        )
      : null;
  }, [videoDimension, maxDimensions, newAspectRatio, onlyRotate]);

  const reqMethods = ["POST", "PUT", "DELETE", "GET"];
  const [serverConfig, setServerConfig] = useState<SvrConfig[]>(
    loadStorageJson("serverConfig") ?? []
  );
  const [endPoint, setEndPoint] = useState<string>(
    serverConfig?.at(0)?.url || ""
  );
  const [endPointHeader, setEndPointHeader] = useState<RequestParam[]>(
    serverConfig?.at(0)?.headers ?? []
  );
  const [endPointHeaderKey, setEndPointHeaderKey] = useState<string>(
    endPointHeader?.at(0)?.key || ""
  );
  const [endPointHeaderValue, setEndPointHeaderValue] = useState<string>(
    endPointHeader?.at(0)?.value || ""
  );
  const [endPointBody, setEndPointBody] = useState<RequestParam[]>(
    serverConfig?.at(0)?.bodys ?? [{ key: "file", value: "{File}" }]
  );
  const [endPointBodyKey, setEndPointBodyKey] = useState<string>(
    endPointBody?.at(0)?.key || ""
  );
  const [endPointBodyValue, setEndPointBodyValue] = useState<string>(
    endPointBody?.at(0)?.value || ""
  );
  const [reqMethod, setReqMethod] = useState<number>(
    serverConfig?.at(0)?.post || 0
  ); // 0: POST, 1: PUT, 2: DELETE, 3:GET
  const [reqMode, setReqMode] = useState(serverConfig?.at(0)?.mode || 0); // 0: upload, 1: image, 2: video
  const [keepAudio, setKeepAudio] = useState(
    localStorage.getItem("keepAudio") === "true" ? true : false
  );
  const [isCoreMT, setIsCoreMT] = useState(
    localStorage.getItem("isCoreMT") === "true" ? true : false
  );
  const [defaultXmpOpt, setDefaultXmpOpt] = useState<string>("default");

  const ffmpegAPIRef = useRef(ffmpegAPI);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const convertedImageRef = useRef<HTMLImageElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const activeXhrRef = useRef<XMLHttpRequest[]>([]);
  const motionXmpRef = useRef({
    hasXmp: false,
    hasExtraXmp: false,
    xmp: XmpStrings[defaultXmpOpt as keyof typeof XmpStrings],
  });

  const videoTypes = ["mp4", "mov", "webm"];
  const videoMimeTypes = ["video/mp4", "video/quicktime", "video/webm"];
  const imageTypes = ["jpg", "png", "webp"];
  const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const isFileSelect = useMemo(
    () => !!(videoFile || imageFile),
    [videoFile, imageFile]
  );
  const [coreLoad, setCoreLoad] = useState(false);
  const [loading, setLoading] = useState(0); // 0: idle, 1: download wasm, 2: parsing image, 4: ffmpeg, 8: uploading

  // 自动连接服务器
  useEffect(() => {
    const autoConnectServer = async () => {
      try {
        appendLog("🔄 Auto-connecting to server...");
        await checkServerConnection(false);
      } catch (err) {
        appendLog(`❌ Auto-connection failed: ${err}`);
      }
    };

    // 延迟1秒后自动连接，避免与其他初始化冲突
    const timer = setTimeout(autoConnectServer, 1000);
    return () => clearTimeout(timer);
  }, []);
  const [convertedVideoExt, setConvertedVideoExt] = useState(0); // 0: mp4, 1: mov, 2: webm
  const [convertedImageExt, setConvertedImageExt] = useState(0); // 0: jpg, 1: png, 2: webp
  const [heicToQuality, setHeicToQuality] = useState(0.8); // 0.0 - 1.0, default 0.8
  const [isConvert, setIsConvert] = useState(3); // 1: image, 2: video, 3: both, 4: edit command
  // 1: image, 2: video, 4: converted image, 8: converted video, 16: motion photo, 32: converted motion photo, 64: heic image
  const [isUpload, setIsUpload] = useState(0);
  const [isExtractRaw, setisExtractRaw] = useState(1); // 1: extract from raw, 2: extract from converted, 4: only stamp change
  const [wrapLog, setWrapLog] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>("");
  const { t, i18n } = useTranslation();
  const [currLang, setCurrLang] = useState(i18n.language);
  const { toast } = useToast();
  const {
    getRootProps,
    getInputProps,
    open,
    isDragActive,
    isDragAccept,
    isDragReject,
    inputRef,
  } = useDropzone({
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
      const isHeif =
        ["heic", "heif"].includes(ext) ||
        file.type === "image/heic" ||
        file.type === "image/heif";
      if (isHeif) {
        // heic to jpeg
        toast({
          description: t("toast.heicDetect"),
        });
        appendLog(`📣 HEIC image detected, converting to JPEG...`);
        setHeicPhoto({ blob: file, url: "", ext: ext, tag: "raw" });
        import("heic-to")
          .then(({ heicTo }) => {
            heicTo({
              blob: file,
              type: imageMimeTypes[convertedImageExt ? 1 : 0],
              quality: heicToQuality,
            })
              .then((blob) => {
                setImageFile({
                  blob: new File(
                    [blob],
                    `${name}_heic.${imageTypes[convertedImageExt ? 1 : 0]}`
                  ),
                  url: URL.createObjectURL(blob),
                  ext: imageTypes[convertedImageExt ? 1 : 0],
                  tag: "heicDerived",
                });
                setMediaTab("image");
                resolve(t("toast.heicDone"));
              })
              .catch((err) => {
                throw new Error(`Conversion failed: ${err}`);
              });
          })
          .catch((err: Error) => {
            appendLog(`❌ HEIC image ${err}`);
            reject(new Error(`HEIC image`));
          });
      } else {
        motionWorker(file)
          .then((data) => {
            motionXmpRef.current = {
              hasXmp: data.hasXmp,
              hasExtraXmp: data.hasExtraXmp,
              xmp:
                data.xmp ||
                XmpStrings[defaultXmpOpt as keyof typeof XmpStrings],
            };
            setImageFile({
              blob: data.image,
              url: URL.createObjectURL(data.image),
              ext: "jpg",
              tag: "embed",
            });
            setMotionPhoto({
              blob: file,
              url: URL.createObjectURL(file),
              ext: "jpg",
              tag: "motion",
            });
            if (!videoFile || confirm(t("title.keepVideo"))) {
              setVideoFile({
                blob: data.video,
                url: URL.createObjectURL(data.video),
                ext: "mp4",
                tag: "embed",
              });
              setCaptureStamp((data.stamp ?? 0) / 1000000);
              setMediaTab("video");
            }
            resolve(t("toast.motionLoad"));
          })
          .catch((err: Error) => {
            appendLog(`❌ Motion image ${err}`);
            reject(new Error(`Motion image`));
          });
      }
    });
  };

  const cleanMotion = (): void => {
    // reset motionXmpRef except xmp
    motionXmpRef.current = {
      hasXmp: false,
      hasExtraXmp: false,
      xmp: XmpStrings[defaultXmpOpt as keyof typeof XmpStrings],
    };
    // clean object
    if (motionPhoto) URL.revokeObjectURL(motionPhoto.url);
    if (convertedMotionPhoto) URL.revokeObjectURL(convertedMotionPhoto.url);
    setMotionPhoto(null);
    setConvertedMotionPhoto(null);
    setHeicPhoto(null);
  };

  const motionWorker = <T extends File | MotionData>(
    file: T
  ): Promise<T extends File ? MotionData : File> => {
    return new Promise((resolve, reject) => {
      if (!fileWorker) {
        // Initialize worker if not already done
        fileWorker = new Worker(
          new URL("./lib/extractmotion.ts", import.meta.url),
          { type: "module" }
        );
      }
      fileWorker.onmessage = (
        e: MessageEvent<{ type: string; msg: string; obj?: File | MotionData }>
      ) => {
        switch (e.data.type) {
          case "res":
            resolve(e.data.obj as T extends File ? MotionData : File);
            break;
          case "log":
            appendLog(e.data.msg);
            break;
          case "err":
            appendLog(e.data.msg);
            reject(new Error(`motion photo`));
        }
      };

      fileWorker.onerror = (err) => {
        appendLog(`❌ worker module ${err.message}`);
        reject(new Error(`worker module`));
      };
      fileWorker.postMessage(file);
    });
  };

  const onLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.src === videoFile?.url) {
      const { videoWidth, videoHeight } = videoRef.current;
      setVideoDimension({
        width: videoWidth,
        height: videoHeight,
      });
    } else if (!videoDimension) {
      // use log dimension if original video not loaded
      const videoLogStart = logMessages.findIndex((v) =>
        new RegExp(`input\\.${videoFile!.ext}`).test(v)
      );
      if (videoLogStart > 0) {
        // Search for dimensions and rotaion in 25 next logs
        const videoLogSlice = logMessages.slice(
          videoLogStart,
          videoLogStart + 25
        );
        const ffHWline = videoLogSlice.find((v) =>
          /Stream.*?Video.*?,\s\d+x\d+/.test(v)
        );
        if (ffHWline) {
          const ffHW = ffHWline.match(/,\s(\d+)x(\d+)/);
          const isRotate = videoLogSlice.some((v) =>
            /-90\.00\sdegrees/.test(v)
          );
          if (ffHW)
            setVideoDimension({
              width: ffHW[isRotate ? 2 : 1] as unknown as number,
              height: ffHW[isRotate ? 1 : 2] as unknown as number,
            });
        }
      }
    }
  };

  const onVideoError = () => {
    toast({
      description: t("toast.err.videoCodec"),
    });
  };

  const onLoadedImage = () => {
    if (!imageRef.current) return;
    const { naturalWidth, naturalHeight } = imageRef.current;
    setImageDimension({
      width: naturalWidth,
      height: naturalHeight,
    });
  };

  const onTabChange = (value: string) => {
    setMediaTab(value);
  };

  const onSetDimensions = (e: ChangeEvent<HTMLInputElement>, n: number) => {
    setMaxDimensions(
      maxDimensions.map((c, i) => {
        return i === n ? (e.target.value as unknown as number) : c;
      })
    );
  };

  const handleSaveConfig = async () => {
    const configs = serverConfig;
    if (endPoint) {
      const newConfig = {
        url: endPoint,
        headers: endPointHeader,
        bodys: endPointBody,
        post: reqMethod,
        mode: reqMode,
      };
      const matchIndex = configs.findIndex((o) => o.url === endPoint);
      if (matchIndex > -1) configs.splice(matchIndex, 1);
      configs.unshift(newConfig);
      setServerConfig(configs);
    }

    localStorage.setItem("serverConfig", JSON.stringify(configs));
    return Promise.resolve();
  };

  const handleCVConfig = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const oldConf: SvrConfig[] = loadStorageJson("serverConfig") ?? [];
      let config: SvrConfig[] = [];
      try {
        config = JSON.parse(text) as SvrConfig[];
      } catch {
        /* empty */
      }
      if (config.length > 0 && !confirm(t("title.readConf"))) {
        if (oldConf.length === 0 || confirm(t("title.pasteConf"))) {
          setServerConfig(config);
          setEndPoint(config[0].url ?? "");
          setEndPointHeader(config[0].headers ?? []);
          setEndPointBody(config[0].bodys ?? []);
          setReqMethod(config[0].post || 0);
          setReqMode(config[0].mode || 0);
          localStorage.setItem("serverConfig", JSON.stringify(config));
          toast({
            description: t("toast.importConf"),
          });
        }
      } else {
        if (oldConf.length > 0) {
          await navigator.clipboard.writeText(
            localStorage.getItem("serverConfig") || ""
          );
          toast({
            description: t("toast.exportConf"),
          });
        } else {
          throw new Error(t("toast.err.emptyConf"));
        }
      }
    } catch (err) {
      toast({
        description: t("toast.err.pasteConf") + String(err),
      });
      return Promise.reject(new Error("Failed to paste configuration"));
    }
  };

  const handleI18n = () => {
    const newLang = currLang === "en" ? "zh" : "en";
    setCurrLang(newLang);
    void i18n.changeLanguage(newLang);
  };

  const handleDownload = (media: BlobUrl): void => {
    try {
      const link = document.createElement("a");
      link.href = media.url;
      link.download = media.blob.name;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        description: "Download failed: " + String(error),
      });
    }
  };

  const handleCopyLink = (media: BlobUrl): Promise<void> => {
    return navigator.clipboard.writeText(media.blob.name).then(() => {
      toast({
        description: t("toast.linkCopied"),
      });
    });
  };

  const handleRename = (media: BlobUrl, index: number): void => {
    let newName = prompt(
      t("title.rename"),
      media.blob.name.replace(/(\.[^.]+)?$/, "")
    );
    const setter = [
      setImageFile,
      setVideoFile,
      setConvertedImageUrl,
      setConvertedVideoUrl,
    ][index];
    if (!newName) return;
    newName = newName.trim().replace(/[\\/:"*?<>|]/g, ""); // Remove illegal characters
    if (newName !== "") {
      setter((prev) => {
        if (!prev) return prev;
        const newFile = new File([prev.blob], `${newName}.${media.ext}`, {
          type: prev.blob.type,
        });
        // Revoke old URL and create new one
        URL.revokeObjectURL(prev.url);
        const newUrl = URL.createObjectURL(newFile);
        return {
          ...prev,
          blob: newFile,
          url: newUrl,
        };
      });
      toast({
        description: t("toast.renamed") + `${newName}.${media.ext}`,
      });
    }
  };

  const handleFileSelect = (file: File) => {
    // get file name
    const { ext } = parseFileName(file.name);
    const mime = file.type;
    if (mime.startsWith("video/")) {
      setVideoFile({
        blob: file,
        url: URL.createObjectURL(file),
        ext: ext,
        tag: "raw",
      });
      setXmpString((prev) => fixXmp(prev, file.size));
      setMediaTab("video");
      toast({
        description: t("toast.videoLoad"),
      });
    } else if (mime.startsWith("image/")) {
      setLoading((prev) => prev | 2);
      cleanMotion();
      parseImageFile(file)
        .then((msg) => {
          toast({
            description: msg,
          });
        })
        .catch((err: Error) => {
          // If not motion photo, load as image.
          setImageFile({
            blob: file,
            url: URL.createObjectURL(file),
            ext: ext,
            tag: "raw",
          });
          setMediaTab("image");
          toast({
            description:
              t("toast.err.load") + err.message + t("toast.err.checkLogs"),
          });
        })
        .finally(() => {
          setLoading((prev) => prev & ~2);
        });
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if ((loading & 8) !== 0) {
      handleAbortUploads();
      return;
    }
    let uploadCount = 0;
    setProgress(0);
    activeXhrRef.current = [];

    const fileFilter = (
      filelist: (BlobUrl | null)[],
      opt: number
    ): BlobUrl[] => {
      return filelist.filter(
        (o, i): o is BlobUrl => o !== null && (opt & (2 ** i)) !== 0
      );
    };
    const requestFiles = reqMode
      ? fileFilter([imageFile, videoFile], reqMode)
      : fileFilter(
          [
            imageFile,
            videoFile,
            convertedImageUrl,
            convertedVideoUrl,
            motionPhoto,
            convertedMotionPhoto,
            heicPhoto,
          ],
          isUpload
        );
    for (const media of requestFiles) {
      setLoading((prev) => prev | 8);
      let realEndPoint = endPoint.replace("{filename}", media.blob.name);
      let fileExt =
        reqMode === 1
          ? imageTypes[convertedImageExt]
          : videoTypes[convertedVideoExt];
      const formData = new FormData();
      const fileExtMatch = realEndPoint.match(/\{(\w+)\}/);
      if (fileExtMatch) {
        fileExt = fileExtMatch[1];
        realEndPoint = realEndPoint.replace(`{${fileExt}}`, fileExt);
      }
      for (const body of endPointBody) {
        if (body.value === "{File}")
          formData.append(body.key, media.blob, media.blob.name);
        else formData.append(body.key, body.value);
      }
      const xhr = new XMLHttpRequest();
      activeXhrRef.current.push(xhr);

      const reqPromise = new Promise<void>((resolve, reject) => {
        (reqMethod < 2 ? xhr.upload : xhr).addEventListener("progress", (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        });
        if (reqMode) xhr.responseType = "blob";
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const textResponse = reqMode ? "" : xhr.responseText;
            const blob = reqMode ? (xhr.response as Blob) : new Blob([]);
            if (reqMode) {
              try {
                const setter = [setConvertedImageUrl, setConvertedVideoUrl][
                  reqMode - 1
                ];
                if (blob.type) {
                  const blobExtMatch = (
                    reqMode === 1 ? imageMimeTypes : videoMimeTypes
                  ).indexOf(blob.type);
                  if (blobExtMatch > -1) {
                    const blobFileExt = (
                      reqMode === 1 ? imageTypes : videoTypes
                    )[blobExtMatch];
                    if (
                      blobFileExt !== fileExt &&
                      confirm(t("title.changeExt" + blobFileExt))
                    ) {
                      fileExt = blobFileExt;
                    }
                  }
                }
                setter({
                  blob: new File(
                    [blob],
                    media.blob.name.replace(/\.[^.]+?$/, `_cloud.${fileExt}`),
                    {
                      type: blob.type,
                    }
                  ),
                  url: URL.createObjectURL(blob),
                  ext: fileExt,
                  tag: "cloud",
                });
              } catch (err) {
                reject(new Error(`File parse error: ${String(err)}`));
              }
            }
            appendLog(`🚩 ${xhr.status} ${textResponse}`);
            resolve();
          } else {
            reject(
              new Error(`HTTP error Status: ${xhr.status} ${xhr.statusText}`)
            );
          }
        };
        xhr.onerror = () => {
          reject(new Error("Network error occurred"));
        };
        xhr.onabort = () => {
          reject(new Error("Upload aborted by user"));
        };
      });
      xhr.open(reqMethods[reqMethod], `${realEndPoint}`, true);
      for (const header of endPointHeader) {
        xhr.setRequestHeader(header.key, header.value);
      }
      xhr.send(
        reqMethod === 0 ? formData : reqMethod === 1 ? media.blob : null
      );
      reqPromise
        .then(() => {
          appendLog(realEndPoint + "🚀" + reqMode ? "" : media.blob.name);
          toast({
            description: t("toast.transfered") + reqMode ? "" : media.blob.name,
          });
        })
        .catch((err: Error) => {
          if (err.message === "Upload aborted by user") {
            appendLog(`⏹️ Upload cancelled: ${media.blob.name}`);
          } else {
            appendLog(`❌ Error uploading ${media.blob.name}: ${err}`);
            toast({
              description: `${t("toast.err.upload")} ${
                reqMode ? "" : media.blob.name
              }`,
            });
          }
        })
        .finally(() => {
          const index = activeXhrRef.current.indexOf(xhr);
          if (index > -1) {
            activeXhrRef.current.splice(index, 1);
          }
          if (++uploadCount >= requestFiles.length)
            setLoading((prev) => prev & ~8);
          setProgress(0);
        });
    }
  };

  const handleAbortUploads = () => {
    activeXhrRef.current.forEach((xhr) => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        xhr.abort();
      }
    });
    activeXhrRef.current = [];

    setLoading((prev) => prev & ~8);
    setProgress(0);

    appendLog("⚠️ All uploads aborted by user");
    toast({
      description: t("toast.uploadAborted"),
    });
  };

  const handlePasteFile = (event: ClipboardEvent<HTMLInputElement>) => {
    if (!inputRef.current) return;
    if (event.clipboardData?.files) {
      (inputRef.current as unknown as HTMLInputElement).files =
        event.clipboardData.files;
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const handleCreateMotion = () => {
    // Prior to creating motion photo.
    const image = motionPhoto || convertedImageUrl || imageFile;
    let imageXy = imageDimension;
    if (!image || !["jpg", "jpeg"].includes(image.ext)) {
      toast({
        description: t("toast.err.createMotionExt"),
      });
      return;
    } else if (image.tag === "converted" && convertedImageRef.current) {
      const { naturalWidth, naturalHeight } = convertedImageRef.current;
      if (naturalWidth && naturalHeight) {
        imageXy = { width: naturalWidth, height: naturalHeight };
      }
    }
    setLoading((prev) => prev | 2);
    motionWorker({
      ...motionXmpRef.current,
      xmp: xmpString, // use textArea value.
      image: image.blob,
      video: convertedVideoUrl?.blob ?? videoFile?.blob ?? new File([], ""),
      xy: imageXy,
      model: defaultXmpOpt,
    })
      .then((data) => {
        setConvertedMotionPhoto({
          blob: data,
          url: URL.createObjectURL(data),
          ext: "jpg",
          tag: "newMotion",
        });
        toast({
          description: t("toast.motionCreate"),
        });
      })
      .catch(() => {
        toast({
          description: t("toast.err.motionCreate"),
        });
      })
      .finally(() => {
        setLoading((prev) => prev & ~2);
      });
  };

  const checkServerConnection = async (isManual = true) => {
    setLoading((prev) => prev | 1);
    try {
      if (isManual) {
        appendLog("🔄 Manual server connection attempt...");
      }
      const result = await ffmpegAPI.getFFmpegInfo();
      if (result.success) {
        setCoreLoad(true);
        appendLog("✅ Server FFmpeg is ready");
        toast({
          description: "Server FFmpeg is ready",
        });
      } else {
        throw new Error(result.error || "Server not available");
      }
    } catch (err) {
      setProgress(0);
      appendLog(`❌ Error connecting to server: ${err}`);
      toast({
        description: "Server connection failed",
      });
    } finally {
      setLoading((prev) => prev & ~1);
    }
  };

  const transcode = () => {
    setLoading((prev) => prev | 4);
    localStorage.setItem("defaultDimension", JSON.stringify(maxDimensions));
    localStorage.setItem("keepAudio", keepAudio ? "true" : "false");
    localStorage.setItem("isCoreMT", isCoreMT ? "true" : "false");
    void ffexec(
      { obj: imageFile && (isConvert & 1) !== 0 ? imageFile : null, arg: 1 },
      { obj: videoFile && (isConvert & 2) !== 0 ? videoFile : null, arg: 2 }
    );
  };

  const extractjpg = () => {
    if (isExtractRaw === 4) {
      setCaptureStamp(extractStamp);
      setXmpString(fixXmp(undefined, undefined, extractStamp));
      toast({
        description: t("toast.extractStamp"),
      });
    } else {
      setLoading((prev) => prev | 4);
      cleanMotion();
      void ffexec(
        { obj: null, arg: 0 },
        { obj: isExtractRaw === 2 ? convertedVideoUrl : videoFile, arg: 3 }
      );
    }
  };

  const getVideoDimension = () => {
    if (!videoFile) return;
    setLoading((prev) => prev | 4);
    void ffexec({ obj: null, arg: 0 }, { obj: videoFile, arg: 4 });
  };

  const ffexec = async (
    img: { obj: BlobUrl | null; arg: number },
    film: { obj: BlobUrl | null; arg: number }
  ) => {
    if (!img.obj && !film.obj) return;

    const ffmpeg = ffmpegAPIRef.current;
    setProgress(0);
    // Abort processing.
    if ((loading & 4) !== 0) {
      setLoading((prev) => prev & ~4);
      return;
    }

    try {
      // Check server connection
      if (!coreLoad) {
        appendLog("⚠️ Server not connected, attempting to connect...");
        await checkServerConnection(true);
      }

      // Process image if provided
      if (img.obj) {
        appendLog(`📸 Processing image: ${img.obj.blob.name}`);
        
        const options = {
          outputFormat: imageTypes[convertedImageExt] as any,
          quality: 'medium' as const,
          width: newImageDimensions?.width,
          height: newImageDimensions?.height,
          rotate: rotateOrder.length > 0 ? rotateOrder.map(r => `transpose=${r}`).join(",") : undefined
        };

        const result = await ffmpeg.processFile(img.obj.blob, options);
        
        if (result.success && result.outputUrl) {
          // Fetch the processed file
          const response = await fetch(`${API_BASE_URL}${result.outputUrl}`);
          const blob = await response.blob();
          const imageBlob = new File(
            [blob],
            img.obj.blob.name.replace(/\.[^.]+?$/, `_conv.${imageTypes[convertedImageExt]}`),
            { type: imageMimeTypes[convertedImageExt] }
          );
          setConvertedImageUrl({
            blob: imageBlob,
            url: URL.createObjectURL(imageBlob),
            ext: imageTypes[convertedImageExt],
            tag: "converted",
          });
          appendLog(`✅ Image processed successfully: ${result.filename}`);
        } else {
          throw new Error(result.error || 'Image processing failed');
        }
      }

      // Process video if provided
      if (film.obj) {
        appendLog(`🎬 Processing video: ${film.obj.blob.name}`);
        
        if (film.arg === 3) {
          // Extract frame
          const result = await ffmpeg.extractFrame(film.obj.blob, extractStamp.toFixed(3));
          
          if (result.success && result.outputUrl) {
            const response = await fetch(`${API_BASE_URL}${result.outputUrl}`);
            const blob = await response.blob();
            const extBlob = new File(
              [blob],
              film.obj.blob.name.replace(/\.[^.]+?$/, `_cut.${imageTypes[convertedImageExt]}`),
              { type: imageMimeTypes[convertedImageExt] }
            );
            setImageFile({
              blob: extBlob,
              url: URL.createObjectURL(extBlob),
              ext: imageTypes[convertedImageExt],
              tag: "snapshot",
            });
            setCaptureStamp(extractStamp);
            appendLog(`✅ Frame extracted successfully: ${result.filename}`);
          } else {
            throw new Error(result.error || 'Frame extraction failed');
          }
        } else if (film.arg === 4) {
          // Get video dimensions using ffprobe (simplified)
          appendLog(`📏 Getting video dimensions for: ${film.obj.blob.name}`);
          // For now, use the video element to get dimensions
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              const { videoWidth, videoHeight } = videoRef.current!;
              setVideoDimension({
                width: videoWidth,
                height: videoHeight,
              });
              appendLog(`📏 Video dimensions: ${videoWidth}x${videoHeight}`);
            };
            videoRef.current.src = film.obj.url;
          }
        } else {
          // Process video
          const options = {
            outputFormat: videoTypes[convertedVideoExt] as any,
            quality: 'medium' as const,
            width: newVideoDimensions?.width,
            height: newVideoDimensions?.height,
            startTime: beginStamp > 0 ? beginStamp.toFixed(3) : undefined,
            duration: stopStamp > 0 && beginStamp > 0 ? (stopStamp - beginStamp).toFixed(3) : undefined,
            mute: !keepAudio,
            rotate: rotateOrder.length > 0 ? rotateOrder.map(r => `transpose=${r}`).join(",") : undefined
          };

          const result = await ffmpeg.processFile(film.obj.blob, options);
          
          if (result.success && result.outputUrl) {
            const response = await fetch(`${API_BASE_URL}${result.outputUrl}`);
            const blob = await response.blob();
            const videoBlob = new File(
              [blob],
              film.obj.blob.name.replace(/(\.[^.]+)?$/, `output.${videoTypes[convertedVideoExt]}`),
              { type: videoMimeTypes[convertedVideoExt] }
            );
            const newfile = URL.createObjectURL(videoBlob);
            setConvertedVideoUrl({
              blob: videoBlob,
              url: newfile,
              ext: videoTypes[convertedVideoExt],
              tag: "converted",
            });
            
            // use converted video if raw video broken
            if (
              videoRef.current &&
              videoRef.current.readyState < HTMLMediaElement.HAVE_METADATA
            ) {
              videoRef.current.src = newfile;
            }
            
            appendLog(`✅ Video processed successfully: ${result.filename}`);
          } else {
            throw new Error(result.error || 'Video processing failed');
          }
        }
      }

      setLoading((prev) => prev & ~4);
      toast({
        description: t("toast.transcodeDone"),
      });
    } catch (error) {
      console.error("FFmpeg execution error:", error);
      appendLog(`❌ FFmpeg processing error: ${String(error)}`);
      toast({
        description: `FFmpeg error: ${String(error)}`,
      });
      setProgress(0);
      setLoading((prev) => prev & ~4);
    }
  };

  const fixXmp = (xmpContent?: string, videoSize?: number, stamp?: number) => {
    if (!xmpContent && xmpString) xmpContent = xmpString;
    if (!xmpContent) xmpContent = motionXmpRef.current.xmp;
    if (!stamp && captureStamp >= 0) stamp = captureStamp * 1000000;
    if (!videoSize)
      videoSize = (convertedVideoUrl ?? videoFile)?.blob.size ?? 0;
    // find OpCamera:VideoLength="..."/GCamera:MicroVideoOffset="..."/Item:Length="..."(after Item:Semantic="MotionPhoto")
    // replace ... with videoSize
    const regex = /OpCamera:VideoLength="(\d+)"/g;
    let newXmpContent = xmpContent.replace(
      regex,
      `OpCamera:VideoLength="${videoSize}"`
    );
    const regex2 = /GCamera:MicroVideoOffset="(\d+)"/g;
    newXmpContent = newXmpContent.replace(
      regex2,
      `GCamera:MicroVideoOffset="${videoSize}"`
    );
    const regex3 =
      /Item:Semantic="MotionPhoto"((.|\r|\n)*?)Item:Length="(\d+)"/g;
    newXmpContent = newXmpContent.replace(
      regex3,
      `Item:Semantic="MotionPhoto"$1Item:Length="${videoSize}"`
    );
    // Timestamp
    const regex4 = /(Camera:MotionPhoto\w*?PresentationTimestampUs=")\d+/g;
    if (stamp) newXmpContent = newXmpContent.replace(regex4, `$1${stamp}`);
    return newXmpContent;
  };

  function appendLog(msg: string) {
    setLogMessages((prev) => [...prev, `${getLogTimestamp()} ${msg}`]);
  }

  function scrollLog(force: boolean) {
    const logContainer = logContainerRef.current;
    if (!logContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainer;
    if (force || scrollHeight - scrollTop - clientHeight < 50)
      logContainer.scrollTop = logContainer.scrollHeight;
  }

  useEffect(() => {
    scrollLog(false);
  }, [logMessages]);

  useEffect(() => {
    scrollLog(accordionValue === "log");
  }, [accordionValue]);

  useEffect(() => {
    if (imageFile) setXmpString(fixXmp());
    // revoke all images if raw image updated
    return () => {
      if (imageFile) URL.revokeObjectURL(imageFile.url);
      setImageDimension(undefined);
      setConvertedImageUrl(null);
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
    if (videoFile) {
      const videoTypeIndex = videoTypes.indexOf(videoFile.ext);
      if (videoTypeIndex >= 0) {
        setConvertedVideoExt(videoTypeIndex);
      } else {
        setConvertedVideoExt(0); // default to mp4
      }
      if (videoRef.current && videoRef.current.src !== videoFile.url)
        videoRef.current.src = videoFile.url;
    }
    // revoke both videos if raw video updated
    const currentVideoRef = videoRef.current;
    return () => {
      if (videoFile) URL.revokeObjectURL(videoFile.url);
      // remove video poster
      if (currentVideoRef) currentVideoRef.poster = "";
      setVideoDimension(undefined);
      setConvertedVideoUrl(null);
    };
  }, [videoFile?.url]);

  useEffect(() => {
    if (convertedVideoUrl) {
      if (xmpString) {
        setXmpString((prev) => fixXmp(prev));
      }
    }
    return () => {
      if (convertedVideoUrl) URL.revokeObjectURL(convertedVideoUrl.url);
    };
  }, [convertedVideoUrl?.url]);

  useEffect(() => {
    return () => {
      setNewAspectRatio(0);
      setCroppedArea(null);
      setRotateOrder([]);
    };
  }, [enableCrop]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Card className="max-w-full md:max-w-[700px] mx-auto md:p-2 my-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <h2 className="flex-1">
              📸 {t("title.head")} <sup>v1.0</sup>
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={handleI18n}
              className="rounded-r-none border-r-0"
            >
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
                {!isDragActive && (
                  <>
                    {t("input.title")}
                    <span className="underline decoration-wavy">
                      {t("input.titleHL")}
                    </span>
                  </>
                )}
                {isDragAccept && t("input.dragAccept")}
                {isDragReject && t("input.dragReject")}
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
                    <Upload className="icon-svg animate-pulse" />
                    {t("input.select")}
                  </>
                )}
              </Button>
              <div className="flex flex-wrap justify-center gap-x-3 *:mt-2 text-xs">
                <div className="flex gap-x-1">
                  {videoTypes.map(
                    (type, i) =>
                      i < 2 && (
                        <Badge
                          key={type}
                          className={
                            type === videoFile?.ext
                              ? undefined
                              : "badge-hl-primary"
                          }
                        >
                          {type}
                        </Badge>
                      )
                  )}
                  <Badge
                    className={
                      videoFile &&
                      !videoTypes.slice(0, 2).includes(videoFile.ext)
                        ? undefined
                        : "badge-hl-primary"
                    }
                  >
                    {videoFile &&
                    !videoTypes.slice(0, 2).includes(videoFile.ext)
                      ? videoFile.ext
                      : ".."}
                  </Badge>
                </div>
                <div className="flex gap-x-1">
                  {imageTypes.map(
                    (type, i) =>
                      i < 2 && (
                        <Badge
                          key={type}
                          className={
                            type === imageFile?.ext
                              ? undefined
                              : "badge-hl-secondary"
                          }
                        >
                          {type}
                        </Badge>
                      )
                  )}
                  <Badge
                    className={
                      imageFile &&
                      !imageTypes.slice(0, 2).includes(imageFile.ext)
                        ? undefined
                        : "badge-hl-secondary"
                    }
                  >
                    {imageFile &&
                    !imageTypes.slice(0, 2).includes(imageFile.ext)
                      ? imageFile.ext
                      : ".."}
                  </Badge>
                </div>
              </div>
            </div>

            <Tabs
              value={mediaTab}
              onValueChange={onTabChange}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-3 [&_code]:flex [&_code]:items-center [&_code]:gap-1 [&_code]:capitalize">
                <TabsTrigger value="video" disabled={!videoFile}>
                  <code>
                    <Video size={18} /> {t("label.video")}
                  </code>
                </TabsTrigger>
                <TabsTrigger value="image" disabled={!imageFile}>
                  <code>
                    <Aperture size={18} /> {t("label.image")}
                  </code>
                </TabsTrigger>
                <TabsTrigger
                  value="motion"
                  disabled={!(videoFile && imageFile)}
                >
                  <code>
                    <LivePhotoIcon /> {t("label.live")}
                  </code>
                </TabsTrigger>
              </TabsList>
              <div className="mt-1">
                <TabsContent
                  value="video"
                  forceMount
                  className="data-[state=inactive]:hidden"
                >
                  <video
                    ref={videoRef}
                    poster={t("tips.poster")}
                    onLoadedMetadata={onLoadedMetadata}
                    onError={onVideoError}
                    controls
                    className="w-full aspect-video rounded-md mt-2"
                  />
                </TabsContent>
                <TabsContent
                  value="image"
                  forceMount
                  className="data-[state=inactive]:hidden grid place-items-center"
                >
                  {convertedImageUrl ? (
                    <ReactCompareSlider
                      itemOne={
                        <ReactCompareSliderImage
                          src={imageFile?.url}
                          ref={imageRef}
                          onLoad={onLoadedImage}
                        />
                      }
                      itemTwo={
                        <ReactCompareSliderImage
                          ref={convertedImageRef}
                          src={convertedImageUrl?.url}
                        />
                      }
                    />
                  ) : enableCrop ? (
                    <MyCropper
                      imageUrl={imageFile?.url}
                      onAspectUpdate={setNewAspectRatio}
                      onCropUpdate={setCroppedArea}
                      onRotateUpdate={setRotateOrder}
                    />
                  ) : (
                    <img
                      ref={imageRef}
                      src={imageFile?.url}
                      onLoad={onLoadedImage}
                    />
                  )}
                </TabsContent>
                <TabsContent value="motion">
                  <LivePhoto
                    url={convertedImageUrl?.url ?? imageFile?.url}
                    videoUrl={convertedVideoUrl?.url ?? videoFile?.url}
                    stamp={captureStamp}
                    aspectRatio={
                      imageDimension
                        ? imageDimension.width / imageDimension.height
                        : 16 / 9
                    }
                    className="max-h-screen mx-auto"
                  />
                  <i className="text-muted-foreground text-xs float-right">
                    Powered by LivePhotosKit JS
                  </i>
                </TabsContent>
              </div>
            </Tabs>

            <div
              id="meta_panel"
              className="grid grid-cols-2 gap-y-3 border-t-2 border-dashed has-[div]:pt-4 *:font-normal *:sm:rounded-full *:pl-1 *:gap-1.5 sm:gap-x-3"
            >
              {videoFile && (
                <>
                  <Badge variant="outline" className="rounded-r-none">
                    <Video />
                    {humanFileSize(videoFile.blob.size)}
                    <ArrowRight />
                    {convertedVideoUrl
                      ? humanFileSize(convertedVideoUrl.blob.size)
                      : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-l-none">
                    <ImageUpscale />
                    {videoDimension ? (
                      <>
                        {videoDimension.width}{" "}
                        <span className="hidden md:inline">x </span>
                        {videoDimension.height}
                      </>
                    ) : (
                      "??"
                    )}
                    <ArrowRight
                      {...(convertedVideoUrl && { color: "#3e9392" })}
                    />
                    <div className="text-end">
                      {newVideoDimensions ? (
                        <>
                          {newVideoDimensions.width}{" "}
                          <span className="hidden md:inline">x </span>
                          {newVideoDimensions.height}
                        </>
                      ) : (
                        "??"
                      )}
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
                    {convertedImageUrl
                      ? humanFileSize(convertedImageUrl.blob.size)
                      : "??"}
                  </Badge>
                  <Badge variant="outline" className="rounded-l-none">
                    <ImageUpscale />
                    {imageDimension ? (
                      <>
                        {imageDimension.width}{" "}
                        <span className="hidden md:inline">x </span>
                        {imageDimension.height}
                      </>
                    ) : (
                      "??"
                    )}
                    <ArrowRight
                      {...(convertedImageUrl && { color: "#3e9392" })}
                    />
                    <div className="text-end">
                      {newImageDimensions ? (
                        <>
                          {newImageDimensions.width}{" "}
                          <span className="hidden md:inline">x </span>
                          {newImageDimensions.height}
                        </>
                      ) : (
                        "??"
                      )}
                    </div>
                  </Badge>
                </>
              )}
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
                  disabled={
                    (loading & 1) !== 0 ||
                    typeof SharedArrayBuffer !== "function"
                  }
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className="text-xs inline-flex">
                        {t("label.multithread")}{" "}
                        <CircleAlert className="ml-1" />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>{t("tips.multiCore")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                {/* Scale sub-panel */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-6">
                      <ImageUpscale />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-45 [&_.lucide]:w-4 [&_.lucide]:h-4 [&_input]:md:text-xs">
                    <div className="grid gap-3">
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="text-sm flex items-center gap-1 flex-1">
                                {t("title.scale")} <CircleAlert />
                              </h4>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("tips.setPixel")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Expand
                          role="button"
                          onClick={() => setMaxDimensions([0, 0, 0, 0])}
                        />
                        <RotateCw
                          role="button"
                          onClick={() => setMaxDimensions(defaultDimension)}
                        />
                      </div>
                      <div className="grid gap-2 [&_svg]:flex-none">
                        <div className="flex items-center gap-1">
                          <Aperture />
                          <Input
                            id="iwidth"
                            type="number"
                            onChange={(e) => onSetDimensions(e, 0)}
                            value={maxDimensions?.at(0) || 0}
                            className="h-7 px-1"
                          />
                          x
                          <Input
                            id="iheight"
                            type="number"
                            onChange={(e) => onSetDimensions(e, 1)}
                            value={maxDimensions?.at(1) || 0}
                            className="h-7 px-1"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Video />
                          <Input
                            id="vwidth"
                            type="number"
                            onChange={(e) => onSetDimensions(e, 2)}
                            value={maxDimensions?.at(2) || 0}
                            className="h-7 px-1"
                          />
                          x
                          <Input
                            id="vheight"
                            type="number"
                            onChange={(e) => onSetDimensions(e, 3)}
                            value={maxDimensions?.at(3) || 0}
                            className="h-7 px-1"
                          />
                        </div>
                      </div>
                      <div className="flex text-sm items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="text-xs flex items-center gap-1 flex-1">
                                {t("label.enableCrop")} <CircleAlert size={14} />
                              </h4>
                            </TooltipTrigger>
                            <TooltipContent>{t("tips.setCrop")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Switch
                          checked={enableCrop}
                          onCheckedChange={(checked) => {
                            setEnableCrop(checked);
                            if (
                              convertedImageUrl &&
                              confirm(t("title.convertImageReset"))
                            ) {
                              setConvertedImageUrl(null);
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <label>{t("label.noCrop")}</label>
                        <Switch
                          checked={onlyRotate}
                          onCheckedChange={(checked) => setOnlyRotate(checked)}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {/* Video setup sub-panel */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-6">
                      <Clapperboard />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-45">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h4 className="text-sm flex items-center gap-1 mb-2">
                            {t("title.videoSet")}{" "}
                            <CircleAlert className="w-4 h-4" />
                          </h4>
                        </TooltipTrigger>
                        <TooltipContent>{t("tips.videoArgs")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <label>{t("label.keepAudio")}</label>
                        <Switch
                          checked={keepAudio}
                          onCheckedChange={(checked) => {
                            setKeepAudio(checked);
                            localStorage.setItem(
                              "keepAudio",
                              checked ? "true" : "false"
                            );
                          }}
                          disabled={(loading & 4) !== 0}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <label>{t("label.outputFormat")}</label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 text-xs"
                            >
                              {videoTypes[convertedVideoExt]}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="min-w-auto"
                            align="end"
                          >
                            {videoTypes.map((type, i) => (
                              <DropdownMenuItem
                                key={type}
                                className="text-xs"
                                onClick={() => setConvertedVideoExt(i)}
                              >
                                {type}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid gap-1.5">
                        <label>{t("label.cutRange")}</label>
                        <div className="flex [&_input]:pr-1">
                          <InputBtn
                            icon={FlagTriangleLeft}
                            tar={beginStamp}
                            setter={setBeginStamp}
                            onclick={() =>
                              videoRef.current &&
                              setBeginStamp(videoRef.current.currentTime)
                            }
                            placeholder="1.23456"
                            classinput="rounded-r-none"
                          />
                          <InputBtn
                            icon={FlagTriangleRight}
                            tar={stopStamp}
                            setter={setStopStamp}
                            onclick={() =>
                              videoRef.current &&
                              setStopStamp(videoRef.current.currentTime)
                            }
                            placeholder="2.34567"
                            classinput="rounded-l-none"
                            classicon="rounded-l-none"
                          />
                        </div>
                        <Button
                          disabled={
                            !videoFile || !coreLoad || (loading & 6) !== 0
                          }
                          onClick={getVideoDimension}
                          className="h-7"
                          size="sm"
                        >
                          {(loading & 4) !== 0 ? (
                            <>
                              <Loader className="icon-svg animate-spin" />
                              Abort!
                            </>
                          ) : (
                            <>
                              <RotateCw className="icon-svg" />
                              {t("btn.ffprobe")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Image setup sub-panel */}
                <Popover
                  onOpenChange={(open: boolean) => {
                    {
                      if (open && videoRef.current)
                        setExtractStamp(videoRef.current.currentTime);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-6">
                      <Camera />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h4 className="text-sm flex items-center gap-1 mb-2">
                            {t("title.imageSet")}{" "}
                            <CircleAlert className="w-4 h-4" />
                          </h4>
                        </TooltipTrigger>
                        <TooltipContent>{t("tips.imageArgs")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <label>{t("label.outputFormat")}</label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 min-w-12 text-xs"
                            >
                              {imageTypes[convertedImageExt]}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="min-w-auto"
                          >
                            {imageTypes.map((type, i) => (
                              <DropdownMenuItem
                                key={type}
                                className="text-xs"
                                onClick={() => setConvertedImageExt(i)}
                              >
                                {type}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex justify-between items-center">
                        <label>{t("label.heicQuality")}</label>
                        <Input
                          type="number"
                          step={0.1}
                          value={heicToQuality}
                          placeholder="1.0"
                          onChange={(e) =>
                            setHeicToQuality(e.target.valueAsNumber)
                          }
                          className="md:text-xs h-6 w-12 px-1 text-center"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <label>
                                {t("label.snapshot")}
                                <CircleAlert
                                  size={14}
                                  className="inline ml-1"
                                />
                              </label>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("tips.cutVideo")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <InputBtn
                          icon={Timer}
                          tar={extractStamp}
                          setter={setExtractStamp}
                          placeholder="1.23456"
                        />
                        <div className="flex">
                          <Button
                            disabled={
                              isExtractRaw !== 4 &&
                              (!videoFile || !coreLoad || (loading & 6) !== 0)
                            }
                            onClick={extractjpg}
                            className="flex-auto rounded-r-none h-7"
                            size="sm"
                          >
                            {(loading & 4) !== 0 ? (
                              <>
                                <Loader className="icon-svg animate-spin" />
                                Abort!
                              </>
                            ) : (
                              <>
                                <RotateCw className="icon-svg" />
                                {t("btn.snapshot")}
                              </>
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                className="rounded-l-none border-l-0 px-2 h-7"
                                disabled={(loading & 4) !== 0}
                              >
                                <ChevronDown />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="**:text-xs"
                              align="end"
                            >
                              <UpOpt
                                disabled={!videoFile}
                                index={1}
                                tar={isExtractRaw}
                                setter={setisExtractRaw}
                                ratio={true}
                              >
                                {t("option.raw")} {t("option.video")}
                              </UpOpt>
                              <UpOpt
                                disabled={!convertedVideoUrl}
                                index={2}
                                tar={isExtractRaw}
                                setter={setisExtractRaw}
                                ratio={true}
                              >
                                {t("option.converted")} {t("option.video")}
                              </UpOpt>
                              <UpOpt
                                index={4}
                                tar={isExtractRaw}
                                setter={setisExtractRaw}
                                ratio={true}
                              >
                                {t("option.onlyTimestamp")}
                              </UpOpt>
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
                  onClick={() => checkServerConnection(true)}
                >
                  {(loading & 1) !== 0 ? (
                    <>
                      <Loader className="animate-spin" />
                      Loading..
                    </>
                  ) : (
                    <>
                      <Server className="icon-svg" />
                      Reconnect Server
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
                      <Loader className="icon-svg animate-spin" />
                      Abort!
                    </>
                  ) : (
                    <>
                      <RotateCw className="icon-svg" />
                      {t("btn.ffmpeg")}
                    </>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="rounded-l-none border-l-0 px-2"
                      disabled={
                        (loading & 4) !== 0 || !isFileSelect || !coreLoad
                      }
                    >
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <UpOpt
                      disabled={!imageFile}
                      index={1}
                      tar={isConvert}
                      setter={setIsConvert}
                    >
                      {t("option.transcode")}
                      {t("option.image")}
                    </UpOpt>
                    <UpOpt
                      disabled={!videoFile}
                      index={2}
                      tar={isConvert}
                      setter={setIsConvert}
                    >
                      {t("option.transcode")}
                      {t("option.video")}
                    </UpOpt>
                    <UpOpt index={4} tar={isConvert} setter={setIsConvert}>
                      {t("option.editCmd")}
                    </UpOpt>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isFileSelect && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-auto"
                      disabled={(loading & 6) !== 0}
                    >
                      <Download className="icon-svg" />
                      {t("btn.dl")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="dropdown-content-width-full">
                    {[
                      imageFile,
                      videoFile,
                      convertedImageUrl,
                      convertedVideoUrl,
                      convertedMotionPhoto,
                    ].map(
                      (file, i) =>
                        file &&
                        file.tag !== "raw" && (
                          <DropdownMenuItem
                            key={file.url}
                            className="[&:hover>svg]:visible gap-2"
                            onClick={() => handleDownload(file)}
                          >
                            <span className="flex-auto whitespace-nowrap overflow-hidden text-ellipsis">
                              {t(`option.${file.tag ?? "unknown"}`)} {file.ext}{" "}
                              ({humanFileSize(file.blob.size)})
                            </span>
                            <SquarePen
                              size={16}
                              className="md:invisible hover:bg-card rounded-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRename(file, i);
                              }}
                            />
                          </DropdownMenuItem>
                        )
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="w-full flex items-center justify-center gap-3 mt-2">
              <Progress value={progress} className="flex-auto" />
              <span className="text-xs text-center w-9">{progress}%</span>
            </div>

            <Accordion
              type="single"
              collapsible
              value={accordionValue}
              onValueChange={setAccordionValue}
            >
              <AccordionItem value="motion">
                <AccordionTrigger>
                  🔅{t("title.motion")}
                  <div className="flex ml-auto mr-2 items-center gap-2">
                    <IconButton
                      onAction={() => {
                        setXmpString("");
                      }}
                      icon={BrushCleaning}
                      actionLabel="Clear"
                      successLabel="Cleared"
                    />
                    <IconButton
                      onAction={() =>
                        setXmpString(fixXmp(motionXmpRef.current.xmp))
                      }
                      icon={RotateCw}
                      actionLabel="Restore"
                      successLabel="Restored"
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid w-full gap-2 [&_*]:text-xs p-1">
                    <div className="flex justify-between items-center m-0">
                      <div className="flex items-center gap-2">
                        <label htmlFor="upload-method-switch">XMP meta: </label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="upload-method-switch"
                              variant="outline"
                              disabled={(loading & 6) !== 0}
                              size="icon"
                              className="h-6 w-16"
                            >
                              {t("option." + defaultXmpOpt)}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="min-w-auto **:text-xs">
                            {Object.keys(XmpStrings).map((opt) => (
                              <DropdownMenuItem
                                key={opt}
                                onClick={() => {
                                  setDefaultXmpOpt(opt);
                                  motionXmpRef.current.xmp =
                                    XmpStrings[opt as keyof typeof XmpStrings];
                                  setXmpString(
                                    fixXmp(motionXmpRef.current.xmp)
                                  );
                                }}
                              >
                                {t("option." + opt)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleAlert size={16} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("tips.createMotion")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea
                      rows={8}
                      placeholder="Xmp needed, support google/OPPO/Xiaomi."
                      value={xmpString}
                      onChange={(e) => setXmpString(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={
                        (loading & 6) !== 0 || !(videoFile && imageFile)
                      }
                      onClick={handleCreateMotion}
                    >
                      <LivePhotoIcon /> {t("btn.createMotion")}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      * {t("tips.motiontips")}
                      <br />* {t("tips.imagePrior")}
                      <br />* {t("tips.videoPrior")}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="upload">
                <AccordionTrigger>
                  ⚡️{t("title.upload")}
                  <div className="flex ml-auto mr-2 items-center gap-2">
                    <IconButton
                      onAction={handleCVConfig}
                      actionLabel="Paste"
                      successLabel="Pasted"
                    />
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
                      <label htmlFor="api-url">API URL</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleAlert size={16} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("tips.use")} <i>{`{filename}`}</i>{" "}
                            {t("tips.apiUrl")}
                            <br />
                            {t("tips.use")} <i>{`{ }`}</i> {t("tips.apiUrl2")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <DropdownInput
                      required
                      id="api-url"
                      value={endPoint}
                      disabled={(loading & 8) !== 0}
                      placeholder={
                        reqMode
                          ? "https://r2.cf.com/cdn-cgi/image/format={webp},quality=75,fit=scale-down/{filename}"
                          : "https://api.abc.com/upload/{filename}"
                      }
                      options={serverConfig.map(({ url }, i) => ({
                        id: i,
                        label: url,
                      }))}
                      onDelete={(i) =>
                        setServerConfig(
                          serverConfig.filter((_v, index) => index !== i)
                        )
                      }
                      onChange={(s) => setEndPoint(s)}
                      onSelect={(o) => {
                        setEndPoint(o.label);
                        setEndPointHeader(serverConfig[o.id].headers ?? []);
                        setEndPointBody(serverConfig[o.id].bodys ?? []);
                        setReqMethod(serverConfig[o.id].post || 0);
                        setReqMode(serverConfig[o.id].mode || 0);
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
                          <TooltipContent>{t("tips.reqHeader")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center mb-2">
                      <DropdownInput
                        id="endpointheader"
                        value={endPointHeaderKey}
                        className="rounded-r-none"
                        placeholder="Authorization"
                        options={endPointHeader.map(({ key }, i) => ({
                          id: i,
                          label: key,
                        }))}
                        onDelete={(i) =>
                          setEndPointHeader(
                            endPointHeader.filter((_v, index) => index !== i)
                          )
                        }
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
                            setEndPointHeader([
                              ...endPointHeader,
                              {
                                key: endPointHeaderKey,
                                value: endPointHeaderValue,
                              },
                            ]);
                            setEndPointHeaderKey("");
                            setEndPointHeaderValue("");
                          }
                        }}
                        disabled={(loading & 8) !== 0}
                      >
                        <Plus />
                      </Button>
                    </div>
                    {reqMethod === 0 && (
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
                              <TooltipContent>
                                use <code>{`{File}`}</code> to represent file.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center mb-2">
                          <DropdownInput
                            id="endpointheader"
                            value={endPointBodyKey}
                            className="rounded-r-none"
                            placeholder="file"
                            options={endPointBody.map(({ key }, i) => ({
                              id: i,
                              label: key,
                            }))}
                            onDelete={(i) =>
                              setEndPointBody(
                                endPointBody.filter((_v, index) => index !== i)
                              )
                            }
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
                            onChange={(e) =>
                              setEndPointBodyValue(e.target.value)
                            }
                            className="rounded-none border-x-0 focus:border-x focus:z-99"
                          />
                          <Button
                            variant="outline"
                            type="button"
                            className="px-2 rounded-l-none"
                            onClick={() => {
                              if (endPointBodyKey && endPointBodyValue) {
                                setEndPointBody([
                                  ...endPointBody,
                                  {
                                    key: endPointBodyKey,
                                    value: endPointBodyValue,
                                  },
                                ]);
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
                    <div className="flex justify-start min-h-10 gap-5">
                      <div className="flex items-center gap-2">
                        <label htmlFor="upload-method-switch">Method: </label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              id="upload-method-switch"
                              variant="outline"
                              disabled={(loading & 8) !== 0}
                              size="icon"
                              className="h-6 w-16"
                            >
                              {reqMethods[reqMethod]}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="min-w-auto **:text-xs">
                            {reqMethods.map((method, i) => (
                              <DropdownMenuItem
                                key={method}
                                onClick={() => setReqMethod(i)}
                              >
                                {method}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="request-action-switch">
                          <span className={reqMode ? "opacity-50" : ""}>
                            {t("option.requestUp")}
                          </span>{" "}
                          /
                          <span className={reqMode ? "" : "opacity-50"}>
                            {" "}
                            {t("option.requestDl")}
                          </span>
                        </label>
                        <Switch
                          id="request-action-switch"
                          checked={!!reqMode}
                          onCheckedChange={(checked) => {
                            setReqMode(checked ? 1 : 0);
                            setReqMethod(checked ? 3 : 0);
                          }}
                          disabled={(loading & 8) !== 0}
                        />
                      </div>
                    </div>

                    <div className="flex w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        className="flex-1 rounded-r-none"
                        disabled={
                          (loading & 8) === 0 &&
                          ((isUpload === 0 && reqMode === 0) || !isFileSelect)
                        }
                      >
                        {(loading & 8) !== 0 ? (
                          <>
                            <Loader className="icon-svg animate-spin" />
                            Abort!
                          </>
                        ) : (
                          <>
                            {reqMode ? (
                              <>
                                <Download className="icon-svg" />{" "}
                                {t("btn.download")}
                              </>
                            ) : (
                              <>
                                <UploadIcon className="icon-svg" />{" "}
                                {t("btn.upload")}
                              </>
                            )}{" "}
                            (
                            {reqMode.toString(2).split("1").length - 1 ||
                              isUpload.toString(2).split("1").length - 1 ||
                              t("btn.noUpload")}
                            )
                          </>
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-l-none border-l-0 px-2"
                            disabled={(loading & 8) !== 0 || !isFileSelect}
                          >
                            <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {reqMode ? (
                            <>
                              <UpOpt
                                disabled={!imageFile}
                                index={1}
                                tar={reqMode}
                                setter={setReqMode}
                              >
                                {t("option.raw")}
                                {t("option.image")}
                              </UpOpt>
                              <UpOpt
                                disabled={!videoFile}
                                index={2}
                                tar={reqMode}
                                setter={setReqMode}
                              >
                                {t("option.raw")}
                                {t("option.video")}
                              </UpOpt>
                            </>
                          ) : (
                            [
                              imageFile,
                              videoFile,
                              convertedImageUrl,
                              convertedVideoUrl,
                              motionPhoto,
                              convertedMotionPhoto,
                              heicPhoto,
                            ].map(
                              (file, i) =>
                                file && (
                                  <UpOpt
                                    index={2 ** i}
                                    tar={isUpload}
                                    key={i}
                                    setter={setIsUpload}
                                  >
                                    <div className="flex flex-1 gap-2 [&:hover>svg]:visible">
                                      <span className="flex-auto whitespace-nowrap overflow-hidden text-ellipsis">
                                        {t(`option.${file.tag ?? "unknown"}`)}{" "}
                                        {file.ext} (
                                        {humanFileSize(file.blob.size)})
                                      </span>
                                      <Link
                                        size={16}
                                        className="md:invisible hover:bg-card rounded-sm cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleCopyLink(file);
                                        }}
                                      />
                                    </div>
                                  </UpOpt>
                                )
                            )
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      * {t("tips.uploadtips")}
                      <br />* {t("tips.downloadtips")}
                      <br />* {t("tips.cors")}
                    </p>
                  </form>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="log">
                <AccordionTrigger>
                  📜{t("title.log")}
                  <div className="flex ml-auto mr-2 items-center gap-2">
                    <IconButton
                      icon={BrushCleaning}
                      actionLabel="Clear"
                      successLabel="Cleared"
                      onAction={() => setLogMessages([])}
                    />
                    <IconButton
                      icon={WrapText}
                      onAction={() => setWrapLog(!wrapLog)}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    ref={logContainerRef}
                    className="mt-2 rounded-md overflow-auto max-h-60 overscroll-auto md:overscroll-contain"
                  >
                    <pre
                      className={
                        "p-2 text-sm" +
                        (logMessages.length == 0
                          ? " after:content-['Nothing'] text-center text-gray-400"
                          : "") +
                        (wrapLog ? " whitespace-pre-wrap" : "")
                      }
                    >
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
