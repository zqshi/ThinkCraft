import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeEnv = process.env.NODE_ENV || 'development';

const envFilesByEnv = {
  production: '.env.production',
  test: '.env.test',
  development: '.env'
};

const envFile = envFilesByEnv[nodeEnv] || '.env';
const envPath = path.resolve(baseDir, envFile);

dotenv.config({ path: envPath });
