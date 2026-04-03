interface CssDiffViewProps {
  patch: string;
}

interface DiffLine {
  type: "added" | "removed" | "context" | "header";
  content: string;
}

function parsePatch(patch: string): DiffLine[] {
  return patch.split("\n").map((line) => {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
      return { type: "header", content: line };
    }
    if (line.startsWith("+")) return { type: "added", content: line.slice(1) };
    if (line.startsWith("-")) return { type: "removed", content: line.slice(1) };
    return { type: "context", content: line.startsWith(" ") ? line.slice(1) : line };
  });
}

export function CssDiffView({ patch }: CssDiffViewProps) {
  if (!patch) return null;

  const lines = parsePatch(patch);

  return (
    <div
      aria-label="Design changes"
      className="overflow-auto rounded-lg border border-gray-200 font-mono text-xs"
    >
      {lines.map((line, idx) => {
        const lineClasses = {
          added: "bg-green-50 text-green-800",
          removed: "bg-red-50 text-red-800 line-through",
          header: "bg-gray-100 text-gray-500",
          context: "text-gray-700",
        }[line.type];

        return (
          <div
            key={idx}
            className={["px-3 py-0.5 leading-relaxed", lineClasses].join(" ")}
          >
            <span aria-hidden="true" className="mr-2 select-none opacity-50">
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            <span>{line.content}</span>
          </div>
        );
      })}
    </div>
  );
}
