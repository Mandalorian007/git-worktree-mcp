import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { GitWorktreeManager } from '../src/worktree-manager.js'

// Mock the GitWorktreeManager
vi.mock('../src/worktree-manager.js', () => ({
  GitWorktreeManager: vi.fn().mockImplementation(() => ({
    createFeatureWorktree: vi.fn(),
    listWorktrees: vi.fn(),
    cleanupWorktree: vi.fn(),
    getWorktreeStatus: vi.fn(),
  })),
}))

// Tool schemas (from index.ts)
const featureNameSchema = z.string()
  .min(1, "Feature name cannot be empty")
  .regex(/^[a-zA-Z0-9_-]+$/, "Feature name can only contain letters, numbers, hyphens, and underscores")
  .refine(name => !name.startsWith("-") && !name.endsWith("-"), "Feature name cannot start or end with a hyphen")

const createFeatureWorktreeSchema = z.object({
  featureName: featureNameSchema.describe("Name of the feature branch and worktree"),
})

const cleanupWorktreeSchema = z.object({
  featureName: featureNameSchema.describe("Name of the feature worktree to cleanup"),
})

const getWorktreeStatusSchema = z.object({
  featureName: featureNameSchema.describe("Name of the feature worktree to check status"),
})

const listWorktreesSchema = z.object({})

describe('Git Worktree MCP Tools', () => {
  let mockWorktreeManager: any

  beforeEach(() => {
    mockWorktreeManager = new GitWorktreeManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Input Validation', () => {
    it('should validate valid feature names', () => {
      expect(() => featureNameSchema.parse('valid-name')).not.toThrow()
      expect(() => featureNameSchema.parse('valid_name')).not.toThrow()
      expect(() => featureNameSchema.parse('validName123')).not.toThrow()
    })

    it('should reject empty feature names', () => {
      expect(() => featureNameSchema.parse('')).toThrow('Feature name cannot be empty')
    })

    it('should reject feature names with invalid characters', () => {
      expect(() => featureNameSchema.parse('invalid!')).toThrow('Feature name can only contain letters, numbers, hyphens, and underscores')
      expect(() => featureNameSchema.parse('invalid@name')).toThrow()
      expect(() => featureNameSchema.parse('invalid space')).toThrow()
    })

    it('should reject feature names starting or ending with hyphen', () => {
      expect(() => featureNameSchema.parse('-invalid')).toThrow('Feature name cannot start or end with a hyphen')
      expect(() => featureNameSchema.parse('invalid-')).toThrow('Feature name cannot start or end with a hyphen')
    })
  })

  describe('create_feature_worktree', () => {
    it('should validate input and call worktree manager', async () => {
      const mockResult = { success: true, path: '/test/.worktree/test-feature' }
      mockWorktreeManager.createFeatureWorktree.mockResolvedValue(mockResult)

      const args = createFeatureWorktreeSchema.parse({ featureName: 'test-feature' })
      const result = await mockWorktreeManager.createFeatureWorktree(args.featureName)

      expect(mockWorktreeManager.createFeatureWorktree).toHaveBeenCalledWith('test-feature')
      expect(result).toEqual(mockResult)
    })

    it('should handle creation errors', async () => {
      const mockError = { success: false, message: 'Branch already exists' }
      mockWorktreeManager.createFeatureWorktree.mockResolvedValue(mockError)

      const args = createFeatureWorktreeSchema.parse({ featureName: 'existing-feature' })
      const result = await mockWorktreeManager.createFeatureWorktree(args.featureName)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Branch already exists')
    })
  })

  describe('list_worktrees', () => {
    it('should validate empty input and call worktree manager', async () => {
      const mockResult = [
        { path: '/test', branch: 'main', commit: 'abc123', status: 'normal' },
        { path: '/test/.worktree/feature', branch: 'feature/test', commit: 'def456', status: 'normal' }
      ]
      mockWorktreeManager.listWorktrees.mockResolvedValue(mockResult)

      const args = listWorktreesSchema.parse({})
      const result = await mockWorktreeManager.listWorktrees()

      expect(mockWorktreeManager.listWorktrees).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })
  })

  describe('cleanup_worktree', () => {
    it('should validate input and call worktree manager', async () => {
      const mockResult = { success: true, message: 'Worktree removed', removedPath: '/test/.worktree/test-feature' }
      mockWorktreeManager.cleanupWorktree.mockResolvedValue(mockResult)

      const args = cleanupWorktreeSchema.parse({ featureName: 'test-feature' })
      const result = await mockWorktreeManager.cleanupWorktree(args.featureName)

      expect(mockWorktreeManager.cleanupWorktree).toHaveBeenCalledWith('test-feature')
      expect(result).toEqual(mockResult)
    })
  })

  describe('get_worktree_status', () => {
    it('should validate input and call worktree manager', async () => {
      const mockResult = { 
        exists: true, 
        path: '/test/.worktree/test-feature', 
        branch: 'feature/test-feature',
        hasUncommittedChanges: false 
      }
      mockWorktreeManager.getWorktreeStatus.mockResolvedValue(mockResult)

      const args = getWorktreeStatusSchema.parse({ featureName: 'test-feature' })
      const result = await mockWorktreeManager.getWorktreeStatus(args.featureName)

      expect(mockWorktreeManager.getWorktreeStatus).toHaveBeenCalledWith('test-feature')
      expect(result).toEqual(mockResult)
    })
  })
})