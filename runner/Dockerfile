FROM oven/bun:latest

# System dependencies
RUN apt-get update && apt-get install -y \
    git \
    jq \
    curl \
    python3 \
    python3-pip \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for Claude (bypassPermissions doesn't work with root)
RUN useradd -m -s /bin/bash claude && \
    echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Switch to claude user for Claude CLI installation
USER claude
WORKDIR /home/claude

# Claude CLI (installed as non-root user)
RUN curl -fsSL https://claude.ai/install.sh | bash

# TursoDB CLI (for agent-memory skill)
RUN curl --proto '=https' --tlsv1.2 -LsSf \
    https://github.com/tursodatabase/turso/releases/latest/download/turso_cli-installer.sh | bash || true

# Switch back to root for copying files
USER root

# Claude config (skills, hooks, commands) - copy to claude user's config location
COPY runner/claude-config/ /home/claude/.claude/
RUN chown -R claude:claude /home/claude/.claude

# Make skill scripts executable
RUN chmod +x /home/claude/.claude/skills/agent-memory/scripts/*.sh || true

# Mark Claude as onboarded
RUN echo '{"hasCompletedOnboarding": true}' > /home/claude/.claude.json && \
    chown claude:claude /home/claude/.claude.json

# Create directories
RUN mkdir -p /opt/claude-parallel && \
    chown -R claude:claude /opt/claude-parallel

# Copy app files (build context is repo root)
WORKDIR /app
COPY runner/server.ts .
COPY runner/init.sh .
RUN chmod +x init.sh

# Copy parallel-impl.sh and prompts
COPY parallel-impl.sh /opt/claude-parallel/
COPY prompts/ /opt/claude-parallel/prompts/
RUN chmod +x /opt/claude-parallel/parallel-impl.sh

# Set ownership for app directory
RUN chown -R claude:claude /app

# Create turso symlink (binary is named tursodb)
RUN ln -s /home/claude/.turso/tursodb /home/claude/.turso/turso || true

# Environment defaults
ENV PORT=8080
ENV HOME=/home/claude
ENV PATH="/home/claude/.local/bin:/home/claude/.turso:${PATH}"

# Run as non-root user
USER claude

CMD ["bun", "run", "server.ts"]
