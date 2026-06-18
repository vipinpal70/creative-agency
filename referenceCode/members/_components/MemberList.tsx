'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Shield, Calendar, Trash2, Copy, RefreshCw, X, Eye, EyeOff, Pencil, Check, KeyRound } from 'lucide-react';
import { MemberRole, UserType } from '@prisma/client';
import { toast } from 'react-hot-toast';

interface Member {
  id: string;
  roles: MemberRole[];
  isActive: boolean;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    userType: UserType;
  } | null;
  customRole?: {
    id: string;
    name: string;
  } | null;
}

interface CredentialsModalProps {
  member: Member;
  onClose: () => void;
}

function CredentialsModal({ member, onClose }: CredentialsModalProps) {
  const [password, setPassword] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [inputPassword, setInputPassword] = React.useState('');
  const [showInput, setShowInput] = React.useState(false);

  // Load current password from DB when modal opens
  React.useEffect(() => {
    let cancelled = false;
    setIsFetching(true);
    fetch(`/api/members/${member.id}/reset-password`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.password) {
          setPassword(data.password);
          setInputPassword(data.password);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsFetching(false); });
    return () => { cancelled = true; };
  }, [member.id]);

  const handleAutoGenerate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/members/${member.id}/reset-password`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset password');
      const data = await res.json();
      setPassword(data.password);
      setInputPassword(data.password);
      toast.success('New password generated');
    } catch {
      toast.error('Failed to generate password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!inputPassword.trim()) { toast.error('Please enter a password'); return; }
    if (inputPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (inputPassword === password) { toast.error('Password is unchanged'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/members/${member.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword }),
      });
      if (!res.ok) throw new Error('Failed to set password');
      setPassword(inputPassword);
      toast.success('Password updated');
    } catch {
      toast.error('Failed to set password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const isDirty = inputPassword !== password && inputPassword.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{member.user?.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Team member credentials</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credentials card */}
        <div className="mx-5 mb-5 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Email row */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Email / Username</p>
              <p className="text-sm font-medium text-gray-800">{member.user?.email}</p>
            </div>
            <button
              onClick={() => copyToClipboard(member.user?.email ?? '')}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              title="Copy email"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Change password */}
          <div className="px-5 pb-5 space-y-3 mt-4">
            <p className="text-xs font-semibold text-gray-600">Change Password</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showInput ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={e => setInputPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && isDirty && handleSave()}
                  placeholder="Enter new password"
                  className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowInput(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={isSubmitting}
                title="Auto-generate password"
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isDirty && (
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
              >
                {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Password'}
              </button>
            )}

            <p className="text-center text-xs text-blue-600 font-normal italic">
              Share this password with the member.
            </p>
          </div>

          {/* Password row — display only */}
          {/* <div className="flex items-center justify-between px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-600 mb-0.5">Password</p>
              {isFetching ? (
                <p className="text-sm text-gray-300 italic">Loading...</p>
              ) : password ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-medium text-gray-800 truncate">
                    {showPassword ? password : '••••••••••••'}
                  </p>
                  <button
                    onClick={() => setShowPassword(v => !v)}
                    className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No password set yet</p>
              )}
            </div>
            {password && !isFetching && (
              <button
                onClick={() => copyToClipboard(password)}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all shrink-0"
                title="Copy password"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div> */}
        </div>


      </div>
    </div>
  );
}

// ─── Edit Roles Modal ────────────────────────────────────────────────────────

interface EditRolesModalProps {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_ROLES = 2;

function EditRolesModal({ member, onClose, onSaved }: EditRolesModalProps) {
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(
    member.roles?.map(String) ?? []
  );
  const [customRoleId, setCustomRoleId] = React.useState<string>(
    member.customRole?.id ?? ''
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) return prev.filter((r) => r !== role);
      if (prev.length >= MAX_ROLES) {
        toast.error(`You can assign at most ${MAX_ROLES} roles`);
        return prev;
      }
      return [...prev, role];
    });
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      toast.error('Select at least one role');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRoles, customRoleId: customRoleId || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update roles' }));
        throw new Error(err.error || 'Failed to update roles');
      }
      toast.success('Roles updated');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{member.user?.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Edit roles</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Current selection chips */}
          {selectedRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold"
                >
                  {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  <button
                    type="button"
                    onClick={() => toggleRole(role)}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Role grid */}
          {isLoadingRoles ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rolesData?.predefined?.map((role: string) => {
                const isSelected = selectedRoles.includes(role);
                const isDisabled = !isSelected && selectedRoles.length >= MAX_ROLES;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => !isDisabled && toggleRole(role)}
                    style={{ fontSize: '10px' }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border-2 font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : isDisabled
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'border-gray-100 bg-white text-gray-700 hover:border-primary/30'
                    }`}
                  >
                    {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom role */}
          {rolesData?.custom?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Role (optional)</p>
              <select
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                value={customRoleId}
                onChange={(e) => setCustomRoleId(e.target.value)}
              >
                <option value="">No custom role</option>
                {rolesData.custom.map((role: { id: string; name: string }) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || selectedRoles.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
          >
            {isSaving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              'Save Roles'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type MemberStatusFilter = 'active' | 'inactive';

const STATUS_FILTERS: { value: MemberStatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function MemberList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>('active');
  const [credentialsMember, setCredentialsMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const { data: members = [], isLoading, error } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    },
  });

  const parseErrorMessage = (errorText: string, fallback: string) => {
    let message = errorText || fallback;
    try {
      message = JSON.parse(errorText).error || message;
    } catch {
      // Keep plain text errors as-is.
    }
    return message;
  };

  const statusMutation = useMutation({
    mutationFn: async ({ memberId, isActive }: { memberId: string; isActive: boolean }) => {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText, 'Failed to update member status'));
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success('Member status updated.');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(parseErrorMessage(errorText, 'Failed to delete member'));
      }
    },
    onSuccess: () => {
      toast.success('Member permanently deleted.');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const statusCounts = useMemo(() => ({
    active: members.filter((member) => member.isActive).length,
    inactive: members.filter((member) => !member.isActive).length,
  }), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => (
      statusFilter === 'active' ? member.isActive : !member.isActive
    ));
  }, [members, statusFilter]);

  const handleDelete = (member: Member) => {
    const memberName = member.user?.name || 'this member';
    if (window.confirm(`Permanently delete ${memberName}? This removes the user from the database and cannot be undone.`)) {
      deleteMutation.mutate(member.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) return <div className="text-red-500 text-sm font-bold">Failed to load members.</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as MemberStatusFilter)}
            aria-label="Filter members by status"
            className="h-10 min-w-36 appearance-none rounded-lg border border-gray-100 bg-white px-3 pr-9 text-xs font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label} ({statusCounts[filter.value]})
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            ▼
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredMembers.map((member) => (
          <div key={member.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-primary/20 transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${member.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                {member.user?.name?.slice(0, 2).toUpperCase() || '??'}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                  {member.user?.name || 'Unknown Member'}
                </h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <Mail className="w-3 h-3" />
                    {member.user?.email || 'No Email'}
                  </span>
                  {(member.roles && member.roles.length > 0
                    ? member.roles.map((role) => (
                        <span key={role} className="flex items-center gap-1 font-medium text-[8px] text-primary bg-primary/10 px-2 py-0.5 rounded-full tracking-wider">
                          <Shield className="w-3 h-3" />
                          {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      ))
                    : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full tracking-wider">
                        <Shield className="w-3 h-3" />
                        {member.customRole?.name || 'Member'}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
              <div className="hidden sm:flex flex-col items-end">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </span>
                <div className="relative mt-1">
                  <select
                    value={member.isActive ? 'active' : 'inactive'}
                    onChange={(event) => statusMutation.mutate({
                      memberId: member.id,
                      isActive: event.target.value === 'active',
                    })}
                    disabled={statusMutation.isPending}
                    aria-label={`Set status for ${member.user?.name || 'member'}`}
                    className={`h-7 min-w-24 appearance-none rounded-md border px-2 pr-6 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/10 ${
                      member.isActive
                        ? 'border-green-100 bg-green-50 text-green-600'
                        : 'border-gray-100 bg-gray-50 text-gray-500'
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-current">
                    ▼
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditMember(member)}
                title="Edit roles"
                aria-label={`Edit roles for ${member.user?.name || 'member'}`}
                className="p-2 text-gray-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCredentialsMember(member)}
                title="View / generate credentials"
                aria-label={`Credentials for ${member.user?.name || 'member'}`}
                className="p-2 text-gray-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(member)}
                disabled={deleteMutation.isPending}
                title="Delete member"
                aria-label={`Delete ${member.user?.name || 'member'}`}
                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <p className="text-gray-400 text-sm font-medium">No {statusFilter} members found.</p>
          </div>
        )}
      </div>

      {credentialsMember && (
        <CredentialsModal
          member={credentialsMember}
          onClose={() => setCredentialsMember(null)}
        />
      )}

      {editMember && (
        <EditRolesModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['members'] })}
        />
      )}
    </div>
  );
}
