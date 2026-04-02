interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export function Spinner({ size = "md", label = "Loading..." }: SpinnerProps) {
  return (
    <div role="status" aria-label={label} className="flex items-center justify-center">
      <div
        aria-hidden="true"
        className={[
          "animate-spin rounded-full border-gray-300 border-t-brand-500",
          SIZE_CLASSES[size],
        ].join(" ")}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
