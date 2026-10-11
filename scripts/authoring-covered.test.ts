// 기준 SHA 의 화면 ↔ 케이스 지도 검사 — 표 · 케이스 · 화면 파일에서 PRD 에 있는 화면과 바뀐 화면 케이스를 뽑고, 크롤 목록이 전부 덮음인지 본다 (도메인/작성 §3.6 「기획서에 없는 화면 — 두 번째 작성」 · 「바뀐 화면 — 닿는 케이스만 다시 본다」)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 기준화면지도, 다덮음사유, 모두덮음, 바뀐틀들, 바뀐화면줄, 화면지도준비, 화면케이스지도 } from './authoring-covered.js';

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
const 덮은틀들 = (x: ReturnType<typeof 입력>) => {
  const 지도 = 기준화면지도(x);
  return '까닭' in 지도 ? 지도 : 지도.덮은틀;
};

const 기본파일 = {
  'docs/cases/MKT.md': 표(['| 1 | 정상 | MKT-REQ-001 | MKT-FN-001 |', '| 2 | 정상 | MKT-REQ-002 | MKT-FN-002 |']),
  'tests/mkt/board.spec.ts': 케이스('MKT-FN-001', "import { BoardPage } from './pages/board.page.js';"),
  'tests/mkt/pages/board.page.ts': 화면('/board/1'),
  'tests/mkt/cart.spec.ts': 케이스('MKT-FN-002', "import { CartPage } from './pages/cart.page.js';"),
  'tests/mkt/pages/cart.page.ts': 화면('/cart'),
};

describe('기준화면지도 — 덮은틀', () => {
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

describe('기준화면지도 — 케이스 (PRD-F6-04)', () => {
  it('PRD 와 상관없이 폴더의 케이스마다 가져온 화면 파일과 pages 의 같은 틀을 싣는다 — 표가 없어도', () => {
    const 파일들 = {
      'tests/mkt/a.spec.ts': 케이스(
        'MKT-FN-001',
        "import { BoardPage } from './pages/board.page.js';",
        "import { Header } from './components/header.component.js';",
        "import { 로그인 } from './helpers/session.helper.js';",
      ),
      'tests/mkt/pages/board.page.ts': 화면('/board/7'),
      'tests/mkt/components/header.component.ts': 화면('/header'),
      'tests/mkt/helpers/session.helper.ts': 화면('/helper'),
      'tests/mkt/b.spec.ts': 케이스('MKT-UI-001'),
    };
    expect(기준화면지도(입력(가짜깃(파일들), []))).toEqual({
      케이스: [
        { tcId: 'MKT-FN-001', 파일: 'tests/mkt/a.spec.ts', 화면파일들: ['tests/mkt/pages/board.page.ts', 'tests/mkt/components/header.component.ts'], 틀들: ['/board/:n'] },
        { tcId: 'MKT-UI-001', 파일: 'tests/mkt/b.spec.ts', 화면파일들: [], 틀들: [] },
      ],
      덮은틀: [],
      건너뜀: [],
    });
  });

  it('PRD 번호를 안 덮는 케이스의 화면 파일은 못 읽어도 건너뜀에 싣고 간다 — 덮는 케이스 것만 까닭이다', () => {
    const 지도 = 기준화면지도(입력(가짜깃(기본파일, 'cart.page.ts'), ['MKT-REQ-001']));
    expect(지도).toEqual({
      케이스: [
        { tcId: 'MKT-FN-001', 파일: 'tests/mkt/board.spec.ts', 화면파일들: ['tests/mkt/pages/board.page.ts'], 틀들: ['/board/:n'] },
        { tcId: 'MKT-FN-002', 파일: 'tests/mkt/cart.spec.ts', 화면파일들: ['tests/mkt/pages/cart.page.ts'], 틀들: [] },
      ],
      덮은틀: ['/board/:n'],
      건너뜀: ['tests/mkt/pages/cart.page.ts'],
    });
    expect(기준화면지도(입력(가짜깃(기본파일, 'cart.page.ts'), ['MKT-REQ-002']))).toEqual({ 까닭: expect.stringContaining('망가짐') });
  });
});

describe('화면케이스지도', () => {
  it('같은 틀 → 그 화면을 쓰는 tcId(정렬). 틀이 없는 케이스는 안 싣는다', () => {
    expect(
      화면케이스지도([
        { tcId: 'MKT-FN-002', 파일: 'x', 화면파일들: [], 틀들: ['/board/:n', '/cart'] },
        { tcId: 'MKT-FN-001', 파일: 'y', 화면파일들: [], 틀들: ['/cart'] },
        { tcId: 'MKT-UI-001', 파일: 'z', 화면파일들: [], 틀들: [] },
      ]),
    ).toEqual({ '/board/:n': ['MKT-FN-002'], '/cart': ['MKT-FN-001', 'MKT-FN-002'] });
  });
});

describe('화면지도준비 — 자료 폴더 screen-cases.json · covered.json', () => {
  let 폴더 = '';
  afterEach(() => rmSync(폴더, { recursive: true, force: true }));
  const 읽기 = (이름: string): unknown => JSON.parse(readFileSync(join(폴더, 이름), 'utf8'));

  it('화면만이면 둘 다 쓴다 — 덮은 틀은 지금 판 번호를 덮는 케이스만, 화면 지도는 케이스 전부', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    expect(화면지도준비({ ...입력(가짜깃(기본파일), ['MKT-REQ-001']), 자료폴더: 폴더, 화면만: true })).toEqual({ 경고: null });
    expect(읽기('covered.json')).toEqual(['/board/:n']);
    expect(읽기('screen-cases.json')).toEqual({ '/board/:n': ['MKT-FN-001'], '/cart': ['MKT-FN-002'] });
  });

  it('대조는 화면 지도만 쓴다', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    expect(화면지도준비({ ...입력(가짜깃(기본파일), ['MKT-REQ-001']), 자료폴더: 폴더, 화면만: false })).toEqual({ 경고: null });
    expect(읽기('screen-cases.json')).toEqual({ '/board/:n': ['MKT-FN-001'], '/cart': ['MKT-FN-002'] });
    expect(() => 읽기('covered.json')).toThrow();
  });

  it('git 이 실패하면 화면만은 막힘 · 대조는 경고이고, 둘 다 앞 실행이 남긴 지도를 지운다', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    for (const [화면만, 답] of [[true, { 막힘: expect.stringContaining('망가짐') }], [false, { 경고: expect.stringContaining('망가짐') }]] as const) {
      writeFileSync(join(폴더, 'screen-cases.json'), '{"/old":["MKT-FN-009"]}');
      expect(화면지도준비({ ...입력(가짜깃(기본파일, 'ls-tree'), ['MKT-REQ-001']), 자료폴더: 폴더, 화면만 })).toEqual(답);
      expect(() => 읽기('screen-cases.json')).toThrow();
    }
  });

  it('PRD 번호를 안 덮는 케이스의 화면 파일을 못 읽으면 화면만도 막지 않고 경고만', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    expect(화면지도준비({ ...입력(가짜깃(기본파일, 'cart.page.ts'), ['MKT-REQ-001']), 자료폴더: 폴더, 화면만: true })).toEqual({
      경고: '화면 파일 1개를 못 읽어 그 화면은 지도에서 뺐다 — tests/mkt/pages/cart.page.ts',
    });
    expect(읽기('covered.json')).toEqual(['/board/:n']);
    expect(읽기('screen-cases.json')).toEqual({ '/board/:n': ['MKT-FN-001'] });
  });

  it('자료 폴더에 못 쓰면 — covered.json 은 화면만 막힘, 지도만 못 쓰면 경고', () => {
    폴더 = mkdtempSync(join(tmpdir(), 'covered-'));
    const 없는곳 = join(폴더, '없는', '폴더');
    expect(화면지도준비({ ...입력(가짜깃(기본파일), ['MKT-REQ-001']), 자료폴더: 없는곳, 화면만: true })).toEqual({ 막힘: expect.stringContaining('covered.json') });
    expect(화면지도준비({ ...입력(가짜깃(기본파일), ['MKT-REQ-001']), 자료폴더: 없는곳, 화면만: false })).toEqual({ 경고: expect.stringContaining('screen-cases.json') });
  });
});

describe('바뀐화면줄 — PR 머리 (PRD-F6-04)', () => {
  const 케이스들 = [
    { tcId: 'MKT-FN-001', 파일: 'tests/mkt/a.spec.ts', 화면파일들: ['tests/mkt/pages/cart.page.ts'], 틀들: ['/cart'] },
    { tcId: 'MKT-FN-002', 파일: 'tests/mkt/b.spec.ts', 화면파일들: ['tests/mkt/pages/cart.page.ts', 'tests/mkt/components/nav.component.ts'], 틀들: ['/cart'] },
    { tcId: 'MKT-FN-003', 파일: 'tests/mkt/c.spec.ts', 화면파일들: ['tests/mkt/pages/board.page.ts'], 틀들: ['/board/:n'] },
    { tcId: 'MKT-FN-004', 파일: 'tests/mkt/d.spec.ts', 화면파일들: ['tests/mkt/pages/home.page.ts'], 틀들: ['/'] },
  ];
  const 목록 = JSON.stringify([
    { 상태: '로그인', 틀: '/cart', 저장본: '바뀜' },
    { 상태: '로그아웃', 틀: '/cart', 저장본: '바뀜' },
    { 상태: '로그인', 틀: '/board/:n', 저장본: '바뀜' },
    { 상태: '로그인', 틀: '/', 저장본: '같음' },
    { 상태: '로그인', 틀: '/new', 저장본: '새 화면' },
  ]);

  it('바뀐틀들 — 저장본이 바뀐 줄의 틀(상태는 안 가른다). 못 읽으면 null', () => {
    expect(바뀐틀들(목록)).toEqual(new Set(['/cart', '/board/:n']));
    expect(바뀐틀들('[]')).toEqual(new Set());
    expect(바뀐틀들('깨짐')).toBeNull();
    expect(바뀐틀들('{}')).toBeNull();
  });

  it('바뀐 화면을 쓰는 케이스와, 그 케이스 · 화면 파일 가운데 이번에 고친 파일 — 같이 쓰는 화면 파일은 한 번만 센다', () => {
    const 바뀐 = new Set(['tests/mkt/pages/cart.page.ts', 'tests/mkt/c.spec.ts', 'tests/mkt/pages/home.page.ts']);
    expect(바뀐화면줄(바뀐틀들(목록)!, 케이스들, 바뀐)).toBe(
      '바뀐 화면: 2장 · 그 화면을 쓰는 케이스 3건 · 그 케이스 · 화면 파일 가운데 이번에 고친 파일 2개 — tests/mkt/c.spec.ts · tests/mkt/pages/cart.page.ts',
    );
  });

  it('하나도 안 고쳤으면 파일 없이', () => {
    expect(바뀐화면줄(바뀐틀들(목록)!, 케이스들, new Set())).toBe('바뀐 화면: 2장 · 그 화면을 쓰는 케이스 3건 · 그 케이스 · 화면 파일 가운데 이번에 고친 파일 0개');
  });

  it('닿는 케이스가 없으면 null', () => {
    expect(바뀐화면줄(new Set(['/x']), 케이스들, new Set())).toBeNull();
    expect(바뀐화면줄(new Set(), 케이스들, new Set())).toBeNull();
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
