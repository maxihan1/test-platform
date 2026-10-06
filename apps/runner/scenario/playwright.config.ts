import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

import root from '../../../playwright.config.js';

// E2E 시나리오 전용 설정. 고정 spec 하나만 본다 (SPEC 도메인/러너 §5.2)
const here = dirname(fileURLToPath(import.meta.url));
// 상대 경로는 이 파일 기준으로 풀린다. 산출물이 이 폴더에 떨어지지 않게 저장소 뿌리 기준으로 적는다
const artifactsDir = process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(here, '../../../artifacts');

export default defineConfig({
  testDir: here,
  // 기본 무늬는 *.test.ts 도 잡는다. 같은 폴더의 vitest 검사를 Playwright 가 집어 가면 안 된다
  testMatch: 'scenario.spec.ts',
  outputDir: `${artifactsDir}/playwright`,
  workers: 1,
  // 자동 재시도를 쓰지 않는다. 켜려면 SPEC 도메인/러너 §5.2 의 그 문장을 먼저 고친다
  retries: 0,
  // 제한 시간의 정본은 러너 타이머다(timeoutMs). Playwright 기본 30초가 먼저 끊으면 부분 결과 모양이 갈린다
  timeout: 0,
  // 케이스 부품 하나는 단독 실행과 같은 시험 한도로 돈다. 루트에 timeout 을 넣는 날 둘이 갈리지 않게 거기서 읽는다 — 없으면 Playwright 기본 30초 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」)
  metadata: { partTimeoutMs: root.timeout ?? 30_000 },
  reporter: [[resolve(here, 'reporter.ts')]],
  // 루트 use 를 그대로 받는다 — 회사 서버의 기본 인증 · 사설 인증서 · 창 띄우기가 단독 실행과 같아야 한다
  use: { ...root.use, baseURL: process.env.PLATFORM_BASE_URL },
  // 디바이스 이름과 모양은 케이스 실행과 같아야 한다. 베끼면 어긋나므로 루트 설정에서 가져온다
  projects: root.projects,
});
