import { useState } from "react";
import type { GitHubConfig } from "../types";
import {
  loadGitHubConfig,
  saveGitHubConfig,
  clearGitHubConfig,
  pullFromGitHub,
  pushToGitHub,
} from "../utils/github-sync";
import type { UserData } from "../types";

interface SyncButtonProps {
  data: UserData;
  onImport: (data: UserData) => void;
}

export function SyncButton({ data, onImport }: SyncButtonProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [syncing, setSyncing] = useState<"push" | "pull" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const config = loadGitHubConfig();
  const [token, setToken] = useState(config?.token ?? "");
  const [owner, setOwner] = useState(config?.owner ?? "");
  const [repo, setRepo] = useState(config?.repo ?? "");

  const handleSaveConfig = () => {
    if (!token.trim() || !owner.trim() || !repo.trim()) return;
    saveGitHubConfig({ token: token.trim(), owner: owner.trim(), repo: repo.trim() });
    setShowSettings(false);
    setError(null);
  };

  const handlePush = async () => {
    const cfg = loadGitHubConfig();
    if (!cfg) {
      setShowSettings(true);
      return;
    }
    setSyncing("push");
    setError(null);
    setSuccess(null);
    try {
      await pushToGitHub(cfg, data);
      setSuccess("Pushed to GitHub");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  const handlePull = async () => {
    const cfg = loadGitHubConfig();
    if (!cfg) {
      setShowSettings(true);
      return;
    }
    setSyncing("pull");
    setError(null);
    setSuccess(null);
    try {
      const remote = await pullFromGitHub(cfg);
      if (remote) {
        onImport(remote);
        setSuccess("Pulled from GitHub");
      } else {
        setError("No userdata.json found in repo. Push first.");
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <button
          onClick={handlePull}
          disabled={syncing !== null}
          className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          title="Pull from GitHub"
        >
          {syncing === "pull" ? "..." : "↓ Pull"}
        </button>
        <button
          onClick={handlePush}
          disabled={syncing !== null}
          className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          title="Push to GitHub"
        >
          {syncing === "push" ? "..." : "↑ Push"}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-2 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          title="Sync settings"
        >
          ⚙
        </button>
      </div>

      {error && (
        <div className="absolute right-0 top-12 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 w-64 z-50">
          {error}
        </div>
      )}

      {success && (
        <div className="absolute right-0 top-12 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg p-2 w-48 z-50">
          {success}
        </div>
      )}

      {showSettings && (
        <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-80 z-50">
          <h3 className="text-sm font-semibold mb-3">GitHub Sync Settings</h3>
          <div className="space-y-2">
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner (e.g. vekrasikov)"
              className="w-full px-3 py-1.5 text-sm border rounded-lg"
            />
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="Repo (e.g. knowledge-storage)"
              className="w-full px-3 py-1.5 text-sm border rounded-lg"
            />
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="GitHub PAT (with repo scope)"
              className="w-full px-3 py-1.5 text-sm border rounded-lg"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveConfig}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            {config && (
              <button
                onClick={() => {
                  clearGitHubConfig();
                  setToken("");
                  setOwner("");
                  setRepo("");
                }}
                className="px-3 py-1.5 text-sm text-red-500 hover:underline ml-auto"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
