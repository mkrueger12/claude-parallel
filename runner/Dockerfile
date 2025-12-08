FROM oven/bun:latest

# System dependencies
RUN apt-get update && apt-get install -y \
    git \
    jq \
    curl \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Claude CLI
RUN curl -fsSL https://claude.ai/install.sh | sh \
    && ln -s /root/.claude/bin/claude /usr/local/bin/claude

# TursoDB CLI (for agent-memory skill)
RUN curl --proto '=https' --tlsv1.2 -LsSf \
    https://github.com/tursodatabase/turso/releases/latest/download/turso_cli-installer.sh | sh \
    && ln -s /root/.turso/bin/turso /usr/local/bin/turso || true

# Claude config (skills, hooks, commands) - copy to user config location
COPY runner/claude-config/ /root/.claude/

# Make skill scripts executable
RUN chmod +x /root/.claude/skills/agent-memory/scripts/*.sh || true

# Mark Claude as onboarded
RUN echo '{"hasCompletedOnboarding": true}' > /root/.claude.json

# Create directories
RUN mkdir -p /opt/claude-parallel

# Copy app files (build context is repo root)
WORKDIR /app
COPY runner/server.ts .
COPY runner/init.sh .
RUN chmod +x init.sh

# Copy parallel-impl.sh and prompts
COPY parallel-impl.sh /opt/claude-parallel/
COPY prompts/ /opt/claude-parallel/prompts/
RUN chmod +x /opt/claude-parallel/parallel-impl.sh

# Environment defaults
ENV PORT=8080

CMD ["bun", "run", "server.ts"]
