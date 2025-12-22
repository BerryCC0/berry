"use client";

/**
 * Settings Control Components
 * Reusable form controls for settings panels
 */

import styles from "./Controls.module.css";

/**
 * Toggle Switch
 */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

/**
 * Select Dropdown
 */
interface SelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: SelectProps<T>) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Slider
 */
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  unit?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  showValue,
  unit = "",
}: SliderProps) {
  return (
    <div className={styles.sliderContainer}>
      <input
        type="range"
        className={styles.slider}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
      {showValue && (
        <span className={styles.sliderValue}>
          {value}
          {unit}
        </span>
      )}
    </div>
  );
}

/**
 * Color Picker
 */
interface ColorPickerProps {
  value: string;
  presets?: { name: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorPicker({
  value,
  presets,
  onChange,
  disabled,
}: ColorPickerProps) {
  return (
    <div className={styles.colorPickerContainer}>
      {presets && (
        <div className={styles.colorPresets}>
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`${styles.colorPreset} ${value === preset.value ? styles.colorPresetActive : ""}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => !disabled && onChange(preset.value)}
              title={preset.name}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      <input
        type="color"
        className={styles.colorInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Button
 */
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  size?: "small" | "medium";
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  size = "medium",
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/**
 * Text Input
 */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: TextInputProps) {
  return (
    <input
      type="text"
      className={styles.textInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

/**
 * Chip List - for displaying removable items
 */
interface ChipListProps {
  items: { id: string; label: string }[];
  onRemove: (id: string) => void;
}

export function ChipList({ items, onRemove }: ChipListProps) {
  if (items.length === 0) {
    return <span className={styles.emptyText}>None</span>;
  }
  
  return (
    <div className={styles.chipList}>
      {items.map((item) => (
        <span key={item.id} className={styles.chip}>
          {item.label}
          <button
            type="button"
            className={styles.chipRemove}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.label}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

