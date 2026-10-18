import type { ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { fieldVariants } from "./variants";
import { floatingSurfaceClass } from "./Popover";
import { uiStrings } from "./strings";

export interface SelectOption {
  /** Non-empty string (Radix reserves "" for clearing). */
  value: string;
  label: ReactNode;
  /** Plain text used for type-ahead when `label` is not a string. */
  textValue?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = uiStrings.selectPlaceholder,
  size = "md",
  disabled,
  name,
  id,
  className,
  ...props
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={props["aria-label"]}
        className={cn(
          fieldVariants({ size }),
          "inline-flex items-center justify-between gap-2 text-left data-[placeholder]:text-text-faint",
          "[&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon className="text-text-muted">
          <ChevronDown aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            floatingSurfaceClass,
            "max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width)",
            "origin-(--radix-select-content-transform-origin) overflow-hidden",
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                textValue={option.textValue}
                disabled={option.disabled}
                className={cn(
                  "relative flex h-[34px] cursor-pointer items-center gap-2 rounded-sm pr-8 pl-3 text-base outline-none select-none",
                  "data-[highlighted]:bg-surface-hover data-[state=checked]:font-semibold",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  "[&_svg]:size-4 [&_svg]:shrink-0",
                )}
              >
                {option.icon}
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 text-accent">
                  <Check aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
