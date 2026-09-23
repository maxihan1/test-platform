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

  it('root 로 돌지 않는다 — 서버 저장소에 root 소유 파일이 남는다', () => {
    expect(author).toMatch(/user:\s*"\$\{HOST_UID/);
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
