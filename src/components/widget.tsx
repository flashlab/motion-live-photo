import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { LucideProps, Camera } from "lucide-react";
export function PixBox({ children, labelid, value, onChange }:
                       {children: React.ReactElement[], labelid: string, value: number, onChange: React.ChangeEventHandler<HTMLInputElement>}) {
    return (
      <div>
        <label htmlFor={labelid}>
          {children}
        </label>
        <Input
          id={labelid}
          type="number"
          onChange={onChange}
          value={value}
        />
      </div>
    )
  };

  export function InputBtn({ icon: Icon, tar, setter:Setter, videoRef }:
    {icon: React.FC<LucideProps>, tar: number, setter: React.Dispatch<React.SetStateAction<number>>, videoRef:React.RefObject<HTMLVideoElement | null>}) {
    return (
      <div className="flex gap-2 items-center">
        <Icon size={15} className="text-gray-500"/>
        <Input
          type="number"
          step={0.1}
          className="flex-1 pl-7 -ml-7"
          value={tar}
          placeholder="seconds"
          onChange={e => Setter(e.target.valueAsNumber)}
          autoComplete="off"
        />
        <Button
          className="rounded-full"
          size="icon"
          onClick={() => videoRef.current && Setter(videoRef.current.currentTime)}
        >
          <Camera />
        </Button>
      </div>
    )
  }

export function UpOpt({ children, disabled, index, tar, setter, ratio = false }:
    {children: React.ReactNode, disabled?: boolean, index: number, tar: number,
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