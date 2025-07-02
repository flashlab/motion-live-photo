import { useState, useRef, useEffect, InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown, X } from 'lucide-react';
import { cn } from "@/lib/utils";

type Option = {
  id: number;
  label: string;
};

type DropdownInputProps = {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  onDelete?: (index: number) => void;
  onSelect?: (option: Option) => void;
  withFilter?: boolean; // If true, do not filter options based on input
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect' | 'value'>;

export default function DropdownInput({
  options = [], // Default empty array to prevent undefined
  value = '',
  onChange,
  onDelete,
  onSelect,
  withFilter = false,
  ...props
}: DropdownInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on input
  useEffect(() => {
    if (!withFilter || value.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => 
        option.label.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [value, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e.target.value);
  }

  const handleOptionSelect = (option: Option) => {
    setIsOpen(false);
    if (onSelect) onSelect(option);
    if (onChange) onChange(option.label);
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        className={cn("pr-10")}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronsUpDown className="h-4 w-4 text-gray-400" />
      </div>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-27 overflow-auto"
        >
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.id}
                  className="flex px-3 py-2 hover:bg-gray-100 cursor-pointer [&:hover>svg]:block"
                  onClick={() => handleOptionSelect(option)}
                >
                  <span className='flex-auto whitespace-nowrap overflow-hidden text-ellipsis'>{option.label}</span>
                  {onDelete && (
                    <X size={16}
                      className='md:hidden bg-gray-200 hover:bg-gray-300 rounded-sm'
                      onClick={(e) => {e.stopPropagation(); onDelete(option.id)}}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-2 text-gray-500">No options found</div>
          )}
        </div>
      )}
    </div>
  );
}