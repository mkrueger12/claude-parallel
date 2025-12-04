export interface Config {
  PORT: number;
  WORK_DIR: string;
  GH_TOKEN: string | undefined;
  JOB_TIMEOUT: number;
}

export const config: Config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  WORK_DIR: process.env.WORK_DIR || '/tmp/claude-parallel',
  GH_TOKEN: process.env.GH_TOKEN,
  JOB_TIMEOUT: parseInt(process.env.JOB_TIMEOUT || '600000', 10),
};

// Validate configuration
export function validateConfig(): void {
  if (isNaN(config.PORT) || config.PORT <= 0 || config.PORT > 65535) {
    throw new Error('Invalid PORT: must be a number between 1 and 65535');
  }

  if (!config.WORK_DIR) {
    throw new Error('WORK_DIR is required');
  }

  if (isNaN(config.JOB_TIMEOUT) || config.JOB_TIMEOUT <= 0) {
    throw new Error('Invalid JOB_TIMEOUT: must be a positive number');
  }
}
