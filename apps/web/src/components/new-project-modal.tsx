"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const BOOK_TYPE_OPTIONS = [
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "children", label: "Children's Book" },
  { value: "academic", label: "Academic" },
  { value: "poetry", label: "Poetry" },
  { value: "comic", label: "Comic" },
  { value: "other", label: "Other" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "A5", label: "A5 (148 × 210 mm)" },
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "US_Trade", label: "US Trade (6 × 9 in)" },
  { value: "US_Letter", label: "US Letter (8.5 × 11 in)" },
  { value: "Digest", label: "Digest (5.5 × 8.5 in)" },
  { value: "Custom", label: "Custom" },
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers?: { id: string; name: string | null }[];
}

interface FormState {
  name: string;
  description: string;
  book_type: string;
  page_size: string;
  assigned_to: string;
  due_date: string;
}

interface FormErrors {
  name?: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  book_type: "novel",
  page_size: "A5",
  assigned_to: "",
  due_date: "",
};

export function NewProjectModal({
  isOpen,
  onClose,
  teamMembers = [],
}: NewProjectModalProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const memberOptions = teamMembers.map((m) => ({
    value: m.id,
    label: m.name ?? m.id,
  }));

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) {
      newErrors.name = "Project name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: Record<string, string | undefined> = {
        name: form.name.trim(),
        description: form.description || undefined,
        book_type: form.book_type,
        page_size: form.page_size,
        assigned_to: form.assigned_to || undefined,
        due_date: form.due_date || undefined,
      };

      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(
          json.error?.message ?? "Failed to create project. Please try again."
        );
        return;
      }

      setForm(INITIAL_FORM);
      onClose();
      router.push(`/projects/${json.data.id}`);
      router.refresh();
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) {
      setForm(INITIAL_FORM);
      setErrors({});
      setServerError(null);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Project" size="lg">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Input
          label="Project Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. The Great Novel"
          error={errors.name}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Brief description of the project (optional)"
            rows={2}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Book Type"
            name="book_type"
            value={form.book_type}
            onChange={handleChange}
            options={BOOK_TYPE_OPTIONS}
          />
          <Select
            label="Page Size"
            name="page_size"
            value={form.page_size}
            onChange={handleChange}
            options={PAGE_SIZE_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {memberOptions.length > 0 && (
            <Select
              label="Assign To"
              name="assigned_to"
              value={form.assigned_to}
              onChange={handleChange}
              options={memberOptions}
              placeholder="Unassigned"
            />
          )}
          <Input
            label="Due Date"
            name="due_date"
            type="date"
            value={form.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
