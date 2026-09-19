// 이미지가 운영 명령을 싣고 있는지 본다. 컨테이너를 띄우지 않고 Dockerfile 글자만 읽는다 (SPEC §9.2)

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync(resolve(process.cwd(), 'apps/admin/Dockerfile'), 'utf8');

describe('admin 이미지', () => {
  // SPEC §9.2 가 첫 계정·첫 서비스·정기 실행을 「컨테이너 안 명령」으로 정했고
  // 그 명령들이 저장소 루트의 scripts/ 에 있다. 이미지에 안 들어가면 셋 다 죽는다
  it('운영 명령이 든 scripts 폴더를 싣는다', () => {
    expect(dockerfile).toMatch(/^COPY\s+scripts\s/m);
  });

  // scripts/*.ts 가 ../apps/admin/src/** 를 상대경로로 부른다. 둘 다 이미지에 있어야
  // 돈다 — 순서는 상관없다. 해석은 빌드가 아니라 실행할 때 일어난다
  it('scripts 가 의존하는 apps/admin 도 함께 싣는다', () => {
    expect(dockerfile).toMatch(/^COPY\s+apps\/admin\s/m);
  });
});
