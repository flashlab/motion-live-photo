import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { cn } from "@/lib/utils";
import { FlipHorizontal } from "lucide-react";

const aspectRatios = [
  [2, 3],
  [3, 4],
  [16, 9],
  [3, 2],
  [4, 3],
  [1, 1],
];

const AspectRatioIcon = ({
  width,
  height,
  isActive,
}: {
  width: number;
  height: number;
  isActive: boolean;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 42 42`}
      className={
        isActive
          ? "text-white dark:text-black [&_rect]:fill-muted-foreground [&_rect]:stroke-muted-foreground"
          : ""
      }
    >
      <rect
        width={width > height ? 36 : (width * 36) / height}
        height={height > width ? 36 : (height * 36) / width}
        x={width > height ? 3 : 21 - (width * 18) / height}
        y={height > width ? 3 : 21 - (height * 18) / width}
        rx="4"
        fill={isActive ? "currentColor" : "transparent"}
        stroke="currentColor"
        strokeWidth={2}
        opacity={isActive ? 1 : 0.6}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".35em"
        fontSize="14"
        fill="currentColor"
        fontWeight={isActive ? "600" : "500"}
      >
        {width}:{height}
      </text>
    </svg>
  );
};

export function MyCropper({
  imageUrl,
  onAspectUpdate,
  onCropUpdate,
  onRotateUpdate,
}: {
  imageUrl: string | undefined;
  onAspectUpdate: (aspect: number) => void;
  onCropUpdate: (crop: Area) => void;
  onRotateUpdate: (rotate: number[]) => void;
}) {
  const [cropAspect, setCropAspect] = useState<number>(2 / 3);
  const [cropState, setCropState] = useState<Point>({ x: 0, y: 0 });
  const [rotationState, setRotationState] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [zoomState, setZoomState] = useState(1);

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    onCropUpdate(croppedAreaPixels);
  };
  const optionList = aspectRatios.map((ratio) => (
    <Button
      size="icon"
      variant="secondary"
      key={ratio.join("-")}
      className={cn(
        "bg-transparent h-9 w-9 [&>svg]:size-7",
        "hover:bg-muted/60 focus-visible:bg-muted/60",
        "transition-colors duration-200",
        {
          "bg-muted hover:bg-muted focus-visible:bg-muted":
            cropAspect === ratio[0] / ratio[1],
        }
      )}
      onClick={() => {
        setCropAspect(ratio[0] / ratio[1]);
        onAspectUpdate(ratio[0] / ratio[1]);
      }}
    >
      <AspectRatioIcon
        width={ratio[0]}
        height={ratio[1]}
        isActive={cropAspect === ratio[0] / ratio[1]}
      />
    </Button>
  ));
  // 计算完整的 transform 字符串
  const getTransform = (): string => {
    return [
      `translate(${cropState.x}px, ${cropState.y}px)`,
      `rotateZ(${rotationState}deg)`,
      flipHorizontal ? "rotateY(180deg)" : "",
      `scale(${zoomState})`,
    ]
      .filter(Boolean)
      .join(" ");
  };

  // 更新 FFmpeg transpose 数组
  useEffect(() => {
    const rotationIndex = (rotationState / 90) % 4; // 0, 1, 2, 3

    // 8 combinations: 4 rotations with 2 flip states
    const transposeMap: { [key: string]: number[] } = {
      // 无翻转
      "0_false": [], // 0°
      "1_false": [1], // 90°
      "2_false": [1, 1], // 180°
      "3_false": [2], // 270°
      // 水平翻转
      "0_true": [3, 2], // 0° + 水平翻转
      "1_true": [3], // 90° + 水平翻转
      "2_true": [0, 2], // 180° + 水平翻转
      "3_true": [0], // 270° + 水平翻转
    };

    const key = `${rotationIndex}_${flipHorizontal}`;
    const transposeArray = transposeMap[key] || [];
    onRotateUpdate(transposeArray);
  }, [rotationState, flipHorizontal, onRotateUpdate]);

  return (
    <div className="grid w-full gap-2">
      <div className="relative aspect-square">
        <Cropper
          image={imageUrl}
          aspect={cropAspect}
          crop={cropState}
          rotation={rotationState}
          zoom={zoomState}
          transform={getTransform()}
          onCropChange={setCropState}
          onRotationChange={setRotationState}
          onCropComplete={onCropComplete}
          onZoomChange={setZoomState}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 mr-3">{optionList}</div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setFlipHorizontal(!flipHorizontal)}
          >
            <FlipHorizontal
              size={15}
              className={cn("transition-colors", {
                "text-zinc-500": !flipHorizontal,
                "text-zinc-950": flipHorizontal,
              })}
            />
          </Button>
        </div>
        <div className="flex flex-1 items-center gap-2 min-w-40">
          <Slider
            value={[rotationState]}
            min={0}
            max={270}
            step={90}
            aria-labelledby="Rotation"
            onValueChange={([v]) => setRotationState(v)}
          />
          <span className="text-sm w-4">{rotationState}°</span>
        </div>
      </div>
    </div>
  );
}
