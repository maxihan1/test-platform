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

  it('작업 폴더(/work)는 이름 붙은 볼륨이다 — 중단된 작성의 보관 폴더가 컨테이너를 다시 만들어도 남는다', () => {
    expect(author).toMatch(/AUTHORING_WORK_DIR:\s*\/work\b/);
    expect(author).toMatch(/- author_work:\/work\b/);
    expect(compose).toMatch(/^ {2}author_work:\s*\{\}/m);
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
  // 바탕 이미지의 /ms-playwright 는 0777 이다 — 앞 건의 자식(자리 uid)이 브라우저를 바꿔치기하면
  // 다음 건(다른 서비스)의 관문이 그 코드를 돌린다 (2026-09-24 재검사)
  it('브라우저 폴더는 자식이 못 쓴다', () => {
    const 도커파일 = readFileSync(new URL('../../authoring/Dockerfile', import.meta.url), 'utf8');
    expect(도커파일).toMatch(/chmod -R go-w \/ms-playwright/);
  });

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

// Grafana 는 헤더(X-WEBAUTH-USER)를 믿는다. admin 말고 아무도 닿지 못해야 한다 (SPEC 공통/6 §9 · 도메인/인증 §7 「Grafana 통로」)
function 서비스블록(이름: string): string {
  return new RegExp(`^ {2}${이름}:\\n((?: {4}.*\\n|\\s*\\n)+)`, 'm').exec(compose)?.[1] ?? '';
}

function 망(블록: string): string[] {
  return /^ {4}networks:\s*\[([^\]]*)\]/m.exec(블록)?.[1]?.split(',').map((s) => s.trim()) ?? [];
}

describe('Grafana 는 로그인 뒤에 있다', () => {
  const grafana = 서비스블록('grafana');

  it('바깥 포트를 열지 않는다', () => {
    expect(grafana).not.toBe('');
    expect(grafana).not.toMatch(/^ {4}ports:/m);
  });

  it('이미지는 실측한 판으로 고정한다 — 같은 출처라 새 판의 기본값 변화가 플랫폼에 그대로 온다', () => {
    expect(grafana).toMatch(/^ {4}image: grafana\/grafana:13\.2\.2(\s|$)/m);
  });

  it('dashboard 망에만 붙는다', () => {
    expect(망(grafana)).toEqual(['dashboard']);
  });

  it('러너는 dashboard 망에 없다 — 테스트 코드가 헤더를 지어낼 수 있다', () => {
    expect(서비스블록('runner')).not.toBe('');
    expect(망(서비스블록('runner'))).not.toContain('dashboard');
  });

  it('postgres 와 admin 은 dashboard 망에 있다', () => {
    expect(망(서비스블록('postgres'))).toContain('dashboard');
    expect(망(서비스블록('admin'))).toContain('dashboard');
    expect(compose).toMatch(/^ {2}dashboard:\s*\{\}/m);
  });

  it('dashboard 망에 붙은 서비스는 admin · grafana · postgres 셋뿐이다 — 새 서비스가 조용히 붙지 않게', () => {
    const 서비스들 = [...(/^services:\n((?: {2}.*\n|\s*\n)+)/m.exec(compose)?.[1] ?? '').matchAll(/^ {2}([a-z_-]+):\n/gm)].map(
      (m) => m[1]!,
    );
    expect(서비스들.length).toBeGreaterThan(3);
    expect(서비스들.filter((이름) => 망(서비스블록(이름)).includes('dashboard')).sort()).toEqual(['admin', 'grafana', 'postgres']);
  });

  it('admin 은 넘겨줄 곳(GRAFANA_URL)을 받는다', () => {
    expect(서비스블록('admin')).toMatch(/GRAFANA_URL:\s*"\$\{GRAFANA_URL:-http:\/\/grafana:3000\}"/);
  });

  it('명세 표의 환경값을 전부 싣는다', () => {
    const 값들: Record<string, string> = {
      GF_AUTH_PROXY_ENABLED: 'true',
      GF_AUTH_PROXY_HEADER_NAME: 'X-WEBAUTH-USER',
      GF_AUTH_PROXY_AUTO_SIGN_UP: 'true',
      GF_USERS_AUTO_ASSIGN_ORG_ROLE: 'Viewer',
      GF_AUTH_DISABLE_LOGIN_FORM: 'true',
      GF_AUTH_BASIC_ENABLED: 'false',
      GF_AUTH_SIGNOUT_REDIRECT_URL: '/',
      GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION: 'true',
      GF_LIVE_MAX_CONNECTIONS: '0',
      GF_SERVER_ROOT_URL: '%(protocol)s://%(domain)s/grafana/',
      GF_SERVER_SERVE_FROM_SUB_PATH: 'true',
    };
    for (const [이름, 값] of Object.entries(값들)) {
      const 줄 = new RegExp(`^ {6}${이름}:\\s*"([^"]*)"`, 'm').exec(grafana);
      expect(줄?.[1], 이름).toBe(값);
    }
  });

  it('옛 포트 설정(GRAFANA_PORT · VITE_GRAFANA_PORT)이 어디에도 없다', () => {
    const env예시 = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');
    for (const 글 of [compose, dockerfile, env예시]) {
      expect(글).not.toMatch(/GRAFANA_PORT/);
    }
  });
});
