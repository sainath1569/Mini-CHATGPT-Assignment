import React, { useState, useEffect } from "react";
import deploymentImage from "./Mini-Chatgpt.jpg";
import {
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Link,
  Eye,
} from "lucide-react";

const TimeBasedGreeting = () => {
  const [greeting, setGreeting] = useState("Good afternoon");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="mb-8">
      <h1 className="text-[26px] font-semibold text-white tracking-tight">
        {greeting}, Accounts
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Welcome back to AetherFlow Documentation.
      </p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    live: "bg-green-500/15 text-green-400",
    ready: "bg-green-500/15 text-green-400",
    failed: "bg-red-500/15 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
        map[status]
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const DeploymentRow = ({ item, expanded, onToggle }) => (
  <div className="border-t border-white/5">
    <div
      className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold">
          A
        </div>
        <div>
          <div className="text-sm text-white">Accounts Documentation.AI</div>
          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Clock size={12} /> {item.time}
          </div>
        </div>
      </div>

      <div className="flex-1 px-10 text-sm text-gray-400 ml-20 truncate">
        Documentation Updated Through Editor By Accounts Documentation.AI
        <div className="text-xs text-gray-500 mt-0.5">{item.changes} Change</div>
      </div>
      <div className="flex items-center mr-20" >
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center gap-4">
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
    </div>

    {expanded && (
      <div className="grid grid-cols-2 gap-16 px-6 py-6 bg-black/40 text-sm">
        <div className="space-y-3">
          <div className="text-gray-400">Deployment Details</div>
          <div className="text-gray-500">Source Branch: main</div>
          <div className="text-gray-500">Commit: E480f1e</div>
          <div className="text-gray-500">
            Deployed to:
            <a
              href="#"
              className="text-white ml-1 underline underline-offset-2"
            >
              aetherflow.documentationai.com
            </a>
          </div>
          <div className="text-gray-500">Files Changed: documentation.json</div>
        </div>

        <div className="space-y-2">
          <div className="text-gray-400">Deployment Logs</div>
          {["Verifying permissions", "Analyzing docs", "Generating APIs", "Deployment completed successfully"].map(
            (log, i) => (
              <div key={i} className="flex items-center gap-2 text-green-400">
                <CheckCircle size={14} /> {log}
              </div>
            )
          )}
        </div>
      </div>
    )}
  </div>
);

export default function NewPage() {
  const [expanded, setExpanded] = useState(0);

  const deployments = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    time: `0${i + 1}:${i}0 PM, 07 Feb`,
    changes: i % 2 === 0 ? 1 : 2,
    status: i === 4 ? "failed" : "ready",
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0B0B] to-[#111111] text-gray-100 px-8 py-10">
      <div className="max-w-[1400px] mx-auto">
        <TimeBasedGreeting />

        {/* Status Card */}
        <div className="rounded-2xl mb-12">
          <div className="grid grid-cols-[420px_1fr_auto] gap-10">
            <div className="rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
              <img
                src={deploymentImage}
                alt="preview"
                className="w-full h-[240px] object-cover"
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <StatusBadge status="live" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Domain</div>
                <a className="text-white text-sm hover:underline">
                  aetherflow.documentationai.com
                </a>
              </div>
              <div className="flex gap-6 text-sm text-gray-400">
                <span>documentation-ai / aetherflow</span>
                <span>main</span>
              </div>
              <div className="text-xs text-gray-500">
                Published at 07 Feb, 03:46 PM by
                <span className="text-gray-300 ml-1">
                  Accounts Documentation.AI
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
                <button className="flex shrink-0 items-center gap-2 px-4 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
                  <Link size={14} /> Custom domain
                </button>

                <button className="flex shrink-0 items-center gap-2 px-4 h-9 rounded-full bg-white text-black text-sm font-medium">
                  <Eye size={14} /> View Site
                </button>
              </div>

          </div>
        </div>

        {/* Deployments */}
        <h2 className="text-lg font-medium mb-4">Deployments</h2>
        <div className="rounded-xl overflow-hidden bg-[#0F0F0F] border border-white/5">
          {deployments.map((d) => (
            <DeploymentRow
              key={d.id}
              item={d}
              expanded={expanded === d.id}
              onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
