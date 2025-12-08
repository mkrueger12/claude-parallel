#!/bin/bash
# init.sh - Runs in cloned repo before parallel-impl.sh
# Detects and installs project dependencies

set -e

echo "Detecting and installing dependencies..."

# Node.js projects
if [ -f "package.json" ]; then
    echo "Found package.json"
    if [ -f "bun.lockb" ]; then
        echo "Installing with bun..."
        bun install
    elif [ -f "pnpm-lock.yaml" ]; then
        echo "Installing with pnpm..."
        command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
        pnpm install
    elif [ -f "yarn.lock" ]; then
        echo "Installing with yarn..."
        command -v yarn >/dev/null 2>&1 || npm install -g yarn
        yarn install
    else
        echo "Installing with npm..."
        npm install
    fi
fi

# Python projects
if [ -f "requirements.txt" ]; then
    echo "Found requirements.txt"
    pip3 install -r requirements.txt --quiet
fi

if [ -f "pyproject.toml" ]; then
    echo "Found pyproject.toml"
    if command -v poetry >/dev/null 2>&1; then
        poetry install
    elif command -v pip3 >/dev/null 2>&1; then
        pip3 install . --quiet 2>/dev/null || true
    fi
fi

# Ruby projects
if [ -f "Gemfile" ]; then
    echo "Found Gemfile"
    if command -v bundle >/dev/null 2>&1; then
        bundle install
    else
        echo "Warning: bundler not installed, skipping Ruby deps"
    fi
fi

# Go projects
if [ -f "go.mod" ]; then
    echo "Found go.mod"
    if command -v go >/dev/null 2>&1; then
        go mod download
    else
        echo "Warning: go not installed, skipping Go deps"
    fi
fi

# Rust projects
if [ -f "Cargo.toml" ]; then
    echo "Found Cargo.toml"
    if command -v cargo >/dev/null 2>&1; then
        cargo fetch
    else
        echo "Warning: cargo not installed, skipping Rust deps"
    fi
fi

# PHP projects
if [ -f "composer.json" ]; then
    echo "Found composer.json"
    if command -v composer >/dev/null 2>&1; then
        composer install --no-interaction --quiet
    else
        echo "Warning: composer not installed, skipping PHP deps"
    fi
fi

echo "Dependencies installed successfully"
