import React, { useState, useEffect } from 'react';
import { Copy, Check, X, LucideIcon } from 'lucide-react';

interface IconButtonProps {
  /**
   * The icon to display by default (before action)
   * @default Copy
   */
  icon?: LucideIcon;
  
  /**
   * The icon to display after successful action
   * @default Check
   */
  successIcon?: LucideIcon;
  
  /**
   * Callback function to execute when the button is clicked
   * Should return a Promise that resolves when the operation is complete
   * or rejects when there's an error
   */
  onAction: (event: React.MouseEvent<SVGSVGElement>, params?: unknown) => Promise<void> | void;
  
   /**
   * Optional additional parameters to pass to the onAction callback
   */
   actionParams?: unknown;

  /**
   * Size of the icon
   * @default 20
   */
  size?: number;
  
  /**
   * Duration to show the success icon in milliseconds
   * @default 3000
   */
  successDuration?: number;
  
  /**
   * Button aria-label and title for default state
   * @default "Copy"
   */
  actionLabel?: string;
  
  /**
   * Button aria-label and title for success state
   * @default "Copied"
   */
  successLabel?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon = Copy,
  successIcon: SuccessIcon = Check,
  onAction,
  actionParams,
  size = 16,
  successDuration = 3000,
  actionLabel = "Copy",
  successLabel = "Copied"
}) => {
  const [success, setSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (success || isError) {
      timeout = setTimeout(() => {
        setSuccess(false);
        setIsError(false);
      }, successDuration);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [success, isError, successDuration]);
  
  const handleClick = async (event: React.MouseEvent<SVGSVGElement>) => {
    event.stopPropagation();
    try {
      await onAction(event, actionParams);
      setSuccess(true);
      setIsError(false);
    } catch (error) {
      setIsError(true);
      console.error("Error:", error);
    }
  };
  
  return (
    <>
      {isError ? (
        <X size={size} className="text-red-500" />
      ) : success ? (
        <SuccessIcon size={size} className="text-green-500" />
      ) : (
        <Icon
          size={size}
          onClick={(e) => { void handleClick(e); }}
          aria-label={success ? successLabel : actionLabel}
          role="button"
        />
      )}
    </>
  )
};

export default IconButton;