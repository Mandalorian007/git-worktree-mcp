import { execSync } from "child_process";
import { existsSync, statSync, readdirSync, copyFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export interface WorktreeResult {
  success: boolean;
  message: string;
  path?: string;
  branch?: string;
  configFilesCopied?: string[];
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
  status: string;
}

export interface CleanupResult {
  success: boolean;
  message: string;
  removedPath?: string;
  warnings?: string[];
}

export interface WorktreeStatus {
  exists: boolean;
  path?: string;
  branch?: string;
  commit?: string;
  hasUncommittedChanges?: boolean;
  modifiedFiles?: string[];
  untrackedFiles?: string[];
}

export class GitWorktreeManager {
  private readonly CONFIG_FILES = [
    ".env",
    ".env.local", 
    ".env.development",
    ".env.production",
    ".mcp.json",
  ];
  
  private readonly CONFIG_DIRS = [
    ".claude",
    ".vscode",
  ];

  private isInGitRepo(): boolean {
    try {
      execSync("git rev-parse --git-dir", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  private getRepoRoot(): string {
    try {
      return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    } catch (error) {
      throw new Error("Not in a git repository");
    }
  }


  private copyConfigFiles(sourceDir: string, targetDir: string): string[] {
    const copiedFiles: string[] = [];

    for (const fileName of this.CONFIG_FILES) {
      const sourcePath = join(sourceDir, fileName);
      const targetPath = join(targetDir, fileName);
      
      if (existsSync(sourcePath)) {
        try {
          copyFileSync(sourcePath, targetPath);
          copiedFiles.push(fileName);
        } catch (error) {
          console.error(`Warning: Could not copy ${fileName}: ${error}`);
        }
      }
    }

    for (const dirName of this.CONFIG_DIRS) {
      const sourcePath = join(sourceDir, dirName);
      const targetPath = join(targetDir, dirName);
      
      if (existsSync(sourcePath) && statSync(sourcePath).isDirectory()) {
        try {
          this.copyDirectory(sourcePath, targetPath);
          copiedFiles.push(dirName + "/");
        } catch (error) {
          console.error(`Warning: Could not copy directory ${dirName}: ${error}`);
        }
      }
    }

    return copiedFiles;
  }

  private copyDirectory(source: string, target: string): void {
    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }

    const files = readdirSync(source);
    for (const file of files) {
      const sourcePath = join(source, file);
      const targetPath = join(target, file);
      
      if (statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async createFeatureWorktree(featureName: string): Promise<WorktreeResult> {
    try {
      if (!this.isInGitRepo()) {
        return {
          success: false,
          message: "Not in a git repository",
        };
      }


      const repoRoot = this.getRepoRoot();
      const branchName = `feature/${featureName}`;
      const worktreePath = join(repoRoot, ".worktree", featureName);

      if (existsSync(worktreePath)) {
        return {
          success: false,
          message: `Worktree already exists at ${worktreePath}`,
        };
      }

      try {
        execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, { stdio: "ignore" });
        return {
          success: false,
          message: `Branch ${branchName} already exists`,
        };
      } catch {
      }

      const worktreeDir = dirname(worktreePath);
      if (!existsSync(worktreeDir)) {
        mkdirSync(worktreeDir, { recursive: true });
      }

      execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, { 
        stdio: "pipe",
        cwd: repoRoot 
      });

      const copiedFiles = this.copyConfigFiles(repoRoot, worktreePath);

      return {
        success: true,
        message: `Created worktree for feature '${featureName}'`,
        path: worktreePath,
        branch: branchName,
        configFilesCopied: copiedFiles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to create worktree: ${errorMessage}`,
      };
    }
  }

  async listWorktrees(): Promise<WorktreeInfo[]> {
    try {
      if (!this.isInGitRepo()) {
        throw new Error("Not in a git repository");
      }

      const output = execSync("git worktree list --porcelain", { 
        encoding: "utf-8",
        stdio: "pipe"
      });

      const worktrees: WorktreeInfo[] = [];
      const lines = output.trim().split("\n");
      
      let currentWorktree: Partial<WorktreeInfo> = {};
      
      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          if (currentWorktree.path) {
            worktrees.push(currentWorktree as WorktreeInfo);
          }
          currentWorktree = { path: line.substring(9) };
        } else if (line.startsWith("HEAD ")) {
          currentWorktree.commit = line.substring(5);
        } else if (line.startsWith("branch ")) {
          currentWorktree.branch = line.substring(7);
        } else if (line === "bare") {
          currentWorktree.status = "bare";
        } else if (line === "detached") {
          currentWorktree.status = "detached";
        } else if (line === "") {
          if (currentWorktree.path) {
            if (!currentWorktree.status) {
              currentWorktree.status = "normal";
            }
            worktrees.push(currentWorktree as WorktreeInfo);
            currentWorktree = {};
          }
        }
      }

      if (currentWorktree.path) {
        if (!currentWorktree.status) {
          currentWorktree.status = "normal";
        }
        worktrees.push(currentWorktree as WorktreeInfo);
      }

      return worktrees;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list worktrees: ${errorMessage}`);
    }
  }

  async cleanupWorktree(featureName: string): Promise<CleanupResult> {
    try {
      if (!this.isInGitRepo()) {
        return {
          success: false,
          message: "Not in a git repository",
        };
      }


      const repoRoot = this.getRepoRoot();
      const worktreePath = join(repoRoot, ".worktree", featureName);
      const branchName = `feature/${featureName}`;

      if (!existsSync(worktreePath)) {
        return {
          success: false,
          message: `Worktree does not exist at ${worktreePath}`,
        };
      }

      const warnings: string[] = [];

      try {
        const statusOutput = execSync("git status --porcelain", {
          encoding: "utf-8",
          cwd: worktreePath,
          stdio: "pipe"
        });

        if (statusOutput.trim()) {
          return {
            success: false,
            message: `Worktree has uncommitted changes. Please commit or stash changes first.`,
            warnings: statusOutput.trim().split("\n"),
          };
        }
      } catch (error) {
        warnings.push(`Could not check git status: ${error}`);
      }

      execSync(`git worktree remove "${worktreePath}"`, {
        stdio: "pipe",
        cwd: repoRoot
      });

      try {
        execSync(`git branch -D "${branchName}"`, {
          stdio: "pipe", 
          cwd: repoRoot
        });
      } catch (error) {
        warnings.push(`Could not delete branch ${branchName}: ${error}`);
      }

      return {
        success: true,
        message: `Successfully removed worktree '${featureName}'`,
        removedPath: worktreePath,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Failed to cleanup worktree: ${errorMessage}`,
      };
    }
  }

  async getWorktreeStatus(featureName: string): Promise<WorktreeStatus> {
    try {
      if (!this.isInGitRepo()) {
        return {
          exists: false,
        };
      }


      const repoRoot = this.getRepoRoot();
      const worktreePath = join(repoRoot, ".worktree", featureName);

      if (!existsSync(worktreePath)) {
        return {
          exists: false,
        };
      }

      const branchName = `feature/${featureName}`;
      let commit: string | undefined;
      let hasUncommittedChanges = false;
      let modifiedFiles: string[] = [];
      let untrackedFiles: string[] = [];

      try {
        commit = execSync("git rev-parse HEAD", {
          encoding: "utf-8",
          cwd: worktreePath,
          stdio: "pipe"
        }).trim();
      } catch (error) {
        console.error(`Could not get commit: ${error}`);
      }

      try {
        const statusOutput = execSync("git status --porcelain", {
          encoding: "utf-8", 
          cwd: worktreePath,
          stdio: "pipe"
        });

        if (statusOutput.trim()) {
          hasUncommittedChanges = true;
          const lines = statusOutput.trim().split("\n");
          
          for (const line of lines) {
            const status = line.substring(0, 2);
            const filename = line.substring(3);
            
            if (status.includes("?")) {
              untrackedFiles.push(filename);
            } else {
              modifiedFiles.push(filename);
            }
          }
        }
      } catch (error) {
        console.error(`Could not get status: ${error}`);
      }

      return {
        exists: true,
        path: worktreePath,
        branch: branchName,
        commit,
        hasUncommittedChanges,
        modifiedFiles: modifiedFiles.length > 0 ? modifiedFiles : undefined,
        untrackedFiles: untrackedFiles.length > 0 ? untrackedFiles : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get worktree status: ${errorMessage}`);
    }
  }
}