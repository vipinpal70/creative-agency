'use client';

import * as React from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Shield, Copy, CheckCircle2, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MAX_ROLES = 2;

export function AddMemberForm() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    selectedRoles: [] as string[], // predefined MemberRole values
    customRoleId: '' as string,    // optional custom role ID
  });
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);

  // Fetch roles (predefined + custom)
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    },
  });

  const toggleRole = (role: string) => {
    setFormData((prev) => {
      const has = prev.selectedRoles.includes(role);
      if (has) {
        return { ...prev, selectedRoles: prev.selectedRoles.filter((r) => r !== role) };
      }
      if (prev.selectedRoles.length >= MAX_ROLES) {
        toast.error(`You can assign at most ${MAX_ROLES} roles`);
        return prev;
      }
      return { ...prev, selectedRoles: [...prev.selectedRoles, role] };
    });
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        roles: data.selectedRoles,
        customRoleId: data.customRoleId || null,
      };

      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to add member');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Member added successfully!');
      setGeneratedPass(data.password);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || formData.selectedRoles.length === 0) {
      toast.error('Please fill all fields and select at least one role');
      return;
    }
    mutation.mutate(formData);
  };

  const copyPassword = () => {
    if (generatedPass) {
      navigator.clipboard.writeText(generatedPass);
      toast.success('Password copied to clipboard');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', selectedRoles: [], customRoleId: '' });
    setGeneratedPass(null);
  };

  if (generatedPass) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Member Onboarded!</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          User account created successfully. Please share this temporary password with
          <span className="font-bold text-gray-900"> {formData.name}</span>.
        </p>

        <div className="bg-white border border-primary/30 rounded-xl p-4 flex items-center justify-between mb-8 max-w-md mx-auto shadow-sm">
          <code className="text-lg font-mono font-bold text-primary">{generatedPass}</code>
          <button
            onClick={copyPassword}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={resetForm}
          className="text-sm font-bold text-primary hover:text-primary underline underline-offset-4"
        >
          Add another member
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-normal text-gray-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Full Name
          </label>
          <input
            type="text"
            placeholder="e.g. Sarah Jenkins"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-normal text-gray-700 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email Address
          </label>
          <input
            type="email"
            placeholder="sarah@agency.com"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={formData.email}
            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
          />
        </div>

        <div className="md:col-span-2 space-y-3">
          <label className="text-sm font-normal text-gray-700 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Assign Roles
            <span className="text-xs text-gray-400 font-normal">(select 1–2 roles)</span>
          </label>

          {/* Selected roles chips */}
          {formData.selectedRoles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {formData.selectedRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold"
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

          {/* System roles grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rolesData?.predefined?.map((role: string) => {
              const isSelected = formData.selectedRoles.includes(role);
              const isDisabled = !isSelected && formData.selectedRoles.length >= MAX_ROLES;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => !isDisabled && toggleRole(role)}
                  style={{ fontSize: '13px' }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : isDisabled
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-primary/30'
                  }`}
                >
                  {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom roles */}
          {rolesData?.custom?.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Roles (optional)</p>
              <select
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                value={formData.customRoleId}
                onChange={(e) => setFormData(p => ({ ...p, customRoleId: e.target.value }))}
              >
                <option value="">No custom role</option>
                {rolesData.custom.map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 flex flex-col items-center">
        <button
          type="submit"
          disabled={mutation.isPending || isLoadingRoles}
          className="w-full sm:w-64 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/80 shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
        >
          {mutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Onboarding...
            </>
          ) : (
            'Onboard'
          )}
        </button>
      </div>
    </form>
  );
}
