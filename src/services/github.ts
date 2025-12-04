import { execSync } from 'child_process';
import { GitHubIssue } from '../types/index.js';

// ============================================================================
// Types for GitHub URL parsing
// ============================================================================

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  issueNumber: number;
}

// ============================================================================
// Parse GitHub Issue URL
// ============================================================================

/**
 * Parses a GitHub issue URL and extracts the owner, repo, and issue number.
 *
 * @param url - The GitHub issue URL to parse (e.g., https://github.com/owner/repo/issues/123)
 * @returns Object containing owner, repo, and issueNumber
 * @throws Error if URL is invalid or not a GitHub issue URL
 *
 * Handles:
 * - Standard format: https://github.com/owner/repo/issues/123
 * - Trailing slashes: https://github.com/owner/repo/issues/123/
 * - Query parameters: https://github.com/owner/repo/issues/123?foo=bar
 * - Hash fragments: https://github.com/owner/repo/issues/123#issuecomment-123
 * - HTTP (upgraded to HTTPS internally)
 */
export function parseGitHubIssueUrl(url: string): ParsedGitHubUrl {
  // Validate input
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  // Remove whitespace
  url = url.trim();

  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`);
  }

  // Validate hostname
  if (parsedUrl.hostname !== 'github.com' && parsedUrl.hostname !== 'www.github.com') {
    throw new Error(`Invalid GitHub URL: Expected github.com, got ${parsedUrl.hostname}`);
  }

  // Extract path parts
  // Path format: /owner/repo/issues/123
  const pathParts = parsedUrl.pathname.split('/').filter(part => part.length > 0);

  // Validate path structure
  if (pathParts.length < 4) {
    throw new Error(`Invalid GitHub issue URL: Expected format /owner/repo/issues/number, got ${parsedUrl.pathname}`);
  }

  const [owner, repo, issuesSegment, issueNumberStr] = pathParts;

  // Validate "issues" segment
  if (issuesSegment !== 'issues') {
    throw new Error(`Invalid GitHub issue URL: Expected 'issues' segment, got '${issuesSegment}'`);
  }

  // Validate issue number
  const issueNumber = parseInt(issueNumberStr, 10);
  if (isNaN(issueNumber) || issueNumber <= 0) {
    throw new Error(`Invalid issue number: Expected positive integer, got '${issueNumberStr}'`);
  }

  // Validate owner and repo names
  if (!owner || owner.length === 0) {
    throw new Error('Invalid GitHub issue URL: Owner name is empty');
  }

  if (!repo || repo.length === 0) {
    throw new Error('Invalid GitHub issue URL: Repository name is empty');
  }

  return {
    owner,
    repo,
    issueNumber,
  };
}

// ============================================================================
// Fetch Issue Details from GitHub
// ============================================================================

/**
 * Fetches issue details from GitHub using the `gh` CLI.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param issueNumber - Issue number
 * @returns GitHubIssue object with issue details
 * @throws Error if gh CLI fails, issue not found, or authentication fails
 *
 * Requires:
 * - `gh` CLI installed and in PATH
 * - Valid GitHub authentication (GH_TOKEN or gh auth login)
 * - Read access to the repository
 */
export function fetchIssueDetails(
  owner: string,
  repo: string,
  issueNumber: number
): GitHubIssue {
  // Validate inputs
  if (!owner || typeof owner !== 'string') {
    throw new Error('Invalid owner: must be a non-empty string');
  }

  if (!repo || typeof repo !== 'string') {
    throw new Error('Invalid repo: must be a non-empty string');
  }

  if (!issueNumber || issueNumber <= 0) {
    throw new Error('Invalid issue number: must be a positive integer');
  }

  // Construct the gh command
  const repoFullName = `${owner}/${repo}`;
  const command = `gh issue view ${issueNumber} --repo ${repoFullName} --json number,title,body,url`;

  try {
    // Execute gh CLI command
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'], // Capture stderr for better error handling
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large issue bodies
    });

    // Parse JSON output
    let issueData: any;
    try {
      issueData = JSON.parse(output);
    } catch (parseError) {
      throw new Error(`Failed to parse gh CLI output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate required fields
    if (!issueData.number || !issueData.title || !issueData.url) {
      throw new Error('Invalid issue data: missing required fields (number, title, or url)');
    }

    // Construct GitHubIssue object
    const issue: GitHubIssue = {
      number: issueData.number,
      title: issueData.title,
      body: issueData.body || '', // Body can be empty
      repoOwner: owner,
      repoName: repo,
      url: issueData.url,
    };

    return issue;
  } catch (error) {
    // Handle various error types
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error conditions
      if (errorMessage.includes('gh: command not found') || errorMessage.includes('not found')) {
        throw new Error('GitHub CLI (gh) is not installed or not in PATH. Please install it from https://cli.github.com/');
      }

      if (errorMessage.includes('Could not resolve to an Issue') || errorMessage.includes('not found')) {
        throw new Error(`Issue #${issueNumber} not found in repository ${repoFullName}`);
      }

      if (errorMessage.includes('authentication') || errorMessage.includes('auth') || errorMessage.includes('Unauthorized')) {
        throw new Error('GitHub authentication failed. Please run "gh auth login" or set GH_TOKEN environment variable');
      }

      if (errorMessage.includes('rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please try again later or authenticate with gh CLI');
      }

      // Re-throw with context
      throw new Error(`Failed to fetch issue details for ${repoFullName}#${issueNumber}: ${errorMessage}`);
    }

    // Fallback for non-Error throws
    throw new Error(`Failed to fetch issue details for ${repoFullName}#${issueNumber}: Unknown error`);
  }
}

// ============================================================================
// Get Repository Clone URL
// ============================================================================

/**
 * Returns the HTTPS clone URL for a GitHub repository.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns HTTPS clone URL (e.g., https://github.com/owner/repo.git)
 */
export function getRepoCloneUrl(owner: string, repo: string): string {
  if (!owner || typeof owner !== 'string') {
    throw new Error('Invalid owner: must be a non-empty string');
  }

  if (!repo || typeof repo !== 'string') {
    throw new Error('Invalid repo: must be a non-empty string');
  }

  return `https://github.com/${owner}/${repo}.git`;
}
