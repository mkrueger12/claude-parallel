#!/bin/bash

# Simple test script for running GitHub Actions workflows locally using act

set -e

# Check dependencies
if ! command -v act &> /dev/null; then
    echo "ERROR: act not installed. Install with: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker not running. Start with: sudo systemctl start docker"
    exit 1
fi

# Load environment
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    echo "Environment loaded from .env"
else
    echo "WARNING: .env file not found"
fi

# Main functions
test_v2_workflow() {
    echo "Testing Multi-Provider Plan v2 workflow..."
    act -W .github/workflows/multi-provider-plan-v2.yml -j get-issue --verbose
    act -W .github/workflows/multi-provider-plan-v2.yml -j generate-plan-anthropic --verbose
}

list_jobs() {
    echo "Available jobs:"
    act --list
}

cleanup() {
    echo "Cleaning up..."
    rm -rf .act
    docker system prune -f
}

# Usage
case "${1:-test}" in
    "test")
        test_v2_workflow
        ;;
    "list")
        list_jobs
        ;;
    "clean")
        cleanup
        ;;
    *)
        echo "Usage: $0 [test|list|clean]"
        exit 1
        ;;
esac

echo "Done!"
