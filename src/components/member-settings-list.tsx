"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import { memberPalette } from "@/lib/constants";
import { Dialog } from "@/components/ui/dialog";

type Member = {
  id: string;
  displayName: string;
  color: string;
  role: "owner" | "admin" | "member";
  weeklyCapacityMinutes: number | null;
  userId: string | null;
};

type MemberSettingsListProps = {
  householdId: string;
  members: Member[];
  canManage: boolean;
  currentUserId: string;
};

export function MemberSettingsList({
  householdId,
  members,
  canManage,
  currentUserId,
}: MemberSettingsListProps) {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<string>("");
  const editingMember = useMemo(
    () => members.find((member) => member.id === editingMemberId) ?? null,
    [editingMemberId, members],
  );

  return (
    <>
      <div className="space-y-3">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const canEdit = canManage || isSelf;

          return (
            <div key={member.id} className="soft-panel flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="size-3 rounded-full" style={{ backgroundColor: member.color }} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{member.displayName}</p>
                    {isSelf ? <span className="stat-pill px-2 py-0.5 text-[11px]">Moi</span> : null}
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">{member.role}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {member.weeklyCapacityMinutes ? (
                  <span className="stat-pill px-3 py-1 text-xs">{member.weeklyCapacityMinutes} min</span>
                ) : null}
                {canEdit ? (
                  <button
                    className="btn-quiet inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                    onClick={() => {
                      setEditingMemberId(member.id);
                      setEditingColor(member.color);
                    }}
                    type="button"
                  >
                    <Pencil className="size-4" />
                    Modifier
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        isOpen={!!editingMember}
        onClose={() => {
          setEditingMemberId(null);
          setEditingColor("");
        }}
        title={editingMember ? `Modifier ${editingMember.displayName}` : "Modifier le membre"}
      >
        {editingMember ? (
          <form
            action={`/api/households/${householdId}/members/${editingMember.id}`}
            className="compact-form-grid"
            method="post"
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const headers: Record<string, string> = {};
              const csrfMatch = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
              if (csrfMatch?.[1]) headers["x-csrf-token"] = csrfMatch[1];
              const res = await fetch(`/api/households/${householdId}/members/${editingMember.id}`, { method: "POST", body: formData, headers });
              if (res.ok || res.redirected) {
                setEditingMemberId(null);
                window.location.reload();
              }
            }}
          >
            <input name="_method" type="hidden" value="PUT" />
            <input name="color" type="hidden" value={editingColor || editingMember.color} />
            <label className="field-label">
              <span>Nom</span>
              <input className="field" defaultValue={editingMember.displayName} name="displayName" required type="text" />
            </label>

            <div className="field-label">
              <span>Couleur</span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="field h-[3.2rem] w-[4.5rem] px-2"
                  onChange={(event) => setEditingColor(event.currentTarget.value)}
                  type="color"
                  value={editingColor || editingMember.color}
                />
                <div className="flex flex-wrap gap-2">
                  {memberPalette.slice(0, 10).map((color) => (
                    <button
                      aria-label={`Choisir la couleur ${color}`}
                      className="flex cursor-pointer items-center"
                      key={color}
                      onClick={() => setEditingColor(color)}
                      type="button"
                    >
                      <span
                        className="size-7 rounded-full border-2"
                        style={{
                          backgroundColor: color,
                          borderColor: (editingColor || editingMember.color) === color ? "var(--ink-950)" : "rgba(0,0,0,0.08)",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {canManage ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field-label">
                    <span>Rôle</span>
                    <select className="field" defaultValue={editingMember.role} name="role">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </label>
                  <label className="field-label">
                    <span>Capacité hebdo</span>
                    <input
                      className="field"
                      defaultValue={editingMember.weeklyCapacityMinutes ?? ""}
                      min="0"
                      name="weeklyCapacityMinutes"
                      placeholder="Minutes"
                      type="number"
                    />
                  </label>
                </div>
              </>
            ) : null}

            <div className="mt-2 flex justify-end gap-3">
              <button
                className="btn-quiet px-4 py-2.5 text-sm font-semibold"
                onClick={() => {
                  setEditingMemberId(null);
                  setEditingColor("");
                }}
                type="button"
              >
                Annuler
              </button>
              <button className="btn-primary px-4 py-2.5 text-sm font-semibold" type="submit">
                Enregistrer
              </button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </>
  );
}
