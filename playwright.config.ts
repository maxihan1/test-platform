import { defineConfig, devices } from '@playwright/test';

// /tests는 컨테이너에 읽기 전용으로 마운트되므로 산출물은 반드시 그 밖에 쌓아야 한다 (SPEC §9)
const testsDir = process.env.PLATFORM_TESTS_DIR ?? './tests';
const artifactsDir = process.env.PLATFORM_ARTIFACTS_DIR ?? './artifacts';

export default defineConfig({
  testDir: testsDir,
  outputDir: `${artifactsDir}/playwright`,
  // 케이스 1건 = Playwright 프로세스 1개. 동시 실행은 Execution의 동시성(2)으로만 제어한다 (SPEC §5.2)
  workers: 1,
  // 자동 재시도를 쓰지 않는다. 실패를 가려서 초록불을 만드는 것과, 불안정한지 보려고 일부러
  // 여러 번 돌리는 것은 다른 일이다. 여러 번 돌리는 쪽은 실행 요청의 repeat 가 맡는다.
  // 켜려면 SPEC §5.2 의 그 문장을 먼저 고친다
  retries: 0,
  reporter: 'line',
  // 러너가 실행마다 PLATFORM_BASE_URL 로 넘긴다. 한 번 정하는 설정이 아니라 실행마다 바뀌는 값이다 (§5.2)
  use: { baseURL: process.env.PLATFORM_BASE_URL },
  projects: [
    // 이름이 Platform 타입 값과 철자까지 같아야 한다. 러너가 그대로 --project 인자로 넘긴다
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
