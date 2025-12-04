#!/bin/bash

echo "Creating 3 jobs..."

# Create job 1
JOB1=$(curl -s -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"issueUrl":"https://github.com/test/repo1/issues/1"}' | jq -r '.jobId')
echo "Job 1 ID: $JOB1"

# Create job 2
JOB2=$(curl -s -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"issueUrl":"https://github.com/test/repo2/issues/2"}' | jq -r '.jobId')
echo "Job 2 ID: $JOB2"

# Create job 3
JOB3=$(curl -s -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"issueUrl":"https://github.com/test/repo3/issues/3"}' | jq -r '.jobId')
echo "Job 3 ID: $JOB3"

echo ""
echo "Retrieving jobs..."

# Retrieve job 1
echo "Job 1 status:"
curl -s http://localhost:3000/jobs/$JOB1 | jq -c '{id: .id, issueUrl: .issueUrl, status: .status}'

# Retrieve job 2
echo "Job 2 status:"
curl -s http://localhost:3000/jobs/$JOB2 | jq -c '{id: .id, issueUrl: .issueUrl, status: .status}'

# Retrieve job 3
echo "Job 3 status:"
curl -s http://localhost:3000/jobs/$JOB3 | jq -c '{id: .id, issueUrl: .issueUrl, status: .status}'

# Verify IDs are unique
echo ""
echo "Verifying unique IDs..."
if [ "$JOB1" != "$JOB2" ] && [ "$JOB1" != "$JOB3" ] && [ "$JOB2" != "$JOB3" ]; then
  echo "✅ All job IDs are unique"
else
  echo "❌ Job IDs are not unique"
  exit 1
fi

echo ""
echo "✅ TEST PASSED: Job store maintains multiple jobs with unique IDs"
