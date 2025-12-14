#!/bin/bash
# Quick test to verify OpenCode CLI version in CI environment

echo "=== OpenCode CLI Version Test ==="
echo ""
echo "Checking opencode CLI installation..."
which opencode || echo "opencode not in PATH"
echo ""
echo "OpenCode CLI version:"
opencode --version
echo ""
echo "Expected: 1.0.153"
echo ""

VERSION=$(opencode --version)
if [ "$VERSION" = "1.0.153" ]; then
  echo "✓ CLI version is correct!"
  exit 0
else
  echo "✗ CLI version mismatch. Expected 1.0.153, got $VERSION"
  exit 1
fi
