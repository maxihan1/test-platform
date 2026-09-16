import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/** 는 Playwright 전용이라 Vitest가 집어가면 안 된다 (SPEC §9.1)
    include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'],
  },
});
