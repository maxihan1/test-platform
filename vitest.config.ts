import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/** 는 Playwright 전용이라 Vitest가 집어가면 안 된다 (SPEC §9.1)
    // `*.test.ts` 는 `.test.tsx` 를 안 문다. 확장자를 한 무늬에 담아 뿌리마다 빠지는 쪽이 없게 한다
    include: ['apps/**/*.test.ts?(x)', 'packages/**/*.test.ts?(x)'],
    // 검사 파일들이 같은 DB 하나를 쓴다. 병렬로 돌리면 접두사를 갈라 놔도 안 막히는 간섭이 남는다 —
    // recoverRunning() 처럼 표 전체를 범위로 잡는 제품 코드는 남의 fixture 까지 닫는다 (spec-review G4)
    fileParallelism: false,
  },
});
