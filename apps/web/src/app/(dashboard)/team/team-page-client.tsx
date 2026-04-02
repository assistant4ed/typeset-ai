"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DbUser, UserRole } from "@/lib/supabase/types";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

interface TeamPageClientProps {
  users: DbUser[];
  currentUserId: string;
}

export function TeamPageClient({ users, currentUserId }: TeamPageClientProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const json = await res.json();

      if (!res.ok) {
        setInviteError(json.error?.message ?? "Failed to invite user.");
        return;
      }

      setInviteSuccess(`${inviteEmail} has been added to the team.`);
      setInviteEmail("");
      router.refresh();
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingUserId(userId);
    try {
      await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      router.refresh();
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDeactivate(userId: string, isActive: boolean) {
    setUpdatingUserId(userId);
    try {
      await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      router.refresh();
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Team</h1>

      {/* Invite form */}
      <section aria-labelledby="invite-heading" className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 id="invite-heading" className="mb-4 text-base font-semibold text-gray-900">
          Invite Team Member
        </h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="flex-1 min-w-48">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              error={inviteError ?? undefined}
            />
          </div>
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            className="w-36"
          />
          <Button type="submit" isLoading={isInviting} className="self-end">
            Invite
          </Button>
        </form>
        {inviteSuccess && (
          <p role="status" className="mt-3 text-sm text-green-600">
            {inviteSuccess}
          </p>
        )}
      </section>

      {/* User list */}
      <section aria-labelledby="team-members-heading">
        <h2 id="team-members-heading" className="mb-3 text-base font-semibold text-gray-900">
          Members ({users.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm" aria-label="Team members">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500">
                  Member
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const isUpdating = updatingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} name={user.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name ?? "—"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-gray-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isCurrentUser ? (
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            ROLE_BADGE_CLASSES[user.role],
                          ].join(" ")}
                        >
                          {user.role}
                        </span>
                      ) : (
                        <Select
                          aria-label={`Change role for ${user.name ?? user.email}`}
                          options={ROLE_OPTIONS}
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole)
                          }
                          disabled={isUpdating}
                          className="w-28 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? "default" : "archived"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isCurrentUser && (
                        <Button
                          variant={user.is_active ? "danger" : "secondary"}
                          size="sm"
                          isLoading={isUpdating}
                          onClick={() => handleDeactivate(user.id, user.is_active)}
                          aria-label={`${user.is_active ? "Deactivate" : "Reactivate"} ${user.name ?? user.email}`}
                        >
                          {user.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
