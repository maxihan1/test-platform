// PRD 에 이미 있는 화면 계산 검사 — 기준 SHA 의 표 · 케이스 · 화면 파일에서 같은 틀을 뽑고, 크롤 목록이 전부 덮음인지 본다 (도메인/작성 §3.6 「기획서에 없는 화면 — 두 번째 작성」)
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 덮은화면준비, 덮은틀들, 다덮음사유, 모두덮음 } from './authoring-covered.js';

const 표 = (줄들: string[]) =>
  ['# MKT', '', '## 요구사항', '', '| 요구 | 축 | 출처 | tcId |', '|---|---|---|---|', ...줄들].join('\n');
const 케이스 = (tc: string, ...가져옴: string[]) => `${가져옴.join('\n')}\nexport const spec = defineCase({ tcId: '${tc}', name: 'n' });`;
const 화면 = (주소: string) => `export class P {\n  static readonly 주소 = '${주소}';\n}`;

function 가짜깃(파일들: Record<string, string>, 실패?: string) {
  return (인자: string[]) => {
    const 막힌다 = 실패 === 'ls-tree' ? 인자[0] === 'ls-tree' : 인자[0] === 'show' && 인자.join(' ').includes(실패 ?? '\0');
    if (막힌다) return { ok: false, 낸것: '', 까닭: '망가짐' };
    if (인자[0] === 'ls-tree') return { ok: true, 낸것: Object.keys(파일들).map((f) => `${f}\0`).join('') };
    const 경로 = (인자[1] ?? '').split(':')[1] ?? '';
    return 경로 in 파일들 ? { ok: true, 낸것: 파일들[경로] ?? '' } : { ok: false, 낸것: '', 까닭: '없음' };
  };
}
const 입력 = (깃: ReturnType<typeof 가짜깃>, 번호들: string[]) => ({ 깃, 기준: 'abc123', 서비스: 'MKT', 폴더: 'mkt', 번호들 });

const 기본파일 = {
  'docs/cases/MKT.md': 표(['| 1 | 정상 | MKT-REQ-001 | MKT-FN-001 |', '| 2 | 정상 | MKT-REQ-002 | MKT-FN-002 |']),
  'tests/mkt/board.spec.ts': 케이스('MKT-FN-001', "import { BoardPage } from './pages/board.page.js';"),
  'tests/mkt/pages/board.page.ts': 화면('/board/1'),
  'tests/mkt/cart.spec.ts': 케이스('MKT-FN-002', "import { CartPage } from './pages/cart.page.js';"),
  'tests/mkt/pages/cart.page.ts': 화면('/cart'),
};

describe('덮은틀들', () => {
  it('지금 판 번호를 덮는 케이스의 pages 화면 주소를 크롤러 같은 틀로 — /board/1 → /board/:n', () => {
    expect(덮은틀들(입력(가짜깃(기본파일), ['MKT-REQ-001']))).toEqual(['/board/:n']);
    expect(덮은틀들(입력(가짜깃(기본파일), ['MKT-REQ-001', 'MKT-REQ-002']))).toEqual(['/board/:n', '/cart']);
  });

  it('기준 SHA 에서 읽는다 — 표와 서비스 폴더만 묻고 파일은 show 로 읽는다', () => {
    const 부른것: string[][] = [];
    const 깃 = 가짜깃(기본파일);
    덮은틀들(입력((인자) => (부른것.push(인자), 깃(인자)), ['MKT-REQ-001']));
    expect(부른것[0]).toEqual(['ls-tree', '-r', '-z', '--name-only', 'abc123', '--', 'docs/cases/MKT.md', 'tests/mkt']);
    expect(부른것.slice(1).every((a) => a[0] === 'show' && a[1]?.startsWith('abc123:'))).toBe(true);
  });

  it('표가 없으면 빈 목록이다 — 처음 작성하는 서비스', () => {
    expect(덮은틀들(입력(가짜깃({}), ['MKT-REQ-001']))).toEqual([]);
  });

  it('지금 판에 없는 번호만 덮는 케이스는 안 센다 — 옛 번호 · 지운 요구', () => {
    expect(덮은틀들(입력(가짜깃(기본파일), ['MKT-REQ-009']))).toEqual([]);
  });

  it('components · helpers · 타입만 가져온 화면 파일은 안 센다 — 화면 조각은 주소가 없다', () => {
    const 파일들 = {
      'docs/cases/MKT.md': 표(['| 1 | 정상 | MKT-REQ-001 | MKT-FN-001 |']),
      'tests/mkt/a.spec.ts': 케이스(
        'MKT-FN-001',
        "import { Header } from './components/header.component.js';",
        "import { 로그인 } from './helpers/session.helper.js';",
        "import type { BoardPage } from './pages/board.page.js';",
      ),
      'tests/mkt/components/header.component.ts': 화면('/header'),
      'tests/mkt/helpers/session.helper.ts': 화면('/helper'),
      'tests/mkt/pages/board.page.ts': 화면('/board/1'),
    };
    expect(덮은틀들(입력(가짜깃(파일들), ['MKT-REQ-001']))).toEqual([]);
  });

  it('화면 주소를 글자 그대로 못 읽는 화면 파일은 건너뛴다', () => {
    const 파일들 = { ...기본파일, 'tests/mkt/pages/board.page.ts': "const 뿌리 = '/x';\nexport class P {\n  static readonly 주소 = 뿌리 + '/a';\n}" };
    expect(덮은틀들(입력(가짜깃(파일들), ['MKT-REQ-001']))).toEqual([]);
  });

  it.each(['ls-tree', 'docs/cases/MKT.md', 'board.spec.ts', 'board.page.ts'])('git 실패(%s)는 까닭이다 — 모르고 돌면 기획서 화면을 또 쓴다', (자리) => {
    expect(덮은틀들(입력(가짜깃(기본파일, 자리), ['MKT-REQ-001']))).toEqual({ 까닭: expect.stringContaining('망가짐') });
  });
});

describe('덮은화면준비 — 자료 폴더 covered.json', () => {
  let 폴더 = '';
  afterEach(() => rmSync(폴더, { recursive: true, force: true }));

  it('같은 틀 목록을 쓰고 파일 자리를 돌려준다', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    const 답 = 덮은화면준비({ ...입력(가짜깃(기본파일), ['MKT-REQ-001']), 자료폴더: 폴더 });
    expect(답).toEqual({ 파일: join(폴더, 'covered.json') });
    expect(JSON.parse(readFileSync(join(폴더, 'covered.json'), 'utf8'))).toEqual(['/board/:n']);
  });

  it('git 이 실패하면 쓰지 않고 까닭을 돌려준다 · 자료 폴더에 못 쓰면 까닭이다', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    expect(덮은화면준비({ ...입력(가짜깃(기본파일, 'ls-tree'), ['MKT-REQ-001']), 자료폴더: 폴더 })).toEqual({ 까닭: expect.stringContaining('망가짐') });
    expect(덮은화면준비({ ...입력(가짜깃(기본파일), ['MKT-REQ-001']), 자료폴더: join(폴더, '없는', '폴더') })).toEqual({ 까닭: expect.stringContaining('covered.json') });
  });
});

describe('모두덮음', () => {
  it('줄이 하나 이상이고 전부 덮음: true 면 줄 수', () => {
    expect(모두덮음(JSON.stringify([{ 틀: '/', 덮음: true }, { 틀: '/a', 덮음: true }]))).toBe(2);
  });

  it('덮지 않은 줄이 하나라도 있거나 · 빈 목록이거나 · 못 읽으면 null', () => {
    expect(모두덮음(JSON.stringify([{ 틀: '/', 덮음: true }, { 틀: '/a' }]))).toBeNull();
    expect(모두덮음('[]')).toBeNull();
    expect(모두덮음('{"덮음":true}')).toBeNull();
    expect(모두덮음('깨짐')).toBeNull();
  });
});

describe('다덮음사유', () => {
  it('폐기해도 된다는 말과 장수를 싣는다', () => {
    expect(다덮음사유(3)).toBe('기획서에 없는 화면이 없다 — 크롤러가 찾은 화면 3장이 모두 PRD 에 있다. 이 요청은 폐기해도 된다');
  });
});
