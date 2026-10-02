// main 을 요청 브랜치에 합치기 — 임시 git 저장소로 실제 합치기를 돌려 본다 (작성 §3.6 「★ 반영 때 겹침 검사」)
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 합칠까, main합치기 } from './authoring-main-merge.js';

// GIT_* 를 전부 뺀다 — pre-push 훅 안에서는 git 이 GIT_DIR 을 넣어 두어 이 저장소에 커밋한다 (HOOKS.md)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([키]) => !키.startsWith('GIT_')));
const 자리들: string[] = [];

function 판(): { 트리: string; 깃: (인자: string[]) => { ok: boolean; 낸것: string; 까닭?: string } } {
  const 트리 = mkdtempSync(join(tmpdir(), 'main-merge-'));
  자리들.push(트리);
  const 깃 = (인자: string[]) => {
    const r = spawnSync('git', ['-c', 'user.name=검사', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...인자], {
      cwd: 트리,
      encoding: 'utf8',
      env: 깨끗한환경,
    });
    return { ok: r.status === 0, 낸것: r.stdout, 까닭: r.stderr };
  };
  깃(['init', '-q', '-b', 'main']);
  return { 트리, 깃 };
}

function 쓰기(트리: string, 경로: string, 글: string): void {
  mkdirSync(dirname(join(트리, 경로)), { recursive: true });
  writeFileSync(join(트리, 경로), 글);
}

const 케이스 = (tcId: string, 이름: string) =>
  `import { defineCase } from '@platform/kit';\n\nexport const spec = defineCase({\n  tcId: '${tcId}',\n  name: '${이름}',\n  platforms: ['desktop'],\n});\n`;
const 머리 = '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|------|----|------|------|------|------|------|----------|';
const 줄 = (번호: number, tcId: string) => `| ${String(번호)} | 정상 | 전제 | 조작 | 결과 | 9 REQ-PAY-${tcId.slice(-3)} | ${tcId} | 2026-10-01 |`;
const 표 = (덮는: string, 줄들: string[]) => ['# PAY — 결제', '', `**덮는 범위** — ${덮는}`, '', '## 요구사항', '', 머리, ...줄들, ''].join('\n');

/** 바탕 → 요청 브랜치(req)와 main 을 갈라 놓는다. 끝에 req 를 꺼내 둔다 */
function 갈라놓기(요청: (트리: string) => void, main: (트리: string) => void, 바탕?: (트리: string) => void) {
  const { 트리, 깃 } = 판();
  if (바탕 === undefined) {
    쓰기(트리, 'tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    쓰기(트리, 'docs/cases/PAY.md', 표('바탕', [줄(1, 'PAY-001')]));
  } else 바탕(트리);
  쓰기(트리, 'README.md', '바탕\n');
  깃(['add', '-A']);
  깃(['commit', '-q', '-m', '바탕']);
  깃(['checkout', '-q', '-b', 'req']);
  요청(트리);
  깃(['add', '-A']);
  깃(['commit', '-q', '-m', '요청']);
  깃(['checkout', '-q', 'main']);
  main(트리);
  깃(['add', '-A']);
  깃(['commit', '-q', '-m', 'main']);
  const mainSha = 깃(['rev-parse', 'HEAD']).낸것.trim();
  깃(['checkout', '-q', 'req']);
  return { 트리, 깃, mainSha };
}

const 판값 = { 표경로: 'docs/cases/PAY.md', 폴더: 'pay', 메시지: '[WS-작성] PAY 작성 요청 7번 케이스' };

afterEach(() => {
  for (const 자리 of 자리들.splice(0)) rmSync(자리, { recursive: true, force: true });
});

describe('합칠까', () => {
  it('main 이 이 서비스 표나 테스트 폴더를 바꿨을 때만 합친다', () => {
    expect(합칠까(['docs/cases/PAY.md'], 'docs/cases/PAY.md', 'pay')).toBe(true);
    expect(합칠까(['tests/pay/PAY-040.spec.ts'], 'docs/cases/PAY.md', 'pay')).toBe(true);
    expect(합칠까(['tests/mkt/MKT-001.spec.ts', 'docs/cases/MKT.md', 'apps/admin/src/x.ts'], 'docs/cases/PAY.md', 'pay')).toBe(false);
  });
});

describe('main 합치기', () => {
  it('두 요청이 같은 표 끝에 줄을 더해도 합쳐지고 이 요청 줄의 차례 번호가 뒤로 간다', () => {
    const { 트리, 깃, mainSha } = 갈라놓기(
      (t) => {
        쓰기(t, 'tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '요청 케이스'));
        쓰기(t, 'docs/cases/PAY.md', 표('요청 셈', [줄(1, 'PAY-001'), 줄(2, 'PAY-002')]));
      },
      (t) => {
        쓰기(t, 'tests/pay/PAY-003.spec.ts', 케이스('PAY-003', 'main 케이스'));
        쓰기(t, 'docs/cases/PAY.md', 표('main 셈', [줄(1, 'PAY-001'), 줄(2, 'PAY-003')]));
      },
    );
    expect(main합치기({ 트리, 깃, mainSha, ...판값 })).toEqual({ 합침: true });
    const 합친 = readFileSync(join(트리, 'docs/cases/PAY.md'), 'utf8');
    expect(합친).toContain('**덮는 범위** — 요청 셈');
    expect(합친).not.toContain('main 셈');
    expect(합친).toContain(줄(2, 'PAY-003'));
    expect(합친).toContain(줄(2, 'PAY-002').replace('| 2 |', '| 3 |'));
    expect(깃(['rev-list', '--parents', '-n', '1', 'HEAD']).낸것.trim().split(' ')).toHaveLength(3);
    expect(깃(['log', '-1', '--format=%B']).낸것).toContain('보류 값 반영');
    expect(깃(['status', '--porcelain']).낸것).toBe('');
  });

  it('케이스 파일이 충돌하면 합치지 않고 그 경로를 까닭에 싣는다 — 트리는 원래대로', () => {
    const { 트리, 깃, mainSha } = 갈라놓기(
      (t) => 쓰기(t, 'tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '요청 쪽')),
      (t) => 쓰기(t, 'tests/pay/PAY-002.spec.ts', 케이스('PAY-002', 'main 쪽')),
    );
    const 머리전 = 깃(['rev-parse', 'HEAD']).낸것;
    const 결과 = main합치기({ 트리, 깃, mainSha, ...판값 });
    expect(결과).toEqual({ 사유: expect.stringContaining('tests/pay/PAY-002.spec.ts') });
    expect(깃(['rev-parse', 'HEAD']).낸것).toBe(머리전);
    expect(깃(['status', '--porcelain']).낸것).toBe('');
  });

  describe('같은 서비스 요청 둘이 같은 Page Object 를 만들거나 고치면 반영 실패로 사람에게 넘긴다', () => {
    const 경로 = 'tests/mkt/pages/login.page.ts';
    const mkt값 = { 표경로: 'docs/cases/MKT.md', 폴더: 'mkt', 메시지: '[WS-작성] MKT 작성 요청 8번 케이스' };

    it.each([
      ['둘 다 새로 만들었다', undefined],
      ['둘 다 다르게 고쳤다', (t: string) => 쓰기(t, 경로, 'export class LoginPage {}\n')],
    ])('%s', (_이름, 바탕) => {
      const { 트리, 깃, mainSha } = 갈라놓기(
        (t) => 쓰기(t, 경로, 'export class LoginPage { 요청 = 1; }\n'),
        (t) => 쓰기(t, 경로, 'export class LoginPage { main = 1; }\n'),
        바탕 ?? (() => undefined),
      );
      const 머리전 = 깃(['rev-parse', 'HEAD']).낸것;
      const 결과 = main합치기({ 트리, 깃, mainSha, ...mkt값 });
      expect(결과).toEqual({ 사유: expect.stringContaining(경로) });
      expect(결과).toEqual({ 사유: expect.stringContaining('다시 작성') });
      expect(깃(['rev-parse', 'HEAD']).낸것).toBe(머리전);
      expect(깃(['status', '--porcelain']).낸것).toBe('');
    });
  });

  it('새 서비스의 첫 요청 둘이 표를 각자 만들었으면 합치지 않는다', () => {
    const { 트리, 깃, mainSha } = 갈라놓기(
      (t) => 쓰기(t, 'docs/cases/PAY.md', 표('요청', [줄(1, 'PAY-001')])),
      (t) => 쓰기(t, 'docs/cases/PAY.md', 표('main', [줄(1, 'PAY-001')])),
      (t) => 쓰기(t, 'tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스')),
    );
    expect(main합치기({ 트리, 깃, mainSha, ...판값 })).toEqual({ 사유: expect.stringContaining('각자') });
    expect(깃(['status', '--porcelain']).낸것).toBe('');
  });

  it('요구사항 표가 심볼릭 링크면 따라가지 않고 거절한다 — 에이전트는 root 로 돈다', () => {
    const { 트리, 깃, mainSha } = 갈라놓기(
      (t) => {
        rmSync(join(t, 'docs/cases/PAY.md'));
        symlinkSync('/etc/hosts', join(t, 'docs/cases/PAY.md'));
      },
      (t) => 쓰기(t, 'docs/cases/PAY.md', 표('main 셈', [줄(1, 'PAY-001'), 줄(2, 'PAY-003')])),
    );
    const 결과 = main합치기({ 트리, 깃, mainSha, ...판값 });
    expect(결과).toEqual({ 사유: expect.stringContaining('docs/cases/PAY.md') });
    expect(깃(['status', '--porcelain']).낸것).toBe('');
  });

  it('main 이 이 서비스를 안 건드렸으면 합치지 않는다 · 이미 품고 있어도 그대로다', () => {
    const { 트리, 깃, mainSha } = 갈라놓기(
      (t) => 쓰기(t, 'tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '요청 케이스')),
      (t) => 쓰기(t, 'README.md', 'main 이 바꿨다\n'),
    );
    const 머리전 = 깃(['rev-parse', 'HEAD']).낸것;
    expect(main합치기({ 트리, 깃, mainSha, ...판값 })).toEqual({ 합침: false });
    expect(깃(['rev-parse', 'HEAD']).낸것).toBe(머리전);
    const 요청머리 = 깃(['rev-parse', 'HEAD']).낸것.trim();
    expect(main합치기({ 트리, 깃, mainSha: 요청머리, ...판값 })).toEqual({ 합침: false });
  });
});
