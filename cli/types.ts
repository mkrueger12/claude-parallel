/**
 * CLI Installation Types
 * Type definitions for the claude-parallel CLI installer
 */

/**
 * Configuration options for the installation process
 */
export interface InstallOptions {
  /** Target directory where files will be installed */
  targetDir: string;
  /** Whether to include custom Claude agents in .claude/agents/ */
  includeAgents: boolean;
  /** Force overwrite of existing files */
  force: boolean;
  /** Perform a dry run without writing files */
  dryRun: boolean;
  /** Skip interactive prompts and use defaults */
  skipPrompts: boolean;
}

/**
 * User's feature selection during interactive setup
 */
export interface FeatureSelection {
  /** Include multi-provider plan generation workflow */
  planningWorkflow: boolean;
  /** Include parallel implementation workflow */
  implementWorkflow: boolean;
  /** Include custom Claude agents */
  agents: boolean;
}

/**
 * Represents a template file to be copied
 */
export interface TemplateFile {
  /** Source path relative to template directory */
  source: string;
  /** Destination path relative to target directory */
  destination: string;
  /** Whether this file is optional (won't fail if missing) */
  optional?: boolean;
}
