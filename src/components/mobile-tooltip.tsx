"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  TooltipProvider as OriginalTooltipProvider,
  Tooltip as OriginalTooltip,
  TooltipTrigger as OriginalTooltipTrigger,
  TooltipContent as OriginalTooltipContent,
} from "./ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import {
  TooltipContentProps,
  TooltipProps,
  TooltipTriggerProps,
  TooltipProviderProps,
} from "@radix-ui/react-tooltip";
import {
  PopoverContentProps,
  PopoverProps,
  PopoverTriggerProps,
} from "@radix-ui/react-popover";

const TouchContext = createContext<boolean | undefined>(undefined);
const useTouch = () => useContext(TouchContext);

export const TooltipProvider = ({
  children,
  ...props
}: TooltipProviderProps) => {
  const [isTouch, setTouch] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  return (
    <TouchContext.Provider value={isTouch}>
      <OriginalTooltipProvider {...props}>{children}</OriginalTooltipProvider>
    </TouchContext.Provider>
  );
};

export const Tooltip = (props: TooltipProps & PopoverProps) => {
  const isTouch = useTouch();

  return isTouch ? <Popover {...props} /> : <OriginalTooltip {...props} />;
};

export const TooltipTrigger = (
  props: TooltipTriggerProps & PopoverTriggerProps
) => {
  const isTouch = useTouch();

  return isTouch ? (
    <PopoverTrigger {...props} />
  ) : (
    <OriginalTooltipTrigger {...props} />
  );
};

export const TooltipContent = (
  props: TooltipContentProps & PopoverContentProps
) => {
  const isTouch = useTouch();

  return isTouch ? (
    <PopoverContent className="text-xs p-2" {...props} />
  ) : (
    <OriginalTooltipContent {...props} />
  );
};