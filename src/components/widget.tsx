import { Input } from "@/components/ui/input";
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { LucideProps } from "lucide-react";

export function InputBtn({
  icon: Icon,
  tar,
  setter: Setter,
  onclick,
  placeholder,
  classinput,
  classicon,
}: {
  icon: React.FC<LucideProps>;
  tar: number;
  setter: React.Dispatch<React.SetStateAction<number>>;
  onclick?: () => void;
  placeholder?: string;
  classinput?: string;
  classicon?: string;
}) {
  return (
    <div className="relative">
      <div
        className={`absolute left-0 h-full w-6 bg-secondary/70 flex justify-center items-center rounded-l-md text-gray-500 ${
          onclick ? "cursor-pointer hover:bg-secondary" : ""
        } ${classicon}`}
        onClick={onclick}
      >
        <Icon size={15} />
      </div>
      <Input
        type="number"
        step={0.1}
        value={tar}
        placeholder={placeholder}
        onChange={(e) => Setter(e.target.valueAsNumber)}
        className={`md:text-xs h-7 pl-7 ${classinput}`}
        autoComplete="off"
      />
    </div>
  );
}

export function UpOpt({
  children,
  disabled,
  index,
  tar,
  setter,
  ratio = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  index: number;
  tar: number;
  setter: React.Dispatch<React.SetStateAction<number>>;
  ratio?: boolean;
}) {
  return (
    <DropdownMenuCheckboxItem
      checked={(tar & index) !== 0}
      disabled={disabled}
      onCheckedChange={(checked) => {
        if (ratio) setter(index);
        else setter(checked ? tar | index : tar & ~index);
      }}
      // Prevent the dropdown menu from closing when the checkbox is clicked
      onSelect={(e) => e.preventDefault()}
    >
      {children}
    </DropdownMenuCheckboxItem>
  );
}
