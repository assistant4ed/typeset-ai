"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommentPin } from "@/components/comment-pin";

interface Comment {
  id: string;
  page_number: number;
  x_position: number;
  y_position: number;
  content: string;
  author_name: string;
  created_at: string;
}

interface ShareViewerProps {
  token: string;
  projectName: string;
  pageCount: number;
  permissions: "view" | "comment";
  initialComments: Comment[];
}

export function ShareViewer({
  token,
  projectName,
  pageCount,
  permissions,
  initialComments,
}: ShareViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const pageComments = comments.filter((c) => c.page_number === currentPage);

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isAddingComment || !permissions) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
  }

  async function submitComment() {
    if (!pendingPin || !commentText.trim() || !authorName.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          author_name: authorName.trim(),
          page_number: currentPage,
          x_position: pendingPin.x,
          y_position: pendingPin.y,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setComments((prev) => [...prev, json.data]);
        setPendingPin(null);
        setCommentText("");
        setIsAddingComment(false);
      }
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleApprove() {
    if (!authorName.trim()) {
      setApproveError("Please enter your name to approve.");
      return;
    }

    setIsApproving(true);
    setApproveError(null);

    try {
      const res = await fetch(`/api/v1/share/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: authorName.trim() }),
      });

      if (res.ok) {
        setIsApproved(true);
      } else {
        const json = await res.json().catch(() => ({}));
        setApproveError(json.error?.message ?? "Approval failed. Please try again.");
      }
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Review Request
          </p>
          <h1 className="text-lg font-semibold text-gray-900">{projectName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-brand-500 font-medium">
            TypeSet AI
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Page preview */}
        <main className="flex flex-1 flex-col">
          {/* Preview */}
          <div
            className={[
              "relative flex flex-1 items-center justify-center p-6",
              isAddingComment ? "cursor-crosshair" : "",
            ].join(" ")}
            onClick={handlePreviewClick}
            aria-label={
              isAddingComment
                ? "Click on the page to place your comment"
                : `Page ${currentPage} of ${pageCount}`
            }
          >
            <div className="relative aspect-[3/4] h-full max-h-[calc(100vh-220px)] bg-white shadow-xl rounded-sm">
              {/* Page content placeholder */}
              <div className="flex h-full items-center justify-center text-gray-200">
                <p className="text-sm">Page {currentPage}</p>
              </div>

              {/* Comment pins */}
              {pageComments.map((comment) => (
                <CommentPin
                  key={comment.id}
                  id={comment.id}
                  x={comment.x_position}
                  y={comment.y_position}
                  authorName={comment.author_name}
                  content={comment.content}
                  isSelected={selectedCommentId === comment.id}
                  onClick={(id) =>
                    setSelectedCommentId((prev) => (prev === id ? null : id))
                  }
                />
              ))}

              {/* Pending pin */}
              {pendingPin && (
                <div
                  style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                  aria-hidden="true"
                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 border-2 border-white shadow-md animate-pulse"
                />
              )}
            </div>
          </div>

          {/* Page nav */}
          <nav
            aria-label="Page navigation"
            className="flex shrink-0 items-center justify-center gap-4 border-t border-gray-200 bg-white py-3"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              Prev
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              Next
            </Button>
          </nav>
        </main>

        {/* Sidebar */}
        <aside
          aria-label="Review sidebar"
          className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white"
        >
          <div className="flex flex-col gap-4 overflow-y-auto flex-1 p-4">
            {/* Your name */}
            <Input
              label="Your Name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Jane Smith"
            />

            {/* Comment controls */}
            {permissions === "comment" && (
              <div className="flex flex-col gap-2">
                <Button
                  variant={isAddingComment ? "secondary" : "primary"}
                  onClick={() => {
                    setIsAddingComment((prev) => !prev);
                    setPendingPin(null);
                  }}
                >
                  {isAddingComment ? "Cancel" : "Add Comment"}
                </Button>

                {pendingPin && (
                  <div className="flex flex-col gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-xs font-medium text-yellow-700">
                      Comment placed. Add your note:
                    </p>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Type your comment..."
                      rows={3}
                      aria-label="Comment text"
                      className="resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Button
                      size="sm"
                      onClick={submitComment}
                      isLoading={isSubmittingComment}
                      disabled={!commentText.trim() || !authorName.trim()}
                    >
                      Post Comment
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Comments list */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Comments ({pageComments.length})
              </h2>
              {pageComments.length === 0 ? (
                <p className="text-sm text-gray-400">No comments on this page.</p>
              ) : (
                <ul aria-label="Comments" className="space-y-3">
                  {pageComments.map((comment) => (
                    <li
                      key={comment.id}
                      className={[
                        "rounded-lg border p-3 cursor-pointer transition-colors",
                        selectedCommentId === comment.id
                          ? "border-brand-300 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300",
                      ].join(" ")}
                      onClick={() =>
                        setSelectedCommentId((prev) =>
                          prev === comment.id ? null : comment.id
                        )
                      }
                    >
                      <p className="text-xs font-semibold text-gray-600">
                        {comment.author_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-900">{comment.content}</p>
                      <time
                        dateTime={comment.created_at}
                        className="mt-1 block text-xs text-gray-400"
                      >
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(comment.created_at))}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Approve section */}
          <div className="shrink-0 border-t border-gray-200 p-4">
            {isApproved ? (
              <div
                role="status"
                className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 text-center font-medium"
              >
                Approved — thank you!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {approveError && (
                  <p role="alert" className="text-xs text-red-600">{approveError}</p>
                )}
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={isApproving}
                  disabled={!authorName.trim()}
                  className="w-full"
                >
                  Approve Proof
                </Button>
                <p className="text-center text-xs text-gray-400">
                  Clicking approve marks this proof as accepted.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
