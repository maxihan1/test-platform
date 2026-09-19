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

  it('scripts 가 의존하는 apps/admin 을 먼저 싣는다', () => {
    const scripts = dockerfile.search(/^COPY\s+scripts\s/m);
    const admin = dockerfile.search(/^COPY\s+apps\/admin\s/m);
    expect(admin).toBeGreaterThanOrEqual(0);
    expect(scripts).toBeGreaterThan(admin);
  });
});
