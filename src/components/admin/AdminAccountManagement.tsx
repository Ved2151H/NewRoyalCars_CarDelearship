import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  UserCog,
  Users,
  ShieldCheck,
  Shield,
  Trash2,
  Pencil,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { GlassButton } from '../common/GlassButton';
import { ConfirmationModal } from './ConfirmationModal';
import {
  getMyAccountAction,
  updateOwnAccountAction,
  listAdminsAction,
  createAdminAction,
  modifyAdminAction,
  deleteAdminAction,
} from '../../lib/actions/account';

interface MyAccount {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
}

interface AdminRow {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
}

const inputCls =
  'w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-white/60';

const labelCls = 'block text-xs text-neutral-300 font-medium mb-1';

export const AdminAccountManagement: React.FC<{
  onSessionRefreshed: (email: string, name?: string) => void;
}> = ({
  onSessionRefreshed,
}) => {
  const [me, setMe] = useState<MyAccount | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // My Account form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingMe, setSavingMe] = useState(false);

  // Create admin form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<AdminRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Show/hide toggles for every password field.
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showEditPw, setShowEditPw] = useState(false);

  const isSuper = me?.role === 'SUPER_ADMIN';

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const meRes = await getMyAccountAction();
    if (meRes.ok && meRes.data) {
      setMe(meRes.data);
      setName(meRes.data.name);
      setEmail(meRes.data.email);
      if (meRes.data.role === 'SUPER_ADMIN') {
        const list = await listAdminsAction();
        if (list.ok && list.data) setAdmins(list.data);
      }
    } else {
      setError(meRes.ok ? 'Could not load account.' : meRes.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const handleSaveMe = async () => {
    setError('');
    setSavingMe(true);
    const res = await updateOwnAccountAction({
      name: name !== me?.name ? name : undefined,
      email: email.toLowerCase() !== me?.email ? email : undefined,
      currentPassword,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
    });
    setSavingMe(false);
    if (res.ok) {
      const passwordChanged = Boolean(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadAll();
      const meRes = await getMyAccountAction();
      if (meRes.ok && meRes.data) onSessionRefreshed(meRes.data.email, meRes.data.name);
      flash(
        passwordChanged
          ? 'Password changed. Use your new password next time you sign in.'
          : 'Account updated.'
      );
    } else {
      setError(res.ok ? 'Update failed.' : res.error);
    }
  };

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    const res = await createAdminAction({
      name: newName,
      email: newEmail,
      password: newPassword2,
      confirmPassword: newConfirm,
      role: newRole,
    });
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      setNewPassword2('');
      setNewConfirm('');
      setNewRole('ADMIN');
      await loadAll();
      flash('Admin account created.');
    } else {
      setError(res.ok ? 'Create failed.' : res.error);
    }
  };

  const openEdit = (a: AdminRow) => {
    setEditTarget(a);
    setEditName(a.name);
    setEditEmail(a.email);
    setEditPassword('');
    setEditRole(a.role);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setError('');
    setSavingEdit(true);
    const res = await modifyAdminAction({
      adminId: editTarget.id,
      name: editName !== editTarget.name ? editName : undefined,
      email: editEmail.toLowerCase() !== editTarget.email ? editEmail : undefined,
      newPassword: editPassword || undefined,
      role: editRole !== editTarget.role ? editRole : undefined,
    });
    setSavingEdit(false);
    if (res.ok) {
      setEditTarget(null);
      await loadAll();
      flash('Admin account updated.');
    } else {
      setError(res.ok ? 'Update failed.' : res.error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteAdminAction(deleteTarget.id);
    setDeleting(false);
    if (res.ok) {
      setDeleteTarget(null);
      await loadAll();
      flash('Admin account deleted.');
    } else {
      setError(res.ok ? 'Delete failed.' : res.error);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-neutral-500">Loading account…</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-300">
          <UserCog className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">Account Management</h1>
          <p className="text-xs text-neutral-500">Manage your own credentials and dealership admin accounts.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">{error}</div>
      )}
      {notice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">{notice}</div>
      )}

      {/* ============ MY ACCOUNT ============ */}
      <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neutral-400" />
          <h2 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif">My Account</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          <span>Current email: <span className="text-neutral-300">{me?.email}</span></span>
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-neutral-300 font-semibold">
            {me?.role}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Username / User ID</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Current Password *</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to save any change"
                className={inputCls + ' pr-10'}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls + ' pr-10'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirm New</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls + ' pr-10'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <GlassButton variant="gold" size="sm" disabled={savingMe} onClick={handleSaveMe}>
            {savingMe ? 'Saving…' : 'Save Changes'}
          </GlassButton>
        </div>
      </div>

      {/* ============ ADMIN ACCOUNTS (SUPER_ADMIN only) ============ */}
      {isSuper && (
        <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <h2 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif">Admin Accounts</h2>
            </div>
            <GlassButton variant="secondary" size="sm" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="w-3.5 h-3.5" />
              {showCreate ? 'Close Form' : 'Create Admin'}
            </GlassButton>
          </div>

          {/* Create form */}
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Name / Username</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <input type={showCreatePw ? 'text' : 'password'} value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} className={inputCls + ' pr-10'} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowCreatePw((v) => !v)} aria-label={showCreatePw ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer">
                      {showCreatePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <div className="relative">
                    <input type={showCreateConfirm ? 'text' : 'password'} value={newConfirm} onChange={(e) => setNewConfirm(e.target.value)} className={inputCls + ' pr-10'} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowCreateConfirm((v) => !v)} aria-label={showCreateConfirm ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer">
                      {showCreateConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')} className={inputCls}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <GlassButton variant="gold" size="sm" disabled={creating} onClick={handleCreate}>
                  {creating ? 'Creating…' : 'Create Admin Account'}
                </GlassButton>
              </div>
            </motion.div>
          )}

          {/* Table (desktop) / cards (mobile) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500 uppercase tracking-wider text-[10px] border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 font-semibold text-white">{a.name}</td>
                    <td className="px-4 py-3 text-neutral-300">{a.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${a.role === 'SUPER_ADMIN' ? 'bg-white/10 text-white border-white/20' : 'bg-white/[0.04] text-neutral-400 border-white/10'}`}>
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(a)} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white border border-white/10 transition-all cursor-pointer" title="Modify">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {a.role !== 'SUPER_ADMIN' && (
                          <button onClick={() => setDeleteTarget(a)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer" title="Delete admin">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {admins.map((a) => (
              <div key={a.id} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white truncate">{a.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${a.role === 'SUPER_ADMIN' ? 'bg-white/10 text-white border-white/20' : 'bg-white/[0.04] text-neutral-400 border-white/10'}`}>
                    {a.role}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 truncate">{a.email}</p>
                <p className="text-[10px] text-neutral-600">
                  Created {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <GlassButton variant="secondary" size="sm" onClick={() => openEdit(a)}>
                    <Pencil className="w-3.5 h-3.5" />
                    Modify
                  </GlassButton>
                  {a.role !== 'SUPER_ADMIN' && (
                    <GlassButton variant="danger" size="sm" onClick={() => setDeleteTarget(a)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </GlassButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit admin modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
          <div className="fixed inset-0" onClick={() => setEditTarget(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl glass-modal p-6 border border-white/10 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-white">Modify Admin</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Reset Password (optional)</label>
                <div className="relative">
                  <input type={showEditPw ? 'text' : 'password'} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep current" className={inputCls + ' pr-10'} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowEditPw((v) => !v)} aria-label={showEditPw ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer">
                    {showEditPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')} className={inputCls}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <GlassButton variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</GlassButton>
              <GlassButton variant="gold" size="sm" disabled={savingEdit} onClick={handleSaveEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Admin Account"
        confirmLabel="Delete Admin"
        message={
          deleteTarget
            ? `Are you sure you want to delete this admin account?\n\n${deleteTarget.name} (${deleteTarget.email})\n\nThey will immediately lose access to the admin panel. This action cannot be undone.`
            : ''
        }
      />
    </motion.div>
  );
};
