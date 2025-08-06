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
export declare class GitWorktreeManager {
    private readonly CONFIG_FILES;
    private readonly CONFIG_DIRS;
    private isInGitRepo;
    private getRepoRoot;
    private copyConfigFiles;
    private copyDirectory;
    createFeatureWorktree(featureName: string): Promise<WorktreeResult>;
    listWorktrees(): Promise<WorktreeInfo[]>;
    cleanupWorktree(featureName: string): Promise<CleanupResult>;
    getWorktreeStatus(featureName: string): Promise<WorktreeStatus>;
}
