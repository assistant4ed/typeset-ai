interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      aria-label={name ?? "User avatar"}
      role="img"
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "User avatar"}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-100 text-brand-700">
          {initials}
        </span>
      )}
    </div>
  );
}
