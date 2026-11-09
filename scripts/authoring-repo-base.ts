// 대상 저장소의 첫 작성 PR 이 같이 넣는 바탕 파일 셋과 그 파일을 올려도 되는지 가르는 순수 함수 (도메인/작성 「케이스를 쓰고 PR 을 올리는 곳」 · docs/SETUP.md §21)
//
// 글자는 저장소마다 같아야 한다 — 같은 저장소의 두 건이 첫 PR 전에 겹쳐도 두 번째 병합이 충돌하지 않는다. 그래서 name 칸도 안 넣는다

/** Commander 루트 package.json 의 @types/node 와 같은 판 — 설정 파일이 process 를 쓴다 */
const 노드타입판 = '^22.18.9';

const 패키지 = `${JSON.stringify(
  {
    private: true,
    type: 'module',
    scripts: { test: 'playwright test' },
    devDependencies: {
      '@platform/kit': 'github:maxihan1/platform-kit#v0.1.2',
      '@playwright/test': '1.63.0',
      '@types/node': 노드타입판,
    },
  },
  null,
  2,
)}\n`;

// project 이름이 다르면 kit 이 「환경을 선언하지 않았다」로 케이스를 건너뛴다. baseURL 이 비면 케이스의 상대 경로가 「invalid URL」이다 (SETUP §21)
const 설정 = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.PLATFORM_BASE_URL },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
    { name: 'android', timeout: 120_000 },
  ],
});
`;

// 웹 케이스만 있는 저장소는 webdriverio · control-cli 를 안 받는다 — kit 의 타입 파일이 둘을 가리켜 skipLibCheck 가 있어야 한다
const 타입설정 = `${JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      types: ['node'],
    },
  },
  null,
  2,
)}\n`;

/** 경로(저장소 뿌리 기준) → 고정 글 */
export const 바탕파일: Readonly<Record<string, string>> = {
  'tests/package.json': 패키지,
  'tests/playwright.config.ts': 설정,
  'tests/tsconfig.json': 타입설정,
};

export const 바탕파일들 = Object.keys(바탕파일);

/**
 * 바뀐 파일 가운데 바탕 파일을 올려도 되나. 판정 스크립트(cases-only.mjs)는 이름만 보고 받으므로 나머지를 여기서 본다.
 * Commander(자기 저장소)에는 절대 안 넣는다 — 그 체크아웃의 Playwright 가 더 가까운 tests/package.json 을 잡는다.
 * 대상 저장소는 기준에 없던 것을 고정 글 그대로 새로 만들 때만 받는다. 이미 있는 것은 저장소 주인 것이라 안 바꾼다
 */
export function 바탕파일거부사유(
  바뀐: string[],
  기준에있나: (경로: string) => boolean,
  글: (경로: string) => string | null,
  대상: boolean,
): string | null {
  const 닿은 = 바뀐.filter((f) => f in 바탕파일);
  if (닿은.length === 0) return null;
  if (!대상) return `Commander 저장소에는 바탕 파일을 올리지 않는다 — 올리지 않는다: ${닿은.join(' · ')}`;
  const 있던것 = 닿은.filter(기준에있나);
  if (있던것.length > 0) return `저장소에 이미 있는 바탕 파일은 바꾸지 않는다 — 올리지 않는다: ${있던것.join(' · ')}`;
  const 다른것 = 닿은.filter((f) => 글(f) !== 바탕파일[f]);
  return 다른것.length === 0 ? null : `바탕 파일이 정해 둔 꼴과 다르다 — 올리지 않는다: ${다른것.join(' · ')}`;
}
