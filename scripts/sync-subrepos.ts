import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

interface WorkspaceRepoConfig {
  subrepositories?: SubrepositoryConfig[];
}

interface SubrepositoryConfig {
  name: string;
  path: string;
  remoteUrl?: string;
  defaultBranch?: string;
  required?: boolean;
}

function runGit(args: string[], cwd: string, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}\n${result.stdout}${result.stderr}`.trim()
    );
  }

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function readConfig(): WorkspaceRepoConfig {
  return JSON.parse(readFileSync("repo.json", "utf-8")) as WorkspaceRepoConfig;
}

function ensureSubrepo(repo: SubrepositoryConfig) {
  const repoPath = repo.path;
  const remoteUrl = repo.remoteUrl?.trim();
  const defaultBranch = repo.defaultBranch || "main";

  if (!existsSync(repoPath)) {
    if (!remoteUrl) {
      const message = `[${repo.name}] missing at ${repoPath}, but repo.json has no remoteUrl.`;
      if (repo.required) throw new Error(message);
      console.warn(`${message} Skipped.`);
      return;
    }

    console.log(`[${repo.name}] cloning ${remoteUrl} -> ${repoPath}`);
    const parent = dirname(repoPath);
    const cloneArgs = ["clone", "--branch", defaultBranch, remoteUrl, repoPath];
    runGit(cloneArgs, existsSync(parent) ? parent : ".");
  }

  if (!existsSync(join(repoPath, ".git"))) {
    throw new Error(`[${repo.name}] ${repoPath} exists but is not an independent Git repository.`);
  }

  const status = runGit(["status", "--porcelain"], repoPath).stdout;
  const origin = runGit(["remote", "get-url", "origin"], repoPath, true);

  if (!origin.ok) {
    if (remoteUrl) {
      console.log(`[${repo.name}] adding origin ${remoteUrl}`);
      runGit(["remote", "add", "origin", remoteUrl], repoPath);
    } else {
      console.log(`[${repo.name}] local repository exists; no origin remote configured.`);
      return;
    }
  } else if (remoteUrl && origin.stdout !== remoteUrl) {
    console.log(`[${repo.name}] updating origin remote.`);
    runGit(["remote", "set-url", "origin", remoteUrl], repoPath);
  }

  console.log(`[${repo.name}] fetching origin.`);
  runGit(["fetch", "--prune", "origin"], repoPath);

  const upstream = runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    repoPath,
    true
  );
  const rebaseTarget = upstream.ok ? upstream.stdout : `origin/${defaultBranch}`;

  if (status) {
    console.warn(`[${repo.name}] working tree is dirty; fetched but skipped rebase.`);
    return;
  }

  console.log(`[${repo.name}] rebasing on ${rebaseTarget}.`);
  runGit(["rebase", "--autostash", rebaseTarget], repoPath);
}

function main() {
  const config = readConfig();
  for (const repo of config.subrepositories || []) {
    ensureSubrepo(repo);
  }
}

main();
