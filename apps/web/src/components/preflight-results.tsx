import type { PreflightResult } from "@typeset-ai/core";

interface PreflightResultsProps {
  result: PreflightResult;
}

export function PreflightResults({ result }: PreflightResultsProps) {
  const { errors, warnings } = result;

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        All preflight checks passed — ready to export.
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="Preflight results">
      {errors.map((issue) => (
        <div
          key={`error-${issue.code}`}
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <span className="font-medium">Error [{issue.code}]</span>
            {issue.page != null && <span> · Page {issue.page}</span>}
            <p>{issue.message}</p>
          </div>
        </div>
      ))}
      {warnings.map((issue) => (
        <div
          key={`warning-${issue.code}`}
          className="flex items-start gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700"
        >
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <span className="font-medium">Warning [{issue.code}]</span>
            {issue.page != null && <span> · Page {issue.page}</span>}
            <p>{issue.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
