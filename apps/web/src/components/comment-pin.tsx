"use client";

interface CommentPinProps {
  id: string;
  x: number;
  y: number;
  authorName: string;
  content: string;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export function CommentPin({
  id,
  x,
  y,
  authorName,
  content,
  isSelected,
  onClick,
}: CommentPinProps) {
  return (
    <div
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute"
    >
      <button
        onClick={() => onClick(id)}
        aria-label={`Comment by ${authorName}: ${content.slice(0, 50)}`}
        aria-pressed={isSelected}
        className={[
          "relative flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
          "rounded-full border-2 border-white text-xs font-bold text-white shadow-md",
          "transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          "hover:scale-110",
          isSelected ? "bg-brand-600 scale-110" : "bg-brand-500",
        ].join(" ")}
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isSelected && (
        <div
          role="tooltip"
          className="absolute left-8 top-0 z-10 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >
          <p className="text-xs font-semibold text-gray-700">{authorName}</p>
          <p className="mt-1 text-sm text-gray-900">{content}</p>
        </div>
      )}
    </div>
  );
}
