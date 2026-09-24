// 이미지가 운영 명령을 싣고 있는지 본다. 컨테이너를 띄우지 않고 Dockerfile 글자만 읽는다 (SPEC §9.2)

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync(resolve(process.cwd(), 'apps/admin/Dockerfile'), 'utf8');

// 작성 에이전트 컨테이너가 지켜야 할 것 (SPEC 공통/6 §9 · 2026-09-23 게이트 1).
// 글자로 본다 — 서비스 블록을 들여쓰기로 잘라 그 안만 본다
const compose = readFileSync(resolve(process.cwd(), 'docker-compose.yml'), 'utf8');
const author = /^ {2}author:\n((?: {4}.*\n|\s*\n)+)/m.exec(compose)?.[1] ?? '';

describe('작성 에이전트 컨테이너(author)', () => {
  it('있다 — 서버가 보내기를 바로 집는다', () => {
    expect(author).not.toBe('');
  });

  it('선택 사항이다 — 토큰을 넣기 전에 up -d 로 같이 떠 재시작만 반복하지 않게', () => {
    expect(author).toMatch(/profiles:\s*\[\s*authoring\s*\]/);
  });

  it('저장소를 붙이되 .env 는 가린다 — 자식 세션이 모든 비밀값을 읽게 된다', () => {
    expect(author).toMatch(/- \.\/:\/repo\b/);
    expect(author).toMatch(/- \/dev\/null:\/repo\/\.env:ro/);
  });

  it('DB 가 있는 기본 망에 붙지 않는다 — admin 하고만 같은 망이다', () => {
    expect(author).toMatch(/networks:\s*\[\s*authoring\s*\]/);
    expect(author).not.toMatch(/networks:.*default/);
  });

  // 망을 갈라도 postgres 가 호스트의 모든 주소에 열려 있으면 author 가 게이트웨이로 돌아 닿는다 (2026-09-23 보안 검사)
  it('postgres 는 호스트의 모든 주소가 아니라 이 기계 안(127.0.0.1)에만 연다', () => {
    expect(compose).toMatch(/- "127\.0\.0\.1:\$\{POSTGRES_PORT:-5433\}:5432"/);
  });

  // 2026-09-24 게이트 0 — root 로 켜야 자식을 다른 uid 로 띄워 에이전트의 토큰(/proc/<pid>/environ)을 못 읽게 한다.
  // 서버 저장소에 쓰는 일은 HOST_UID 로 한다 — 옛 단언(「root 로 돌지 않는다」)이 막으려던 것은 그대로 막힌다
  it('root 로 켠다 — user: 가 없고 자식·호스트 uid 를 받는다', () => {
    expect(author).not.toMatch(/^\s*user:/m);
    expect(author).toMatch(/AUTHORING_CHILD_UID:/);
    expect(author).toMatch(/HOST_UID:/);
    expect(author).toMatch(/HOST_GID:/);
  });

  it('모델·effort·예비 모델·동시 상한·CLI 최신화를 .env 로 바꾼다', () => {
    for (const 칸 of [
      'AUTHORING_MODEL',
      'AUTHORING_EFFORT',
      'AUTHORING_FALLBACK_MODEL',
      'AUTHORING_MAX_PARALLEL',
      'AUTHORING_CLAUDE_VERSION',
      'AUTHORING_CLAUDE_AUTOUPDATE',
    ]) {
      expect(author).toMatch(new RegExp(`${칸}:`));
    }
  });

  // 자식을 kill -9 -1 로 거두면 Chromium 이 PID 1 아래 고아로 남는다. node 는 자기 자식만 거둬 좀비가 쌓이고,
  // 좀비가 남으면 「다 거뒀나」 확인도 끝나지 않는다 (2026-09-24 코드 검토)
  it('init 이 PID 1 이 되어 고아 프로세스를 거둔다', () => {
    expect(author).toMatch(/init:\s*true/);
  });

  it('메모리는 동시 2건 몫이다 — 한 건이 claude + Chromium 3회다', () => {
    expect(author).toMatch(/mem_limit:\s*8g/);
  });
});

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
