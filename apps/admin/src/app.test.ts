// 컨텍스트 폴더의 routes.ts 가 전부 app.ts 에 등록됐는지 본다 (WORKSTREAMS 공용 골격)

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// **app.ts 를 import 하지 않는다.** 그 파일은 모듈이면서 실행 진입점이라
// 불러오는 순간 SESSION_SECRET 을 보고 포트를 연다. 그래서 글자로 읽는다 —
// auth/scope.test.ts 가 라우트표를 지키는 것과 같은 수법이다
function 소스() {
  const 뿌리 = resolve(dirname(new URL(import.meta.url).pathname));
  const 폴더들 = readdirSync(뿌리, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((이름) => existsSync(join(뿌리, 이름, 'routes.ts')));
  return { 폴더들, 글: readFileSync(join(뿌리, 'app.ts'), 'utf8') };
}

describe('등록 규약', () => {
  // **이 그물이 없으면 등록을 빠뜨려도 어떤 검사도 안 잡는다** — 컨텍스트별 routes.test.ts 는
  // 자기 모듈을 직접 등록해 app.ts 를 안 지나고, scope.test.ts 는 라우트 파일만 읽는다.
  // 그래서 검사가 전부 초록인데 실제로 부르면 404 다 (2026-09-22 검토가 잡았다)
  it('routes.ts 가 있는 폴더는 전부 app.ts 에 등록돼 있다', () => {
    const { 폴더들, 글 } = 소스();
    const 빠진것 = 폴더들.filter((이름) => !글.includes(`./${이름}/routes.js`));
    expect(
      빠진것,
      `app.ts 에 등록 안 된 컨텍스트: ${빠진것.join(' · ')}\n` +
        `본 폴더: ${폴더들.join(' · ')}\n` +
        '등록을 빠뜨리면 검사는 전부 초록인데 실제로 부르면 404 다',
    ).toEqual([]);
  });

  it('등록한 것이 실제로 app.register 로 붙는다 — import 만 해 두면 안 붙는다', () => {
    const { 폴더들, 글 } = 소스();
    const 안붙은것 = 폴더들.filter((이름) => {
      const 별칭 = 글.match(new RegExp(`import (\\w+) from '\\./${이름}/routes\\.js'`))?.[1];
      return 별칭 === undefined || !new RegExp(`app\\.register\\(${별칭}\\b`).test(글);
    });
    expect(안붙은것, `import 만 되고 register 가 안 된 컨텍스트: ${안붙은것.join(' · ')}`).toEqual(
      [],
    );
  });
});
