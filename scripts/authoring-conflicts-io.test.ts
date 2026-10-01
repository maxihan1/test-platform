// 반영 때 겹침 읽기 — 자식이 끝낸 커밋 · 서버 저장소 git 객체로 겹침판 · 반영 길 · 끝내기 몸 · PR 본문 줄 (작성 §3.6 「★ 반영 때 겹침 검사」)
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 겹침끝몸, 겹침판읽기, 결정들, 반영길, 본문처리줄, 자식커밋찾기 } from './authoring-conflicts-io.js';

// GIT_* 를 전부 뺀다 — pre-push 훅 안에서는 git 이 GIT_DIR 을 넣어 두어 이 저장소에 커밋한다 (HOOKS.md)
const 깨끗한환경 = Object.fromEntries(Object.entries(process.env).filter(([키]) => !키.startsWith('GIT_')));
const 자리들: string[] = [];

function 판() {
  const 트리 = mkdtempSync(join(tmpdir(), 'conflicts-io-'));
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
  const 쓰기 = (경로: string, 글: string) => {
    mkdirSync(dirname(join(트리, 경로)), { recursive: true });
    writeFileSync(join(트리, 경로), 글);
  };
  const 커밋 = (제목: string, 둘째?: string) => {
    깃(['add', '-A']);
    깃(['commit', '-q', '-m', 제목, ...(둘째 === undefined ? [] : ['-m', 둘째])]);
    return 깃(['rev-parse', 'HEAD']).낸것.trim();
  };
  return { 트리, 깃, 쓰기, 커밋 };
}

const 케이스 = (tcId: string, 이름: string) =>
  `import { defineCase } from '@platform/kit';\n\nexport const spec = defineCase({\n  tcId: '${tcId}',\n  name: '${이름}',\n  platforms: ['desktop'],\n});\n`;
const 머리 = '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|------|----|------|------|------|------|------|----------|';
const 줄 = (번호: number, 출처: string, tcId: string) => `| ${String(번호)} | 정상 | 전제 | 조작 | 결과 | ${출처} | ${tcId} | 2026-10-01 |`;
const 표 = (줄들: string[]) => ['# PAY', '', '## 요구사항', '', 머리, ...줄들, ''].join('\n');
const 반영표시 = '보류 값 반영';

afterEach(() => {
  for (const 자리 of 자리들.splice(0)) rmSync(자리, { recursive: true, force: true });
});

describe('자식이 끝낸 커밋', () => {
  it('에이전트의 반영 커밋(보류 값 · 겹침 처리 · main 합침)을 첫 부모로 여럿 거슬러 간다', () => {
    const { 깃, 쓰기, 커밋 } = 판();
    쓰기('a.txt', '1');
    const 자식 = 커밋('[WS-작성] PAY 작성 요청 7번 케이스');
    쓰기('a.txt', '2');
    커밋('[WS-작성] PAY 작성 요청 7번 케이스', 반영표시);
    쓰기('a.txt', '3');
    const 머리커밋 = 커밋('[WS-작성] PAY 작성 요청 7번 케이스', 반영표시);
    expect(자식커밋찾기(깃, 머리커밋)).toBe(자식);
    expect(자식커밋찾기(깃, 자식)).toBe(자식);
  });
});

describe('겹침판 읽기', () => {
  function 갈라놓기() {
    const g = 판();
    g.쓰기('tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    g.쓰기('docs/cases/PAY.md', 표([줄(1, '9 REQ-1', 'PAY-001')]));
    g.커밋('바탕');
    g.깃(['checkout', '-q', '-b', 'req']);
    g.쓰기('tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '쿠폰 적용'));
    g.쓰기('tests/pay/PAY-003.spec.ts', 케이스('PAY-003', '로그인 '));
    g.쓰기('tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스 고침'));
    g.쓰기('docs/cases/PAY.md', 표([줄(1, '9 REQ-1', 'PAY-001'), 줄(2, '9 REQ-2', 'PAY-002'), 줄(3, '9 REQ-3', 'PAY-003')]));
    const 자식 = g.커밋('[WS-작성] PAY 작성 요청 7번 케이스');
    g.쓰기('tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '쿠폰 적용 값'));
    const 머리커밋 = g.커밋('[WS-작성] PAY 작성 요청 7번 케이스', 반영표시);
    g.깃(['checkout', '-q', 'main']);
    g.쓰기('tests/pay/coupon.spec.ts', 케이스('PAY-002', '먼저 들어온 쿠폰'));
    g.쓰기('tests/pay/PAY-010.spec.ts', 케이스('PAY-010', '로그인'));
    g.쓰기('docs/cases/PAY.md', 표([줄(1, '9 REQ-1', 'PAY-001'), 줄(2, '8 REQ-9', 'PAY-002'), 줄(3, '8 REQ-3', 'PAY-010'), '| 4 | x | x | x | x | x | 제거함(PAY-040) | x |']));
    const mainSha = g.커밋('main');
    return { ...g, 자식, 머리커밋, mainSha };
  }

  it('자식이 끝낸 커밋에서 새로 더한 케이스만 지금 main 과 견주고 합칠지 · 쓴 번호를 낸다', () => {
    const { 깃, 자식, 머리커밋, mainSha } = 갈라놓기();
    const 결과 = 겹침판읽기(깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set() });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.자식커밋).toBe(자식);
    expect(결과.합칠까).toBe(true);
    expect(결과.겹침.map((c: 겹침) => [c.tcId, c.kinds])).toEqual([
      ['PAY-002', ['TCID']],
      ['PAY-003', ['REQUIREMENT', 'NAME']],
    ]);
    expect(결과.겹침[0]?.name).toBe('쿠폰 적용');
    expect([...결과.쓴번호].sort()).toEqual(['PAY-001', 'PAY-002', 'PAY-003', 'PAY-010', 'PAY-040']);
  });

  it('보류에서 뺀 tc_id 는 겹침으로 안 센다', () => {
    const { 깃, 머리커밋, mainSha } = 갈라놓기();
    const 결과 = 겹침판읽기(깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set(['PAY-002']) });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.겹침.map((c: 겹침) => c.tcId)).toEqual(['PAY-003']);
  });

  it('main 이 이 서비스를 안 건드렸으면 합치지 않고 겹침도 없다', () => {
    const g = 판();
    g.쓰기('tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    g.커밋('바탕');
    g.깃(['checkout', '-q', '-b', 'req']);
    g.쓰기('tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '쿠폰'));
    const 머리커밋 = g.커밋('[WS-작성] PAY 작성 요청 7번 케이스');
    g.깃(['checkout', '-q', 'main']);
    g.쓰기('README.md', 'x');
    const mainSha = g.커밋('main');
    const 결과 = 겹침판읽기(g.깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set() });
    expect(결과).toMatchObject({ 자식커밋: 머리커밋, 합칠까: false, 겹침: [] });
  });

  it('한글 파일 이름도 겹침을 본다 — git 이 따옴표로 감싸 내는 이름에 속지 않는다', () => {
    const g = 판();
    g.쓰기('tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    g.커밋('바탕');
    g.깃(['checkout', '-q', '-b', 'req']);
    g.쓰기('tests/pay/쿠폰.spec.ts', 케이스('PAY-002', '쿠폰'));
    const 머리커밋 = g.커밋('[WS-작성] PAY 작성 요청 7번 케이스');
    g.깃(['checkout', '-q', 'main']);
    g.쓰기('tests/pay/PAY-002.spec.ts', 케이스('PAY-002', '먼저 들어온'));
    const mainSha = g.커밋('main');
    const 결과 = 겹침판읽기(g.깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set() });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.겹침.map((c: 겹침) => [c.tcId, c.file])).toEqual([['PAY-002', 'tests/pay/쿠폰.spec.ts']]);
  });

  it('겹친 케이스의 번호 모양이 규칙과 다르면 사유 — 서버가 목록을 통째로 거절하기 전에', () => {
    const g = 판();
    g.쓰기('tests/pay/PAY-001.spec.ts', 케이스('PAY-001', '첫 케이스'));
    g.커밋('바탕');
    g.깃(['checkout', '-q', '-b', 'req']);
    g.쓰기('tests/pay/bad.spec.ts', 케이스('pay-2', '쿠폰'));
    const 머리커밋 = g.커밋('[WS-작성] PAY 작성 요청 7번 케이스');
    g.깃(['checkout', '-q', 'main']);
    g.쓰기('tests/pay/other.spec.ts', 케이스('pay-2', '먼저 들어온'));
    const mainSha = g.커밋('main');
    expect(겹침판읽기(g.깃, { 머리: 머리커밋, mainSha, 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set() })).toEqual({
      사유: expect.stringContaining('pay-2'),
    });
  });

  it('git 이 실패하면 사유', () => {
    const g = 판();
    expect(겹침판읽기(g.깃, { 머리: 'f'.repeat(40), mainSha: 'e'.repeat(40), 폴더: 'pay', 표경로: 'docs/cases/PAY.md', 뺀것: new Set() })).toEqual({
      사유: expect.any(String),
    });
  });
});

describe('반영 길', () => {
  const 겹친: 겹침 = { tcId: 'PAY-002', name: '쿠폰', file: 'tests/pay/PAY-002.spec.ts', kinds: ['TCID'], with: [] };
  const 이름만: 겹침 = { ...겹친, tcId: 'PAY-003', kinds: ['NAME'] };
  const 기본 = { 겹침: [] as 겹침[], 결정: [], 보류: false, 합칠까: false, 머리: 'a', 자식커밋: 'a' };

  it('고르지 않은 겹침이 있으면 멈춘다', () => {
    expect(반영길({ ...기본, 겹침: [겹친, 이름만], 결정: [{ tcId: 'PAY-002', action: 'KEEP' }] })).toBe('멈춤');
  });

  it('바꿀 것 · 보류 · 합치기 · 앞 반영 커밋 가운데 하나라도 있으면 작업 폴더를 연다', () => {
    expect(반영길({ ...기본, 겹침: [겹친], 결정: [{ tcId: 'PAY-002', action: 'KEEP' }] })).toBe('작업방');
    expect(반영길({ ...기본, 겹침: [이름만], 결정: [{ tcId: 'PAY-003', action: 'DROP' }] })).toBe('작업방');
    expect(반영길({ ...기본, 보류: true })).toBe('작업방');
    expect(반영길({ ...기본, 합칠까: true })).toBe('작업방');
    expect(반영길({ ...기본, 머리: 'b' })).toBe('작업방');
  });

  it('이름 · 요구 번호만 겹쳐 남기기로 했고 그 밖에 할 것이 없으면 그대로 반영한다', () => {
    expect(반영길({ ...기본, 겹침: [이름만], 결정: [{ tcId: 'PAY-003', action: 'KEEP' }, { tcId: 'PAY-099', action: 'DROP' }] })).toBe('그대로');
  });
});

describe('가져가기의 결정 · 끝내기 몸 · PR 본문 줄', () => {
  it('집기 응답의 conflicts 에서 모양이 맞는 결정만 읽는다', () => {
    expect(결정들([{ tcId: 'PAY-002', action: 'KEEP' }, { tcId: 'PAY-003', action: 'RENUMBER' }, 'x', { action: 'DROP' }])).toEqual([
      { tcId: 'PAY-002', action: 'KEEP' },
    ]);
    expect(결정들(undefined)).toEqual([]);
  });

  it('겹침으로 멈추면 고르지 않은 수를 문장에 싣고 목록을 result.conflicts 로 보낸다', () => {
    const 겹친: 겹침 = { tcId: 'PAY-002', name: '쿠폰', file: 'f', kinds: ['TCID'], with: [] };
    expect(겹침끝몸([겹친, { ...겹친, tcId: 'PAY-003' }], [{ tcId: 'PAY-003', action: 'KEEP' }])).toEqual({
      status: 'FAILED',
      error: '겹치는 케이스 1건 — 케이스마다 고른 뒤 다시 반영한다',
      result: { conflicts: [겹친, { ...겹친, tcId: 'PAY-003' }] },
    });
  });

  it('PR 본문의 겹침 처리 줄은 하나만 — 다시 반영하면 바꾼다', () => {
    const 한번 = 본문처리줄('본문\n', '겹침 처리: PAY-002 → PAY-041');
    expect(한번).toBe('본문\n\n겹침 처리: PAY-002 → PAY-041\n');
    expect(본문처리줄(한번, '겹침 처리: PAY-002 뺌')).toBe('본문\n\n겹침 처리: PAY-002 뺌\n');
  });
});
