'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { AdminTable, Badge, Card, ConfirmButton, EmptyRow, SaveStatus, formatDate, type SaveState } from './ui';
import { Button } from '@/components/ui';

interface UserRow {
  id: number;
  email: string;
  name: string;
  is_active: number;
  last_login_at: number | null;
  created_at: number;
  locked_until: number | null;
  role_slug: string;
  role_name: string;
  role_id: number;
}

interface RoleRow {
  id: number;
  slug: string;
  name: string;
  description: string;
}

/**
 * User administration.
 *
 * Creating an account returns a one-time password that is shown here and
 * nowhere else — it is not emailed, not logged and not stored in plaintext.
 * The new account must rotate it at first sign-in.
 */
export function UsersManager({ users, roles }: { users: UserRow[]; roles: RoleRow[] }) {
  const { api, user: currentUser } = useAdmin();
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  async function remove(id: number) {
    const res = await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    if (res.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      setState({ status: 'error', message: json?.error?.message ?? 'Delete failed' });
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <SaveStatus state={state} />
        <Button type="button" onClick={() => setCreating(true)} className="py-2.5">
          NEW USER
        </Button>
      </div>

      {tempPassword && (
        <Card className="mb-6 border-signal/50 bg-signal/5">
          <h2 className="tech-label mb-3 text-signal">One-time password for {tempPassword.email}</h2>
          <p className="mb-3 break-all font-mono text-lg text-chalk">{tempPassword.password}</p>
          <p className="text-xs text-muted">
            Shown once only. Pass it to the user over a secure channel — they must change it at first
            sign-in. It is not stored in plaintext and does not appear in the audit log.
          </p>
          <button
            type="button"
            onClick={() => setTempPassword(null)}
            className="mt-4 font-mono text-tech-sm uppercase text-mist"
          >
            Dismiss
          </button>
        </Card>
      )}

      <AdminTable head={['Name', 'Email', 'Role', 'Status', 'Last sign-in', '']}>
        {users.length === 0 ? (
          <EmptyRow colSpan={6}>No users.</EmptyRow>
        ) : (
          users.map((u) => (
            <tr key={u.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-3 text-sm text-chalk">
                {u.name}
                {u.email === currentUser.email && (
                  <span className="ml-2 font-mono text-tech-sm uppercase text-muted">(you)</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-mist">{u.email}</td>
              <td className="px-4 py-3">
                <Badge tone={u.role_slug === 'super_admin' ? 'accent' : 'neutral'}>{u.role_name}</Badge>
              </td>
              <td className="px-4 py-3">
                {u.is_active === 1 ? (
                  u.locked_until && u.locked_until * 1000 > Date.now() ? (
                    <Badge tone="warn">Locked</Badge>
                  ) : (
                    <Badge tone="ok">Active</Badge>
                  )
                ) : (
                  <Badge tone="neutral">Disabled</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {u.last_login_at ? formatDate(u.last_login_at) : 'Never'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setEditing(u)}
                    className="font-mono text-tech-sm uppercase text-mist hover:text-chalk"
                  >
                    Edit
                  </button>
                  {u.email !== currentUser.email && (
                    <ConfirmButton label="Delete" confirmLabel="Delete?" onConfirm={() => remove(u.id)} />
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {(editing || creating) && (
        <UserForm
          user={editing}
          roles={roles}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={(temp) => {
            setEditing(null);
            setCreating(false);
            if (temp) setTempPassword(temp);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function UserForm({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  roles: RoleRow[];
  onClose: () => void;
  onSaved: (temp: { email: string; password: string } | null) => void;
}) {
  const { api } = useAdmin();
  const isNew = user === null;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: 'saving' });
    setErrors({});

    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get('email') ?? ''),
      name: String(form.get('name') ?? ''),
      role_id: Number(form.get('role_id')),
      is_active: form.get('is_active') === 'on',
    };

    const res = await api(isNew ? '/api/admin/users' : `/api/admin/users/${user!.id}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      setState({ status: 'saved' });
      onSaved(
        isNew && json.data?.temporaryPassword
          ? { email: payload.email, password: json.data.temporaryPassword }
          : null,
      );
      return;
    }
    setErrors((json?.error?.details as Record<string, string>) ?? {});
    setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'New user' : 'Edit user'}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-void/95 p-6 backdrop-blur-sm"
    >
      <form onSubmit={submit} className="w-full max-w-lg border border-hairline bg-midnight">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-mono text-tech uppercase text-chalk">{isNew ? 'New user' : 'Edit user'}</h2>
          <button type="button" onClick={onClose} className="font-mono text-tech uppercase text-mist">
            CLOSE
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label htmlFor="user-name" className="field-label">
              Name
            </label>
            <input id="user-name" name="name" type="text" required defaultValue={user?.name} className="field-input" />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="user-email" className="field-label">
              Email
            </label>
            <input
              id="user-email"
              name="email"
              type="email"
              required
              defaultValue={user?.email}
              className="field-input"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="user-role" className="field-label">
              Role
            </label>
            <select id="user-role" name="role_id" defaultValue={user?.role_id ?? roles[0]?.id} className="field-input">
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">
              {roles.find((r) => r.id === (user?.role_id ?? roles[0]?.id))?.description}
            </p>
            {errors.role_id && <p className="field-error">{errors.role_id}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={user ? user.is_active === 1 : true}
              className="h-4 w-4 accent-[#3DDCE8]"
            />
            <span className="font-mono text-tech uppercase text-chalk">Active</span>
          </label>

          {isNew && (
            <p className="border border-hairline p-3 text-xs text-muted">
              A strong password will be generated and shown once after creation. The user must change
              it when they first sign in.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-hairline px-6 py-4">
          <SaveStatus state={state} />
          <Button type="submit" disabled={state.status === 'saving'}>
            {isNew ? 'CREATE USER' : 'SAVE'}
          </Button>
        </div>
      </form>
    </div>
  );
}
