import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  hasError?: boolean;
}

export function DatePickerWithInput({
  value,
  onChange,
  placeholder = "ДД.ММ.ГГГГ",
  disabled,
  className,
  hasError,
}: DatePickerWithInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "dd.MM.yyyy") : ""
  );

  // Синхронизируем input с value при изменении извне
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd.MM.yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Автоматически добавляем точки при вводе
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 2) {
      val = digits;
    } else if (digits.length <= 4) {
      val = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    } else {
      val = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
    }
    
    setInputValue(val);

    // Пытаемся распарсить дату
    if (val.length === 10) {
      const parsed = parse(val, "dd.MM.yyyy", new Date());
      if (isValid(parsed)) {
        // Проверяем, не отключена ли эта дата
        if (!disabled || !disabled(parsed)) {
          onChange(parsed);
        }
      }
    }
  };

  const handleInputBlur = () => {
    // При потере фокуса возвращаем к текущему значению, если ввод некорректный
    if (inputValue.length > 0 && inputValue.length < 10) {
      if (value) {
        setInputValue(format(value, "dd.MM.yyyy"));
      } else {
        setInputValue("");
      }
    } else if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd.MM.yyyy", new Date());
      if (!isValid(parsed) || (disabled && disabled(parsed))) {
        if (value) {
          setInputValue(format(value, "dd.MM.yyyy"));
        } else {
          setInputValue("");
        }
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setInputValue(format(date, "dd.MM.yyyy"));
    }
    setOpen(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={cn(
          "flex-1",
          hasError && "border-destructive"
        )}
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(hasError && "border-destructive")}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background border shadow-lg z-50" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleCalendarSelect}
            disabled={disabled}
            defaultMonth={value || undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
