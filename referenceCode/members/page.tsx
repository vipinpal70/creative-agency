'use client';

import * as React from 'react';
import { useState } from 'react';
import { Users, UserPlus, Settings2 } from 'lucide-react';
import { AddMemberForm } from './_components/AddMemberForm';
import { AddRoleForm } from './_components/AddRoleForm';
import { MemberList } from './_components/MemberList';

type Tab = 'directory' | 'add-member' | 'manage-roles';

export default function MembersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('directory');

  const tabs = [
    { id: 'directory', name: 'Team Directory', icon: Users },
    { id: 'add-member', name: 'Add Member', icon: UserPlus },
    // { id: 'manage-roles', name: 'Manage Roles', icon: Settings2 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Team Management
          </h1>
          <p className="text-gray-400 text-sm">
            Onboard new members, manage permissions, and organize your organization structure.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-lg w-fit">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${isActive
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'directory' && (
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            </div>
            <MemberList />
          </div>
        )}

        {activeTab === 'add-member' && (
          <div className="max-w-3xl animate-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Onboard New Team Member</h2>
            <AddMemberForm />
          </div>
        )}

        {activeTab === 'manage-roles' && (
          <div className="max-w-3xl animate-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Create Custom Role</h2>
            <AddRoleForm />
          </div>
        )}
      </div>
    </div>
  );
}
