import { execSync } from 'child_process';
import type { IssueDetails } from '../types.js';

export interface ParsedIssueUrl {
  owner: string;
  repo: string;
  number: number;
}

/**
 * Parse GitHub issue URL to extract owner, repo, and issue number
 * @param url - GitHub issue URL (e.g., https://github.com/owner/repo/issues/123)
 * @returns Object with owner, repo, and number
 * @throws Error if URL format is invalid
 */
export function parseIssueUrl(url: string): ParsedIssueUrl {
  // Match GitHub issue URL pattern
  const pattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)$/;
  const match = url.match(pattern);

  if (!match) {
    throw new Error(
      `Invalid GitHub issue URL format. Expected: https://github.com/owner/repo/issues/123, got: ${url}`
    );
  }

  const [, owner, repo, numberStr] = match;
  const number = parseInt(numberStr, 10);

  return {
    owner,
    repo,
    number,
  };
}

/**
 * Fetch issue details from GitHub using gh CLI
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param issueNumber - Issue number
 * @returns Issue details including title and body
 * @throws Error if gh CLI fails or issue not found
 */
export async function fetchIssueDetails(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueDetails> {
  try {
    // Execute gh CLI command to fetch issue details
    const command = `gh issue view ${issueNumber} --repo ${owner}/${repo} --json title,body`;
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse JSON output
    const data = JSON.parse(output);

    if (!data.title) {
      throw new Error(`Issue #${issueNumber} not found or has no title`);
    }

    return {
      owner,
      repo,
      number: issueNumber,
      title: data.title,
      body: data.body || '',
    };
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's an authentication error
      if (error.message.includes('GITHUB_TOKEN') || error.message.includes('authentication')) {
        throw new Error(
          `GitHub authentication failed. Make sure GH_TOKEN environment variable is set. Original error: ${error.message}`
        );
      }
      // Check if it's a not found error
      if (error.message.includes('Could not resolve')) {
        throw new Error(
          `Issue #${issueNumber} not found in repository ${owner}/${repo}`
        );
      }
      throw new Error(`Failed to fetch issue details: ${error.message}`);
    }
    throw error;
  }
}
