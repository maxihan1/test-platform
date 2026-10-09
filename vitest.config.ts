import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

// tests/** 는 Playwright 전용이라 Vitest가 집어가면 안 된다 (SPEC §9.1)
// `*.test.ts` 는 `.test.tsx` 를 안 문다. 확장자를 한 무늬에 담아 뿌리마다 빠지는 쪽이 없게 한다
const 검사자리 = ['apps/**/*.test.ts?(x)', 'packages/**/*.test.ts?(x)', 'scripts/**/*.test.ts?(x)'];

function 검사파일들(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === 'dist') return [];
    const p = join(dir, e.name);
    if (e.isDirectory()) return 검사파일들(p);
    return /\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

// DB 검사 파일은 같은 DB 하나를 쓴다. 병렬로 돌리면 접두사를 갈라 놔도 안 막히는 간섭이 남는다 —
// recoverRunning() 처럼 표 전체를 범위로 잡는 제품 코드는 남의 fixture 까지 닫는다 (spec-review G4).
// 그래서 DATABASE_URL 을 읽는 파일만 한 프로세스에서 차례로 돌리고 나머지는 동시에 돈다 (2026-10-09 — 전부 차례로 돌 때 본문 55초 · 전체 4~5분).
// 목록을 손으로 적지 않는다 — 새 DB 검사가 생기면 저절로 이쪽으로 온다
const DB파일 = ['apps', 'packages', 'scripts'].flatMap(검사파일들).filter((f) => readFileSync(f, 'utf8').includes('DATABASE_URL'));

export default defineConfig({
  test: {
    // CI·훅은 `--changed` 로 바뀐 것과 이어진 검사만 돈다. migration · lockfile · tsconfig 는 어떤 코드도 import 하지 않아
    // 바꿔도 검사가 안 골라진다 — 이것들이 바뀌면 전체를 돈다.
    // 패턴은 절대 경로에 대므로 `**/` 로 시작해야 걸린다. 경로에 점 폴더(.claude/worktrees)가 끼면 그래도 안 걸린다 —
    // 그래서 작업방에서 도는 pre-push 는 이것에 기대지 않고 파일 이름을 직접 본다 (2026-09-25 실측)
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/db/migrations/**',
      '**/db/init/**',
      '**/package-lock.json',
      '**/tsconfig.json',
    ],
    projects: [
      { extends: true, test: { name: 'db', include: DB파일, poolOptions: { forks: { singleFork: true } } } },
      // 동시에 돌면 CPU 를 나눠 써 무거운 검사(케이스 354개를 다시 읽는 scanner.test 등)가 기본 5초를 넘긴다. 멈춤을 잡는 데는 30초로 충분하다
      { extends: true, test: { name: 'unit', include: 검사자리, exclude: [...configDefaults.exclude, ...DB파일], testTimeout: 30_000 } },
    ],
  },
});
