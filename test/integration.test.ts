import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { GitWorktreeManager } from '../src/worktree-manager.js'

const TEST_DIR = '/tmp/git-worktree-mcp-test'

describe('Git Worktree Integration Tests', () => {
  let manager: GitWorktreeManager

  beforeAll(async () => {
    // Clean up any existing test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }

    // Create test git repository
    mkdirSync(TEST_DIR, { recursive: true })
    process.chdir(TEST_DIR)
    
    execSync('git init', { stdio: 'pipe' })
    execSync('git config user.name "Test User"', { stdio: 'pipe' })
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' })
    execSync('git commit --allow-empty -m "Initial commit"', { stdio: 'pipe' })

    manager = new GitWorktreeManager()
  })

  it('should create, list, and cleanup worktrees', async () => {
    const featureName = 'test-integration'

    // Test creation
    const createResult = await manager.createFeatureWorktree(featureName)
    expect(createResult.success).toBe(true)
    expect(createResult.path).toContain('.worktree/test-integration')
    expect(existsSync(createResult.path!)).toBe(true)

    // Test listing
    const listResult = await manager.listWorktrees()
    expect(listResult.length).toBeGreaterThan(1)
    expect(listResult.some(w => w.path.includes('test-integration'))).toBe(true)

    // Test status
    const statusResult = await manager.getWorktreeStatus(featureName)
    expect(statusResult.exists).toBe(true)
    expect(statusResult.path).toContain('test-integration')
    expect(statusResult.branch).toBe('feature/test-integration')

    // Test cleanup
    const cleanupResult = await manager.cleanupWorktree(featureName)
    expect(cleanupResult.success).toBe(true)
    expect(existsSync(createResult.path!)).toBe(false)

    // Verify cleanup
    const finalListResult = await manager.listWorktrees()
    expect(finalListResult.some(w => w.path.includes('test-integration'))).toBe(false)
  })

  it('should handle duplicate creation attempts', async () => {
    const featureName = 'duplicate-test'

    // Create first worktree
    const firstResult = await manager.createFeatureWorktree(featureName)
    expect(firstResult.success).toBe(true)

    // Try to create duplicate
    const duplicateResult = await manager.createFeatureWorktree(featureName)
    expect(duplicateResult.success).toBe(false)
    expect(duplicateResult.message).toContain('already exists')

    // Cleanup
    await manager.cleanupWorktree(featureName)
  })

  it('should handle cleanup of non-existent worktree', async () => {
    const result = await manager.cleanupWorktree('non-existent')
    expect(result.success).toBe(false)
    expect(result.message).toContain('does not exist')
  })

  it('should handle status of non-existent worktree', async () => {
    const result = await manager.getWorktreeStatus('non-existent')
    expect(result.exists).toBe(false)
  })
})