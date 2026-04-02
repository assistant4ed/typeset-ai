import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className = "", ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={[
            "rounded-md border px-3 py-2 text-sm text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:bg-gray-50",
            "bg-white appearance-none cursor-pointer",
            error ? "border-red-400" : "border-gray-300",
            className,
          ].join(" ")}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
