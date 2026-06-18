'use client';

import * as React from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, BookOpen, Key, Check, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PERMISSION_OPTIONS = [
  { id: 'VIEW_PROJECTS', name: 'View Projects', desc: 'Can see all active projects' },
  { id: 'EDIT_PROJECTS', name: 'Edit Projects', desc: 'Can modify project details' },
  { id: 'MANAGE_TASKS', name: 'Manage Tasks', desc: 'Can assign and update tasks' },
  { id: 'VIEW_CLIENTS', name: 'View Clients', desc: 'Can access client database' },
];

export function AddRoleForm() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create role');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Custom role created!');
      setFormData({ name: '', description: '', permissions: [] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: () => toast.error('Error creating role'),
  });

  const togglePermission = (id: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Role name is required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Role Name
          </label>
          <input
            type="text"
            placeholder="e.g. Lead Strategist"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Description
          </label>
          <textarea
            placeholder="Define the scope and responsibilities for this role..."
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            value={formData.description}
            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-primary" />
          Assign Permissions
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERMISSION_OPTIONS.map((opt) => {
            const isSelected = formData.permissions.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => togglePermission(opt.id)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isSelected
                  ? 'border-primary bg-primary/50'
                  : 'border-gray-50 bg-white hover:border-primary/30'
                  }`}
              >
                <div className="text-left">
                  <div className="text-xs font-medium text-gray-900">{opt.name}</div>
                  <div className="text-[10px] text-gray-500">{opt.desc}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-200'
                  }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full sm:w-64 flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
        >
          {mutation.isPending ? 'Creating Role...' : 'Create Custom Role'}
          {!mutation.isPending && <Plus className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
