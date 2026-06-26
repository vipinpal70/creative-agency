"use client";
import { useState } from "react";
import { MemberList } from "./_components/MemberList";
import { AddMemberForm } from "./_components/AddMemberForm";

type Tab = "directory" | "add";

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>("directory");

  const tabs = [
    { id: "directory" as Tab, label: "Team Directory" },
    { id: "add" as Tab, label: "+ Add Member" },
  ];

  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Team Management</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Onboard members, manage roles, credentials, and access.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-md text-[11px] font-semibold transition-all ${
              tab === t.id
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "directory" && <MemberList />}
      {tab === "add" && <AddMemberForm onSuccess={() => setTab("directory")} />}
    </div>
  );
}
