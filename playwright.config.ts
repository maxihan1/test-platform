import { defineConfig, devices } from '@playwright/test';

// /tests는 컨테이너에 읽기 전용으로 마운트되므로 산출물은 반드시 그 밖에 쌓아야 한다 (SPEC §9)
const testsDir = process.env.PLATFORM_TESTS_DIR ?? './tests';
const artifactsDir = process.env.PLATFORM_ARTIFACTS_DIR ?? './artifacts';

export default defineConfig({
  testDir: testsDir,
  outputDir: `${artifactsDir}/playwright`,
  // 케이스 1건 = Playwright 프로세스 1개. 동시 실행은 Execution의 동시성(2)으로만 제어한다 (SPEC §5.2)
  workers: 1,
  reporter: 'line',
  projects: [
    // 이름이 Platform 타입 값과 철자까지 같아야 한다. 러너가 그대로 --project 인자로 넘긴다
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
