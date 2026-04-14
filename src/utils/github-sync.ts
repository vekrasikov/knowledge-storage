import type { GitHubConfig, UserData } from "../types";

const CONFIG_KEY = "knowledge-storage-github";

export function loadGitHubConfig(): GitHubConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GitHubConfig;
  } catch {
    return null;
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

const FILE_PATH = "userdata.json";

async function githubApi(
  config: GitHubConfig,
  method: "GET" | "PUT",
  body?: unknown
): Promise<Response> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${FILE_PATH}`;
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function pullFromGitHub(
  config: GitHubConfig
): Promise<UserData | null> {
  const res = await githubApi(config, "GET");
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub API error: ${err.message || res.statusText}`);
  }
  const data = await res.json();
  const content = atob(data.content.replace(/\n/g, ""));
  return JSON.parse(content) as UserData;
}

export async function pushToGitHub(
  config: GitHubConfig,
  userData: UserData
): Promise<void> {
  // Get current file SHA (needed for update)
  let sha: string | undefined;
  const getRes = await githubApi(config, "GET");
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    const err = await getRes.json();
    throw new Error(`GitHub API error: ${err.message || getRes.statusText}`);
  }

  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(userData, null, 2)))
  );

  const body: Record<string, unknown> = {
    message: `sync: update learning progress (${new Date().toISOString().slice(0, 10)})`,
    content,
  };
  if (sha) body.sha = sha;

  const putRes = await githubApi(config, "PUT", body);
  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub API error: ${err.message || putRes.statusText}`);
  }
}
