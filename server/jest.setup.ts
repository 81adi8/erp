import * as dotenv from 'dotenv';
import * as path from 'path';
import { connectRedis, disconnectRedis } from './src/config/redis';

dotenv.config({ path: path.join(__dirname, '.env.test') });

beforeAll(async () => {
  await connectRedis();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnectRedis();
});
