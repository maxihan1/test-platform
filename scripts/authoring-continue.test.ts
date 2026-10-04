// 남은 요구로 이어 작성 — 에이전트의 남은 번호 · 막힘 사유 (도메인/작성 §3.6 「★ 원장」 「남은 요구로 이어 작성」)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 남은번호, 이어작성막힘 } from './authoring-continue.js';
import { 기준결정만들기, 기준읽기, 원장과남은번호, 원장준비 } from './authoring-ledger-io.js';
import { 칸번호 } from './authoring-slots.js';

const 표 = (요구줄: string[], 제외줄: string[]) =>
  [
    '## 요구사항',
    '',
    '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |',
    '|---|---|---|---|---|---|---|---|',
    ...요구줄,
    '',
    '## 제외',
    '',
    '| 요구 | 종류 | 사유 |',
    '|---|---|---|',
    ...제외줄,
    '',
  ].join('\n');
const 줄 = (출처: string, tcId: string) => `| 1 | 정상 | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-09-30 |`;
const 원장 = {
  항목: ['REQ-A-1', 'REQ-A-2', 'REQ-A-3', 'REQ-A-4', 'REQ-A-5', 'REQ-A-6'].map((번호) => ({ 번호, 자료: 'a', 지문: '0000000000000000' })),
  가족: { 'REQ-A': 6 },
  모드: { a: '번호' as const },
  경고: [],
  빠진자료: [],
  꼴: { a: '.md/그대로' },
};

describe('남은번호', () => {
  const main표 = 표(
    [줄('REQ-A-1', 'X-001'), 줄('REQ-A-6', 'X-009')],
    ['| REQ-A-2 | 다음 요청 | 시간 |', '| REQ-A-3 | 요구 아님 | 머리말 |', '| REQ-A-4 | 사람이 뺌 | 사람이 판정 |'],
  );

  it('닫힌 제외(되돌릴 수 없음 · 자료 없음)는 남은 것이 아니다', () => {
    const 표글 = 표([], ['| REQ-A-1 | 되돌릴 수 없음 | 결제 |', '| REQ-A-2 | 자료 없음 | 화면 없음 |', '| REQ-A-3 | 다음 요청 | 시간 |']);
    expect(남은번호(원장, 표글, new Set(), { 사람이뺌: new Set(), 다음요청: new Set(['REQ-A-3']) })).toEqual(['REQ-A-3', 'REQ-A-4', 'REQ-A-5', 'REQ-A-6']);
  });

  it('다음 요청 제외와 빠짐만 원장 순서로 — 케이스 · 닫힌 제외 · 기준 표의 사람이 뺌은 뺀다', () => {
    expect(남은번호(원장, main표, new Set(['X-001']), { 사람이뺌: new Set(['REQ-A-4']), 다음요청: new Set(['REQ-A-2']) })).toEqual(['REQ-A-2', 'REQ-A-5', 'REQ-A-6']);
  });

  it('기준 표에 없던 사람이 뺌은 형식 오류라 빠짐으로 든다', () => {
    expect(남은번호(원장, main표, new Set(['X-001']), { 사람이뺌: new Set(), 다음요청: new Set(['REQ-A-2']) })).toEqual(['REQ-A-2', 'REQ-A-4', 'REQ-A-5', 'REQ-A-6']);
  });

  it('기준 표의 「다음 요청」을 안 넘겨도 형식 오류 → 빠짐이라 남은 번호는 같다', () => {
    expect(남은번호(원장, main표, new Set(['X-001']), { 사람이뺌: new Set(['REQ-A-4']), 다음요청: new Set() })).toEqual(['REQ-A-2', 'REQ-A-5', 'REQ-A-6']);
  });

  it('표가 없으면 원장 전부다', () => {
    expect(남은번호(원장, '', new Set(), { 사람이뺌: new Set(), 다음요청: new Set() })).toEqual(원장.항목.map((h) => h.번호));
  });
});

describe('이어작성막힘', () => {
  it('원장이 없으면 까닭과 폐기 안내', () => {
    expect(이어작성막힘({ 없음: '글자본이 있는 자료가 없다' }, [])).toBe(
      '원장이 없어 남은 요구를 모른다 — 글자본이 있는 자료가 없다. 이 요청은 폐기해도 된다',
    );
  });

  it('남은 것이 없으면 끝났다는 뜻으로', () => {
    expect(이어작성막힘(원장, [])).toBe(
      '남은 요구가 없다 — 앞 요청들이 기획서 요구를 모두 케이스로 만들었거나 제외했다. 이 요청은 폐기해도 된다',
    );
  });

  it('남은 것이 있으면 막지 않는다', () => {
    expect(이어작성막힘(원장, ['REQ-A-2'])).toBe(null);
  });
});

describe('기준읽기 — 기준 SHA 의 표 · 케이스를 git 에서 (이어받은 트리는 앞 실행이 바꿨을 수 있다)', () => {
  const 케이스 = (tc: string) => `export const spec = defineCase({ tcId: '${tc}', name: 'n' });`;
  const 가짜깃 = (파일들: Record<string, string>, 실패?: string) => {
    const 부른것: string[][] = [];
    const 깃 = (인자: string[]) => {
      부른것.push(인자);
      const 막힌다 = 실패 === 'ls-tree' ? 인자[0] === 'ls-tree' : 인자[0] === 'show' && 인자.join(' ').includes(실패 ?? '\0');
      if (막힌다) return { ok: false, 낸것: '', 까닭: '망가짐' };
      if (인자[0] === 'ls-tree') return { ok: true, 낸것: Object.keys(파일들).map((f) => `${f}\0`).join('') };
      const 경로 = (인자[1] ?? '').split(':')[1] ?? '';
      return 경로 in 파일들 ? { ok: true, 낸것: 파일들[경로] ?? '' } : { ok: false, 낸것: '', 까닭: '없음' };
    };
    return { 깃, 부른것 };
  };

  it('표와 그 서비스 폴더의 케이스 글을 기준 SHA 로 읽는다', () => {
    const { 깃, 부른것 } = 가짜깃({
      'docs/cases/MKT.md': '표',
      'tests/mkt/a.spec.ts': 케이스('MKT-001'),
      'tests/mkt/sub/b.spec.ts': 케이스('MKT-002'),
      'tests/mkt/helper.ts': 'x',
    });
    expect(기준읽기(깃, 'abc123', 'MKT', 'mkt')).toEqual({ 표글: '표', 있는케이스: new Set(['MKT-001', 'MKT-002']) });
    expect(부른것[0]).toEqual(['ls-tree', '-r', '-z', '--name-only', 'abc123', '--', 'docs/cases/MKT.md', 'tests/mkt']);
    expect(부른것.slice(1).every((a) => a[0] === 'show' && a[1]?.startsWith('abc123:'))).toBe(true);
  });

  it('표가 없으면 빈 글이다 — 처음 작성하는 서비스', () => {
    const { 깃 } = 가짜깃({});
    expect(기준읽기(깃, 'abc123', 'MKT', 'mkt')).toEqual({ 표글: '', 있는케이스: new Set() });
  });

  it.each(['ls-tree', 'docs/cases/MKT.md', 'a.spec.ts'])('그 밖의 git 실패(%s)는 까닭이다 — 빈 표로 뭉개면 덮은 번호까지 다시 맡긴다', (자리) => {
    const { 깃 } = 가짜깃({ 'docs/cases/MKT.md': '표', 'tests/mkt/a.spec.ts': 케이스('MKT-001') }, 자리);
    expect(기준읽기(깃, 'abc123', 'MKT', 'mkt')).toEqual({ 까닭: expect.stringContaining('망가짐') });
  });
});

describe('원장준비 — 사본에 기준 표의 사람이 뺌 · 다음 요청 · 칸 재료를 싣는다', () => {
  const 기준표 = 표([줄('REQ-A-1', 'X-FN-001')], ['| REQ-A-2 | 사람이 뺌 | 판정 |', '| REQ-A-3 | 다음 요청 | 시간 |']);
  it('자식의 관문 0 이 에이전트와 같은 목록 · 재료를 쓴다', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'ledger-io-'));
    try {
      const 글 = join(폴더, 'a.txt');
      writeFileSync(글, 'REQ-A-1 REQ-A-2 REQ-A-3');
      const 계획 = [{ kind: 'FILE' as const, id: 1, name: 'a.txt', 받을자리: 글, 변환: null, 읽을자리: 글 }];
      const r = 원장준비(계획, 폴더, { 표글: 기준표, 있는케이스: new Set(['X-FN-001', 'X-FN-007']), 접두사: 'X' });
      expect('사본' in r.입력).toBe(true);
      const 사본 = JSON.parse(readFileSync(join(폴더, 'ledger.json'), 'utf8')) as { 사람이뺌?: string[]; 다음요청?: string[]; 칸재료?: { 접두사: string; 쓰인: string[] } | null };
      expect(사본.사람이뺌).toEqual(['REQ-A-2']);
      expect(사본.다음요청).toEqual(['REQ-A-3']);
      expect(사본.칸재료?.접두사).toBe('X');
      expect(사본.칸재료?.쓰인).toEqual(['X-FN-001', 'X-FN-007']);
      expect([...r.기준.다음요청]).toEqual(['REQ-A-3']);
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('기준 표를 못 읽었으면(null) 칸 재료가 null 이다 — 쓰인 번호를 모르고 매기지 않게', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'ledger-io-'));
    try {
      const 글 = join(폴더, 'a.txt');
      writeFileSync(글, 'REQ-A-1 REQ-A-2 REQ-A-3');
      const r = 원장준비([{ kind: 'FILE', id: 1, name: 'a.txt', 받을자리: 글, 변환: null, 읽을자리: 글 }], 폴더, null);
      const 사본 = JSON.parse(readFileSync(join(폴더, 'ledger.json'), 'utf8')) as { 칸재료?: unknown; 다음요청?: string[] };
      expect(사본.칸재료).toBe(null);
      expect(사본.다음요청).toEqual([]);
      expect(r.기준.칸재료).toBe(null);
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});

describe('기준결정만들기 — 기준 표의 「제거함」 번호는 쓰인 번호다', () => {
  it('지운 번호를 고정 번호로 다시 주지 않는다 — 옛 실행 이력이 새 케이스에 붙는다', () => {
    const 기준표 = 표([줄('REQ-A-2', '제거함(X-FN-004)')], []);
    const 기준 = 기준결정만들기({ 표글: 기준표, 있는케이스: new Set(), 접두사: 'X' }, ['REQ-A-1', 'REQ-A-2', 'REQ-A-3']);
    expect(기준.칸재료?.쓰인).toEqual(['X-FN-004']);
    if (기준.칸재료 === null) return;
    const r = 칸번호(['REQ-A-1', 'REQ-A-2', 'REQ-A-3'], [{ 차례: 0, 출처: 'a REQ-A-2', 축: '정상', tcId: '' }], 기준.칸재료);
    expect(r.기대.get(0)).toBe('X-FN-010');
  });
});

describe('원장과남은번호 — 자식 전 원장 준비 전부', () => {
  const 표글 = 표([줄('REQ-A-1', 'X-001')], ['| REQ-A-2 | 다음 요청 | 시간 |', '| REQ-A-3 | 사람이 뺌 | 판정 |']);
  const 케이스글 = "export const spec = defineCase({ tcId: 'X-001', name: 'n' });";
  const 깃 = (망가짐 = false, 기준표 = 표글) => (인자: string[]) => {
    if (망가짐) return { ok: false, 낸것: '', 까닭: '망가짐' };
    if (인자[0] === 'ls-tree') return { ok: true, 낸것: 'docs/cases/X.md\0tests/x/a.spec.ts\0' };
    return { ok: true, 낸것: 인자[1]?.endsWith('.md') === true ? 기준표 : 케이스글 };
  };
  const 차리기 = (본문: string) => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'continue-io-'));
    const 글 = join(폴더, 'a.txt');
    writeFileSync(글, 본문);
    return { 폴더, 계획: [{ kind: 'FILE' as const, id: 1, name: 'a.txt', 받을자리: 글, 변환: null, 읽을자리: 글 }] };
  };
  const 부르기 = (폴더: string, 계획: ReturnType<typeof 차리기>['계획'], 망가짐: boolean, 이어작성원본: number | null, 기준표?: string) =>
    원장과남은번호({ 계획, 자료폴더: 폴더, 깃: 깃(망가짐, 기준표), 기준: 'abc', 서비스: 'X', 폴더: 'x', 이어작성원본 });

  it('이어 작성이면 남은 번호를 사본에 쓰고 절 재료를 준다 — 기준 표의 사람이 뺌은 빠진다', () => {
    const { 폴더, 계획 } = 차리기('REQ-A-1 REQ-A-2 REQ-A-3 REQ-A-4');
    try {
      const r = 부르기(폴더, 계획, false, 5873);
      expect('막힘' in r).toBe(false);
      if ('막힘' in r) return;
      expect([...r.기준.사람이뺌]).toEqual(['REQ-A-3']);
      expect([...r.기준.다음요청]).toEqual(['REQ-A-2']);
      expect(r.기준.칸재료?.쓰인).toEqual(['X-001']);
      expect(r.이어작성).toEqual({ 원본: 5873, 남은: ['REQ-A-2', 'REQ-A-4'], 사본: join(폴더, 'continue.json') });
      expect(JSON.parse(readFileSync(join(폴더, 'continue.json'), 'utf8'))).toEqual({ 원본: 5873, 남은: ['REQ-A-2', 'REQ-A-4'] });
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('이어 작성인데 남은 것이 없으면 막는다', () => {
    const { 폴더, 계획 } = 차리기('REQ-A-1 REQ-A-2 REQ-A-3');
    const 다덮은표 = 표([줄('REQ-A-1', 'X-001')], ['| REQ-A-2 | 요구 아님 | 머리말 |', '| REQ-A-3 | 사람이 뺌 | 판정 |']);
    try {
      const r = 부르기(폴더, 계획, false, 5873, 다덮은표);
      expect(r).toEqual({ 막힘: expect.stringContaining('남은 요구가 없다') });
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('기준 표를 못 읽으면 이어 작성은 막고 보통 작성은 사람이 뺌 없이 돈다', () => {
    const { 폴더, 계획 } = 차리기('REQ-A-1 REQ-A-2 REQ-A-3');
    try {
      expect(부르기(폴더, 계획, true, 5873)).toEqual({ 막힘: expect.stringContaining('망가짐') });
      const 보통 = 부르기(폴더, 계획, true, null);
      expect('막힘' in 보통 ? null : [...보통.기준.사람이뺌]).toEqual([]);
      expect('막힘' in 보통 ? undefined : 보통.기준.칸재료).toBe(null);
      expect('막힘' in 보통 ? undefined : 보통.이어작성).toBe(undefined);
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});
