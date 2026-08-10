import React, { useState, useEffect } from "react";
import { apiFetch } from "../services/apiClient";
import { Download } from "lucide-react";
import { 
  Github, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  Sparkles, 
  Shield, 
  Cpu, 
  Server, 
  AlertCircle, 
  HelpCircle,
  GitBranch,
  GitCommit,
  Star,
  Bug,
  RefreshCw,
  Lock,
  Link,
  ChevronRight,
  Key
} from "lucide-react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  stars: number;
  language: string;
}

interface GitHubStatus {
  configured: boolean;
  webhookUrl: string;
  linkedRepo: string;
  githubTokenConfigured: boolean;
}

export default function GitHubTab() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [simSuccess, setSimSuccess] = useState<string | null>(null);
  const [linkingRepoName, setLinkingRepoName] = useState<string | null>(null);

  // New Repository Creation States
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [createdRepoInfo, setCreatedRepoInfo] = useState<{ repo: string; cloneUrl: string; isDemo: boolean } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'existing' | 'create'>('existing');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Direct Git Push States
  const [pushing, setPushing] = useState(false);
  const [commitMessageInput, setCommitMessageInput] = useState("");
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string; isDemo?: boolean } | null>(null);

  const handleDirectPush = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPushing(true);
    setPushResult(null);

    if (!status?.githubTokenConfigured && !tokenInput.trim()) {
      setPushResult({
        success: false,
        message: "GITHUB_TOKEN is missing in the environment. Please configure it or enter a Personal Access Token below."
      });
      setPushing(false);
      return;
    }

    try {
      const res = await apiFetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: status?.linkedRepo,
          token: tokenInput.trim() || undefined,
          commitMessage: commitMessageInput.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult({
          success: true,
          message: data.message,
          isDemo: data.isDemo
        });
        setCommitMessageInput("");
      } else {
        setPushResult({
          success: false,
          message: data.error || "Git push failed."
        });
      }
    } catch (err: any) {
      setPushResult({
        success: false,
        message: err.message || "Network error pushing codebase."
      });
    } finally {
      setPushing(false);
    }
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    setCreatingRepo(true);
    setCreatedRepoInfo(null);
    setSimSuccess(null);

    if (!status?.githubTokenConfigured && !tokenInput.trim()) {
      setSimSuccess("Error: GITHUB_TOKEN is missing in the environment. Please configure it or enter a Personal Access Token below.");
      setCreatingRepo(false);
      return;
    }

    try {
      const res = await apiFetch("/api/github/create-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRepoName.trim(),
          description: newRepoDesc.trim(),
          isPrivate: newRepoPrivate,
          token: tokenInput.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedRepoInfo(data);
        if (status) {
          setStatus({
            ...status,
            linkedRepo: data.repo
          });
        }
        // Refresh repositories list
        fetchRepositories(tokenInput.trim() || undefined);
        setNewRepoName("");
        setNewRepoDesc("");
        setSimSuccess(`Successfully created repository '${data.repo}' and linked it to the bot!`);
      } else {
        setSimSuccess(`Error: ${data.error || "Could not create repository."}`);
      }
    } catch (err: any) {
      console.error("Failed to create repository:", err);
      setSimSuccess(`Error: Connection issue or unexpected response.`);
    } finally {
      setCreatingRepo(false);
    }
  };

  const copyCommand = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Fetch Webhook and App status
  const fetchGitHubStatus = async () => {
    try {
      const res = await apiFetch("/api/github/status");
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      // Safe status polling
    }
  };

  // Fetch Repositories list
  const fetchRepositories = async (customToken?: string) => {
    setLoadingRepos(true);
    try {
      const headers: Record<string, string> = {};
      if (customToken) {
        headers["X-GitHub-Token"] = customToken;
      }
      const res = await apiFetch("/api/github/repos", { headers });
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;
      const data = await res.json();
      if (data.repos) {
        setRepos(data.repos);
        setIsDemoMode(!!data.isDemo);
      }
    } catch (err) {
      // Safe error handling
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchGitHubStatus();
    fetchRepositories();
  }, []);

  // Set selected linked repository
  const handleLinkRepo = async (repoFullName: string) => {
    setLinkingRepoName(repoFullName);
    try {
      const res = await apiFetch("/api/github/link-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName })
      });
      const data = await res.json();
      if (data.success) {
        if (status) {
          setStatus({
            ...status,
            linkedRepo: repoFullName
          });
        }
        setSimSuccess(`Successfully linked repository '${repoFullName}' to the Discord Bot!`);
      }
    } catch (err) {
      console.error("Failed to link repository:", err);
    } finally {
      setLinkingRepoName(null);
    }
  };

  // Save/Connect custom Personal Access Token (PAT)
  const [tokenStatusMsg, setTokenStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoadingRepos(true);
    setTokenStatusMsg(null);
    try {
      const res = await apiFetch("/api/github/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTokenStatusMsg({ success: true, message: data.message });
        await fetchGitHubStatus();
        await fetchRepositories(tokenInput.trim());
      } else {
        setTokenStatusMsg({ success: false, message: data.error || "Token verification failed." });
      }
    } catch (err: any) {
      setTokenStatusMsg({ success: false, message: err.message || "Network error verifying token." });
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSimulate = async (event: string) => {
    setSimulating(event);
    setSimSuccess(null);
    try {
      const res = await apiFetch("/api/github/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event })
      });
      const data = await res.json();
      if (data.success) {
        setSimSuccess(`Simulated '${event}' webhook alert dispatched to Discord Bot (synthetic event).`);
      } else {
        setSimSuccess(`Simulated alert dispatched, but Discord Bot connection is currently offline. (Please start Discord Bot first)`);
      }
    } catch (err: any) {
      console.error("Failed to simulate GitHub webhook:", err);
    } finally {
      setSimulating(null);
    }
  };

  const copyWebhookUrl = () => {
    if (status?.webhookUrl) {
      navigator.clipboard.writeText(status.webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#121212] rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="github-integration-tab">
      
      {/* Top Banner introducing GitHub Sync */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-6 text-white border border-zinc-700/50 relative overflow-hidden" id="github-banner">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Github className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black border border-indigo-400/30 uppercase tracking-wide">
              GitHub Sync Core
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-zinc-400 font-bold">Automatic Sync Enabled</span>
          </div>
          <h2 className="text-lg font-black tracking-tight">GitHub Integration & 24/7 Deployment Hub</h2>
          <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
            Connect your GitHub repository with your Discord bot. Receive instant embeds for pushes, stars, and issues, and follow production hosting guidelines below.
          </p>
        </div>
      </div>

      {/* Source Code Download Link */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              Download Complete Source Code
            </h3>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Download your complete bot project source code as a ZIP archive. Secret keys and credentials are automatically stripped for safety.
            </p>
          </div>
          <a
            href="/api/download/source"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download ZIP
          </a>
        </div>
      </div>

      {status && !status.githubTokenConfigured && !tokenInput && (
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-200">GitHub Token Not Configured</h3>
            <p className="text-xs text-rose-300/80 mt-1">
              You must configure a valid <code className="text-rose-200 bg-rose-950/40 px-1 py-0.5 rounded">GITHUB_TOKEN</code> in your environment variables to create repositories, push code, or fetch live repository data. 
              Until configured, the dashboard operates in local Demo Mode.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Repositories Browser (7 Cols) */}
        <div className="lg:col-span-7 bg-[#121212] rounded-2xl border border-zinc-800/80 p-5 space-y-4 flex flex-col" id="github-repos-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Github className="w-4.5 h-4.5 text-zinc-100" />
              <div>
                <h3 className="font-black text-sm text-zinc-100">GitHub Repositories Panel</h3>
                <p className="text-[10px] text-zinc-400">Link existing or create new repositories for your Discord bot</p>
              </div>
            </div>
            {isDemoMode ? (
              <span className="self-start sm:self-auto px-2 py-0.5 bg-[#27272a] border border-zinc-800 rounded-md text-[9px] font-bold text-zinc-500 tracking-wide">
                Demo Mode
              </span>
            ) : (
              <span className="self-start sm:self-auto px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-[9px] font-bold text-emerald-400 tracking-wide">
                Live Sync
              </span>
            )}
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex p-1 bg-[#27272a]/80 rounded-xl" id="github-subtabs">
            <button
              onClick={() => { setActiveSubTab('existing'); setCreatedRepoInfo(null); }}
              className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition ${
                activeSubTab === 'existing' 
                  ? 'bg-[#121212] text-zinc-100 shadow-sm border border-zinc-800/40' 
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              Link Existing Repo
            </button>
            <button
              onClick={() => setActiveSubTab('create')}
              className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition ${
                activeSubTab === 'create' 
                  ? 'bg-[#121212] text-indigo-400 shadow-sm border border-zinc-800/40' 
                  : 'text-zinc-500 hover:text-indigo-400'
              }`}
            >
              Create New Repo
            </button>
          </div>

          {activeSubTab === 'existing' ? (
            <div className="space-y-4 flex flex-col flex-1">
              {/* Secure Custom PAT Form */}
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-300 font-extrabold uppercase flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" /> GitHub Personal Access Token (PAT) Gateway
                  </span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-1"
                  >
                    <span>Get Token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <form onSubmit={handleConnectToken} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      placeholder="Paste Personal Access Token (ghp_... or github_pat_...)"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="w-full pl-3 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingRepos}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition shrink-0"
                  >
                    {loadingRepos ? "Connecting..." : "SAVE TOKEN"}
                  </button>
                </form>

                {tokenStatusMsg && (
                  <p className={`text-[11px] font-bold ${tokenStatusMsg.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tokenStatusMsg.message}
                  </p>
                )}
              </div>

              {/* Connected/Active Repo Box */}
              <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                    <Link className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Active Linked Repository</span>
                    <h4 className="text-xs font-black text-zinc-100 font-mono">{status.linkedRepo}</h4>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-black tracking-wider animate-pulse uppercase">
                  Active
                </span>
              </div>

              {/* Repositories List */}
              <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
                {repos.map((repo) => {
                  const isActive = status.linkedRepo === repo.full_name;
                  return (
                    <div 
                      key={repo.id}
                      onClick={() => handleLinkRepo(repo.full_name)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isActive 
                          ? "bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-950/60" 
                          : "bg-[#121212] border-zinc-800 hover:border-zinc-700/80 hover:bg-[#18181b]/50"
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-zinc-200 truncate">{repo.full_name}</span>
                          {repo.language && (
                            <span className="px-1.5 py-0.5 bg-[#27272a] text-zinc-400 rounded text-[8px] font-mono font-bold">
                              {repo.language}
                            </span>
                          )}
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              {repo.stars}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">{repo.description}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkRepo(repo.full_name);
                        }}
                        disabled={linkingRepoName === repo.full_name}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tight transition shrink-0 ${
                          isActive 
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-[#27272a] hover:bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {linkingRepoName === repo.full_name ? (
                          "Linking..."
                        ) : isActive ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Linked
                          </span>
                        ) : (
                          "Link Repo"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col flex-1">
              {/* Form to create a brand new repository */}
              <form onSubmit={handleCreateRepo} className="space-y-3.5 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. my-awesome-bot"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-zinc-300 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Core system of ultimate Discord Bot"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-xl border border-zinc-800">
                  <div>
                    <h5 className="font-bold text-zinc-200 text-xs">Private Repository</h5>
                    <p className="text-[10px] text-zinc-400">Code will only be visible to you and authorized collaborators</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-zinc-700 rounded focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingRepo}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-tight transition shadow-sm shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                >
                  {creatingRepo ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating and linking repository...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Create Repository
                    </>
                  )}
                </button>
              </form>

              {/* If repo was successfully created, show custom git terminal guidelines */}
              {createdRepoInfo && (
                <div className="p-4 bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs pb-2 border-b border-zinc-800">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Successfully created: <strong className="font-mono">{createdRepoInfo.repo}</strong></span>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Run in your local terminal (Git Push):</span>
                    
                    {[
                      { key: "git-init", label: "1. Git Initialize", cmd: "git init" },
                      { key: "git-add", label: "2. Add Files", cmd: "git add ." },
                      { key: "git-commit", label: "3. Initial Commit", cmd: 'git commit -m "feat: ultimate discord ai core synced"' },
                      { key: "git-branch", label: "4. Setup Main Branch", cmd: "git branch -M main" },
                      { key: "git-remote", label: "5. Add Remote", cmd: `git remote add origin ${createdRepoInfo.cloneUrl}` },
                      { key: "git-push", label: "6. Push Code", cmd: "git push -u origin main" }
                    ].map((step) => (
                      <div key={step.key} className="flex flex-col gap-1 p-2 bg-black/40 rounded-lg border border-zinc-800/60">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                          <span>{step.label}</span>
                          <button
                            onClick={() => copyCommand(step.cmd, step.key)}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            {copiedCmd === step.key ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <code className="text-[10px] font-mono text-zinc-100 block break-all">{step.cmd}</code>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg text-[10px] text-indigo-300 leading-normal">
                    💡 <strong>Next Step:</strong> Running these commands inside your bot codebase folder will upload the files to GitHub, and our sync engine will automatically deliver live events to Discord!
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right: Webhook Controls & Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Direct Git Push Card */}
          <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-black text-white rounded-2xl border border-indigo-500/30 p-5 space-y-4 shadow-lg" id="direct-push-card">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="font-black text-sm text-white">Direct Push Entire Codebase</h3>
              </div>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase rounded border border-indigo-400/30">
                1-Click Push
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-normal">
              Click the button below to push your complete bot source code directly to your GitHub repository (<strong className="text-indigo-300 font-mono">{status.linkedRepo}</strong>):
            </p>

            <form onSubmit={handleDirectPush} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Commit Message (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Update discord bot firewall and zero-trust permissions"
                  value={commitMessageInput}
                  onChange={(e) => setCommitMessageInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {pushResult && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  pushResult.success 
                    ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300" 
                    : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
                }`}>
                  {pushResult.message}
                </div>
              )}

              <button
                type="submit"
                disabled={pushing}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {pushing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Pushing code to GitHub...</span>
                  </>
                ) : (
                  <>
                    <GitCommit className="w-4 h-4 text-emerald-400" />
                    <span>🚀 PUSH CODE DIRECTLY TO GITHUB</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Webhook Settings Panel */}
          <div className="bg-[#121212] rounded-2xl border border-zinc-800/80 p-5 space-y-4" id="webhook-setup-card">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <Cpu className="w-4.5 h-4.5 text-zinc-100" />
              <h3 className="font-black text-sm text-zinc-100">GitHub Webhook Manager</h3>
            </div>

            <div className="space-y-4 text-xs text-zinc-400">
              <p className="leading-relaxed text-[11px]">
                Receive real-time Discord notifications for all events (such as Commit Push, Issue Opened, or Repo Star) from your GitHub repository using the webhook URL below:
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Webhook Payload URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={status.webhookUrl}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 font-mono text-[9px] text-zinc-300 outline-none"
                  />
                  <button
                    onClick={copyWebhookUrl}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition shrink-0 ${
                      copiedUrl 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-200"
                        : "bg-[#27272a] hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {copiedUrl ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="p-2.5 bg-indigo-950/40 rounded-lg border border-indigo-900/50 text-[10px] text-indigo-300 leading-normal flex gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Setup Instructions:</strong> Go to GitHub Repository Settings → Webhooks → Add Webhook, and ensure Content Type is set to <strong>application/json</strong>.
                  </span>
                </div>
              </div>

              {/* Quick Simulation Sandbox */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <h4 className="font-black text-xs text-zinc-100 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  Instant Webhook Test (Sandbox)
                </h4>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Test live Discord alerts for your active repository <strong>{status.linkedRepo}</strong> instantly without configuring webhooks in GitHub:
                </p>

                {simSuccess && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[10px] text-emerald-400 leading-normal">
                    ✅ {simSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSimulate("push")}
                    disabled={!!simulating}
                    className="flex items-center justify-between p-2.5 bg-[#18181b] hover:bg-[#27272a] rounded-xl border border-zinc-800 font-black text-[10px] text-zinc-300 transition w-full"
                  >
                    <span className="flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-emerald-500" />
                      Push Commit (Code Upload)
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </button>

                  <button
                    onClick={() => handleSimulate("star")}
                    disabled={!!simulating}
                    className="flex items-center justify-between p-2.5 bg-[#18181b] hover:bg-[#27272a] rounded-xl border border-zinc-800 font-black text-[10px] text-zinc-300 transition w-full"
                  >
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      Star Repository
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </button>

                  <button
                    onClick={() => handleSimulate("issues")}
                    disabled={!!simulating}
                    className="flex items-center justify-between p-2.5 bg-[#18181b] hover:bg-[#27272a] rounded-xl border border-zinc-800 font-black text-[10px] text-zinc-300 transition w-full"
                  >
                    <span className="flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-rose-500" />
                      Bug Issue Opened
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Deployment & 24/7 Production Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="render-blueprints-block">
        
        {/* Render Deployment */}
        <div className="bg-[#121212] rounded-2xl border border-zinc-800/80 p-5 space-y-4" id="render-deployment-card">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Server className="w-4.5 h-4.5 text-indigo-500" />
            <h3 className="font-black text-sm text-zinc-100">24/7 Production Hosting & Deployment Guide</h3>
          </div>

          <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
            <div>
              <h4 className="font-black text-zinc-100 mb-1">1. Push Source Code to GitHub:</h4>
              <p className="mb-2">
                Download the full project as a <strong>ZIP archive</strong> from the settings menu or use <strong>GitHub Export</strong> to sync with your repository.
              </p>
              <div className="p-2.5 bg-zinc-950 rounded-lg text-[10px] font-mono text-zinc-300 space-y-1 border border-zinc-800/60">
                <div>git init</div>
                <div>git remote add origin https://github.com/YOUR_USER/YOUR_REPOS.git</div>
                <div>git add . && git commit -m "feat: discord bot sync core"</div>
                <div>git branch -M main && git push -u origin main</div>
              </div>
            </div>

            <div>
              <h4 className="font-black text-zinc-100 mb-1">2. Railway / Render / Cloud Hosting Configuration:</h4>
              <p className="mb-1">
                Create a new <strong>Web Service</strong> on Railway or Render, select your GitHub repository, and configure the runtime commands:
              </p>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between p-1.5 bg-[#18181b] rounded border border-zinc-800 font-mono">
                  <span className="font-bold text-zinc-500">Build Command:</span>
                  <code className="text-indigo-400 font-bold">npm run build</code>
                </div>
                <div className="flex justify-between p-1.5 bg-[#18181b] rounded border border-zinc-800 font-mono">
                  <span className="font-bold text-zinc-500">Start Command:</span>
                  <code className="text-indigo-400 font-bold">npm run start</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uptime and Env Variables Settings */}
        <div className="bg-[#121212] rounded-2xl border border-zinc-800/80 p-5 space-y-4" id="render-env-card">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Shield className="w-4.5 h-4.5 text-zinc-100" />
            <h3 className="font-black text-sm text-zinc-100">Environment Variables & Uptime Tips</h3>
          </div>

          <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
            <div>
              <h4 className="font-black text-zinc-100 mb-1">3. Add Environment Variables in Cloud Dashboard:</h4>
              <ul className="space-y-1 pl-0 list-none">
                <li className="flex justify-between p-1.5 bg-[#18181b] rounded border border-zinc-800 font-mono text-[10px]">
                  <span>NODE_ENV</span>
                  <span className="text-zinc-500">production</span>
                </li>
                <li className="flex justify-between p-1.5 bg-[#18181b] rounded border border-zinc-800 font-mono text-[10px]">
                  <span>GEMINI_API_KEY</span>
                  <span className="text-zinc-500">Your Gemini API Key</span>
                </li>
                <li className="flex justify-between p-1.5 bg-[#18181b] rounded border border-zinc-800 font-mono text-[10px]">
                  <span>DISCORD_BOT_TOKEN</span>
                  <span className="text-zinc-500">Your Discord Bot Secret Token</span>
                </li>
                <li className="flex justify-between p-1.5 bg-[#18181b] rounded border border-zinc-800 font-mono text-[10px]">
                  <span>DISCORD_CLIENT_ID</span>
                  <span className="text-zinc-500">Your Bot Application Client ID</span>
                </li>
              </ul>
            </div>

            <div className="p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-xl">
              <h5 className="font-bold text-amber-300 text-[11px] mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                24/7 Hosting High-Availability Tip:
              </h5>
              <p className="text-[10px] text-amber-200/80 leading-normal">
                If hosting on free tier platforms that go to sleep after inactivity, configure <a href="https://cron-job.org/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold hover:underline">cron-job.org</a> or <a href="https://uptimerobot.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold hover:underline">UptimeRobot</a> to send a HTTP ping to your app's <code>/api/health</code> endpoint every 5-10 minutes. This guarantees continuous 100% uptime!
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
