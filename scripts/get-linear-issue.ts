#!/usr/bin/env bun

/**
 * Fetch Linear issue details and output in GitHub Actions format
 *
 * Usage:
 *   bun run scripts/get-linear-issue.ts <issue-id-or-url>
 *
 * Outputs to GITHUB_OUTPUT:
 *   - id: Linear issue ID
 *   - number: Linear issue identifier (e.g., "ENG-123")
 *   - title: Issue title
 *   - body_file: Path to file containing issue description
 *
 * Requires environment variables:
 *   - LINEAR_API_KEY: Linear API key
 *   - GITHUB_OUTPUT: Path to GitHub Actions output file
 */

import { writeFileSync, appendFileSync } from "fs";

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state?: {
    name: string;
  };
  assignee?: {
    name: string;
  };
}

interface LinearResponse {
  data?: {
    issue?: LinearIssue;
  };
  errors?: Array<{ message: string }>;
}

async function fetchLinearIssue(issueId: string, apiKey: string): Promise<LinearIssue> {
  const query = `
    query GetIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        state {
          name
        }
        assignee {
          name
        }
      }
    }
  `;

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query,
      variables: { id: issueId },
    }),
  });

  if (!response.ok) {
    throw new Error(`Linear API request failed: ${response.status} ${response.statusText}`);
  }

  const data: LinearResponse = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(`Linear API error: ${data.errors.map((e) => e.message).join(", ")}`);
  }

  if (!data.data?.issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }

  return data.data.issue;
}

function extractIssueId(input: string): string {
  // If it's a URL, extract the issue ID from it
  // Linear URLs: https://linear.app/{workspace}/{team}/{issue-id}
  // or: https://linear.app/issue/{issue-id}
  const urlMatch = input.match(/linear\.app\/(?:issue\/)?([A-Z]+-\d+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // If it looks like an issue identifier (e.g., "ENG-123"), return as-is
  if (/^[A-Z]+-\d+$/i.test(input)) {
    return input;
  }

  // Otherwise assume it's already an issue ID
  return input;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: bun run scripts/get-linear-issue.ts <issue-id-or-url>");
    process.exit(1);
  }

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error("Error: LINEAR_API_KEY environment variable is required");
    process.exit(1);
  }

  const githubOutput = process.env.GITHUB_OUTPUT;
  if (!githubOutput) {
    console.error("Error: GITHUB_OUTPUT environment variable is required (this script is for GitHub Actions)");
    process.exit(1);
  }

  try {
    const issueId = extractIssueId(input);
    console.log(`Fetching Linear issue: ${issueId}`);

    const issue = await fetchLinearIssue(issueId, apiKey);

    console.log(`Found issue: ${issue.identifier} - ${issue.title}`);
    console.log(`State: ${issue.state?.name || "unknown"}`);
    console.log(`Assignee: ${issue.assignee?.name || "unassigned"}`);

    // Write issue body to file
    const bodyFile = "/tmp/linear-issue-body.txt";
    writeFileSync(bodyFile, issue.description || "");

    // Write outputs to GITHUB_OUTPUT
    appendFileSync(githubOutput, `id=${issue.id}\n`);
    appendFileSync(githubOutput, `number=${issue.identifier}\n`);
    appendFileSync(githubOutput, `title=${issue.title}\n`);
    appendFileSync(githubOutput, `body_file=${bodyFile}\n`);

    console.log("Issue details written to GITHUB_OUTPUT");
  } catch (error) {
    console.error(`Failed to fetch Linear issue: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
