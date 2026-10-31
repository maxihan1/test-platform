// 프로젝트 노트 고치기의 순수 함수 검사 — 노트 일 가르기 · PR 주소 · 바뀐 파일 읽기 · 지시문 · 출력 읽기 · 자식 인자
import { describe, expect, it } from 'vitest';

import { 노트상한, 늘있는문서 } from '../apps/admin/src/projectNote/note.js';
import { 집은것인가 } from './authoring-rules.js';
import { 나눠돌리기, 노트자식인자 } from './authoring-note.js';
import {
  type 노트자료,
  PR경로상한,
  PR경로인자,
  PR경로풀기,
  PR주소풀기,
  노트일인가,
  노트지시문,
  사건글,
  출력읽기,
} from './authoring-note-prompt.js';

const 자료: 노트자료 = {
  project: { id: 3, name: '데모마켓', btsProject: 'DM' },
  services: [{ prefix: 'MKT', name: '웹', kind: 'WEB' }],
  current: null,
  events: [
    { id: 11, kind: 'PR_MERGED', payload: { issueKey: 'DM-1', prNumber: 7, prUrl: 'https://github.com/o/r/pull/7', prTitle: '쿠폰 적용' }, createdAt: '2026-10-31T00:00:00Z' },
    { id: 12, kind: 'DEPLOY', payload: {}, createdAt: '2026-10-31T00:01:00Z' },
  ],
};

describe('노트 일 가르기', () => {
  it('note 칸이 있으면 종류가 NOTE 든 RERUN 이든 노트 일이다', () => {
    expect(노트일인가({ note: 자료 })).toBe(true);
  });

  it('note 칸이 없거나 모양이 틀리면 노트 일이 아니다', () => {
    expect(노트일인가({})).toBe(false);
    expect(노트일인가({ note: null })).toBe(false);
    expect(노트일인가({ note: {} })).toBe(false);
  });

  it('serviceId 가 null 이고 note 칸이 실린 집기 응답도 집은 것으로 받는다', () => {
    expect(집은것인가(200, { id: 5, kind: 'NOTE', serviceId: null, note: 자료 })).toBe(true);
  });
});

describe('PR 주소 풀기', () => {
  it('풀 리퀘스트 주소만 저장소와 번호로 푼다', () => {
    expect(PR주소풀기('https://github.com/o/r/pull/7')).toEqual({ 저장소: 'o/r', 번호: 7 });
    expect(PR주소풀기('https://github.com/o/r.js/pull/12/')).toEqual({ 저장소: 'o/r.js', 번호: 12 });
  });

  it('다른 호스트 · 이슈 주소 · 글이 아닌 값은 null 이다', () => {
    expect(PR주소풀기('https://evil.example/o/r/pull/7')).toBeNull();
    expect(PR주소풀기('https://github.com/o/r/issues/7')).toBeNull();
    expect(PR주소풀기('https://github.com/o/r/pull/7/files')).toBeNull();
    expect(PR주소풀기('--json')).toBeNull();
    expect(PR주소풀기(undefined)).toBeNull();
  });

  it('gh 인자는 주소를 그대로 한 칸에 담는다', () => {
    expect(PR경로인자('https://github.com/o/r/pull/7')).toEqual(['pr', 'view', 'https://github.com/o/r/pull/7', '--json', 'files']);
  });
});

describe('바뀐 파일 경로 읽기', () => {
  it('gh 가 낸 files 에서 path 만 뽑는다', () => {
    expect(PR경로풀기(JSON.stringify({ files: [{ path: 'a.ts', additions: 1 }, { path: 'b/c.ts' }] }))).toEqual(['a.ts', 'b/c.ts']);
  });

  it(`${PR경로상한}개를 넘으면 자른다`, () => {
    const files = Array.from({ length: PR경로상한 + 20 }, (_, i) => ({ path: `f${i}.ts` }));
    expect(PR경로풀기(JSON.stringify({ files }))?.length).toBe(PR경로상한);
  });

  it('JSON 이 아니거나 files 가 없으면 null 이다', () => {
    expect(PR경로풀기('not json')).toBeNull();
    expect(PR경로풀기('{}')).toBeNull();
  });

  it('병합 사건에만 changedFiles 를 더하고 못 읽은 PR 은 null 로 둔다', () => {
    const 글 = JSON.parse(사건글(자료.events, new Map([[11, ['src/coupon.ts']]]))) as { id: number; changedFiles?: unknown }[];
    expect(글[0]?.changedFiles).toEqual(['src/coupon.ts']);
    expect('changedFiles' in (글[1] ?? {})).toBe(false);
    const 못읽음 = JSON.parse(사건글(자료.events, new Map())) as { changedFiles?: unknown }[];
    expect(못읽음[0]?.changedFiles).toBeNull();
  });
});

describe('지시문', () => {
  const 글 = 노트지시문(자료, '/work/note', true);

  it('상한 숫자와 늘 있는 다섯을 정본에서 끼운다', () => {
    expect(글).toContain(`${노트상한.본문}자`);
    expect(글).toContain(`${노트상한.문서}개`);
    expect(글).toContain(`최근 ${노트상한.최근줄}줄`);
    for (const 이름 of 늘있는문서) expect(글).toContain(이름);
  });

  it('핵심 규칙을 담는다', () => {
    expect(글).toContain('사람은 고치지 않는다');
    expect(글).toContain('기대값');
    expect(글).toContain('지난 기록 YYYY-MM');
    expect(글).toContain('가이드의 「배운 것」');
    expect(글).toContain('코드는 읽지 않는다');
    expect(글).toContain('바뀐 문서만');
    expect(글).toContain('코드 경로는 그 뒤에');
    expect(글).toContain('note-output.json');
  });

  it('처음 판이면 다섯을 다 쓰라 하고, 지금 노트가 있으면 안 닿은 문서는 빼라 한다', () => {
    expect(글).toContain('처음 판이다');
    const 있음 = 노트지시문({ ...자료, current: { version: 2, savedAt: '', docs: [] } }, '/w', false);
    expect(있음).not.toContain('처음 판이다');
    expect(있음).toContain('docs 에 넣지 않는다');
  });

  it('MCP 열쇠가 없으면 도구가 없다고 말한다', () => {
    expect(노트지시문(자료, '/w', false)).toContain('MCP 도구는 이번에 없다');
    expect(글).toContain('note_read');
  });
});

describe('출력 읽기', () => {
  it('docs 와 remove 를 읽는다', () => {
    const 몸 = 출력읽기(JSON.stringify({ docs: [{ name: '한눈에', summary: '요약', body: '본문' }], remove: ['쿠폰'] }));
    expect(몸).toEqual({ docs: [{ name: '한눈에', summary: '요약', body: '본문' }], remove: ['쿠폰'] });
  });

  it('remove 가 없으면 docs 만 낸다', () => {
    expect(출력읽기(JSON.stringify({ docs: [] }))).toEqual({ docs: [] });
  });

  it('JSON 이 아니거나 꼴이 틀리면 까닭을 낸다', () => {
    expect(출력읽기('abc')).toHaveProperty('까닭');
    expect(출력읽기('{}')).toHaveProperty('까닭');
    expect(출력읽기(JSON.stringify({ docs: [{ name: 'a' }] }))).toHaveProperty('까닭');
    expect(출력읽기(JSON.stringify({ docs: [], remove: [1] }))).toHaveProperty('까닭');
  });
});

describe('자식 인자', () => {
  const 모델 = { model: 'claude-opus-5-5', effort: 'high', fallback: null };

  it('도구는 파일 읽기 · 쓰기뿐이고 열쇠가 있을 때만 qa-hub MCP 를 연다', () => {
    const 없음 = 노트자식인자(모델, '/w/assets', '/w/tmp', undefined);
    expect(없음).toContain('Read,Write,Edit,Glob,Grep');
    expect(없음).not.toContain('--mcp-config');
    expect(없음.join(' ')).not.toContain('Bash');
    const 있음 = 노트자식인자(모델, '/w/assets', '/w/tmp', '/w/tmp/qa-hub-mcp.json');
    expect(있음).toEqual(expect.arrayContaining(['--strict-mcp-config', '--mcp-config', '/w/tmp/qa-hub-mcp.json', 'mcp__qa-hub']));
  });

  it('열쇠 값을 인자에 싣지 않는다', () => {
    expect(노트자식인자(모델, '/w/assets', '/w/tmp', '/w/tmp/qa-hub-mcp.json').join(' ')).not.toContain('mcj_');
  });
});

describe('PR 나눠 읽기', () => {
  const 기다림 = () => {
    let 풀기: () => void = () => undefined;
    const 약속 = new Promise<void>((r) => {
      풀기 = r;
    });
    return { 약속, 풀기 };
  };

  it('네 개씩 동시에 돌리고 다 돌면 참이다', async () => {
    let 도는 = 0;
    let 최대 = 0;
    const 한것: number[] = [];
    const 다 = await 나눠돌리기(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      async (n) => {
        도는 += 1;
        최대 = Math.max(최대, 도는);
        await new Promise((r) => setTimeout(r, 5));
        한것.push(n);
        도는 -= 1;
      },
      () => false,
    );
    expect(다).toBe(true);
    expect(최대).toBe(4);
    expect([...한것].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('하나 끝났을 때 멈추라 했으면 새 일을 안 잡고, 도는 일을 기다리지 않고 거짓이다', async () => {
    const 느린 = 기다림();
    const 잡은: number[] = [];
    let 멈춤 = false;
    const 결과 = await 나눠돌리기(
      [1, 2, 3, 4, 5, 6],
      async (n) => {
        잡은.push(n);
        if (n === 1) {
          멈춤 = true;
          return;
        }
        await 느린.약속;
      },
      () => 멈춤,
    );
    expect(결과).toBe(false);
    expect(잡은).toEqual([1, 2, 3, 4]);
    느린.풀기();
  });

  it('일이 없으면 곧바로 참이다', async () => {
    expect(await 나눠돌리기([], async () => undefined, () => true)).toBe(true);
  });
});
