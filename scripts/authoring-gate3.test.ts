// 돌려 본 결과 기록 판정 검사 — Playwright json 리포터 모양(최상위 suites[].file · specs[].tests[].projectName)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type 돌린기록, 기록남기며비우기, 끝돌려보기경고, 남은임시도우미, 살필케이스, 파일상태보기, 판들읽기 } from './authoring-gate3.js';

describe('남은 임시 도우미 (작성 §3.6 팬아웃 · 2026-10-04)', () => {
  it('공용으로 옮기지 않은 draft 파일이 남으면 경고한다', () => {
    expect(남은임시도우미(['mkt/components/header.component.ts', 'mkt/components/draft-cart.component.ts', 'mkt/MKT-FN-001.spec.ts'])).toBe(
      '⚠️ 공용으로 옮기지 않은 임시 도우미 1개 — mkt/components/draft-cart.component.ts',
    );
  });

  it('helpers 아래 draft 파일도 잡는다 — 옛 components 자리와 둘 다', () => {
    expect(남은임시도우미(['mkt/helpers/login.helper.ts', 'mkt/helpers/draft-cart.helper.ts', 'mkt/components/draft-pay.component.ts'])).toBe(
      '⚠️ 공용으로 옮기지 않은 임시 도우미 2개 — mkt/helpers/draft-cart.helper.ts · mkt/components/draft-pay.component.ts',
    );
  });

  it('없으면 null', () => {
    expect(남은임시도우미(['mkt/components/header.component.ts', 'mkt/helpers/login.helper.ts', 'mkt/pages/draft-list.page.ts'])).toBeNull();
  });
});

const 시작 = '2026-10-03T10:00:00.000Z';
const 뒤 = '2026-10-03T10:30:00.000Z';
const 앞수정 = Date.parse(시작) - 60_000;

/** 파일마다 데스크톱 결과를 상태 수만큼 담은 결과 글 하나 */
const 결과 = (파일들: Record<string, string[]>, 덧: { workers?: number; startTime?: string; slowApi?: boolean } = {}) =>
  JSON.stringify({
    config: { workers: 덧.workers ?? 1, metadata: { slowApi: 덧.slowApi ?? true } },
    stats: { startTime: 덧.startTime ?? 시작 },
    suites: Object.entries(파일들).map(([file, 상태들]) => ({
      file,
      specs: 상태들.map((status) => ({ file: '../packages/kit/src/runtime/test.ts', tests: [{ projectName: 'desktop', status }] })),
    })),
  });

let 번호 = 0;
const 끝 = (글: string): 돌린기록 => ({ 이름: `gate3-final-${++번호}.json`, 글 });
const 보조 = (글: string): 돌린기록 => ({ 이름: `gate3-part-shop-${++번호}.json`, 글 });

const 셋 = ['expected', 'expected', 'expected'];
const 하나 = ['expected'];
const 수정 = (...파일들: string[]) => Object.fromEntries(파일들.map((f) => [f, 앞수정]));

describe('마지막 전체 돌려 보기 경고 (작성 §3.6 · 2026-10-19 사용자 — 보조 AI 3번 + 마지막 1번)', () => {
  it('보조 AI 가 3번 다 초록이고 그 뒤 안 고친 파일은 마지막 1번이면 된다', () => {
    expect(
      끝돌려보기경고([보조(결과({ 'mkt/A.spec.ts': 셋 }, { workers: 2 })), 끝(결과({ 'mkt/A.spec.ts': 하나 }, { startTime: 뒤 }))], 수정('mkt/A.spec.ts')),
    ).toBeNull();
  });

  it('마지막 기록이 3번 다 초록이면 그것 하나로 된다 — 합친 뒤 고친 케이스', () => {
    expect(끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': 셋, 'mkt/B.spec.ts': 셋 }))], 수정('mkt/A.spec.ts', 'mkt/B.spec.ts'))).toBeNull();
  });

  it('보조 AI 3번만 있고 마지막 전체 돌려 보기에 없으면 경고', () => {
    expect(끝돌려보기경고([보조(결과({ 'mkt/A.spec.ts': 셋 }))], 수정('mkt/A.spec.ts'))).toMatch(/마지막 전체 돌려 보기에서 빠진 파일 1개/);
  });

  it('마지막 1번만 있고 3번 다 초록인 기록이 없으면 경고', () => {
    expect(끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': 하나 }))], 수정('mkt/A.spec.ts'))).toMatch(/3번 다 초록인 기록이 없는 파일 1개/);
  });

  it('보조 AI 가 돌린 뒤 고쳤으면 그 3번은 못 쓴다 — 마지막 1번이면 경고, 마지막 3번이면 된다', () => {
    const 사이 = Date.parse(시작) + 60_000;
    const 앞3번 = 보조(결과({ 'mkt/A.spec.ts': 셋 }));
    expect(끝돌려보기경고([앞3번, 끝(결과({ 'mkt/A.spec.ts': 하나 }, { startTime: 뒤 }))], { 'mkt/A.spec.ts': 사이 })).toMatch(/3번 다 초록인 기록이 없는/);
    expect(끝돌려보기경고([앞3번, 끝(결과({ 'mkt/A.spec.ts': 셋 }, { startTime: 뒤 }))], { 'mkt/A.spec.ts': 사이 })).toBeNull();
  });

  it('보조 AI 의 3번에 빨강이 섞였으면 3번 근거가 아니다', () => {
    expect(
      끝돌려보기경고(
        [보조(결과({ 'mkt/A.spec.ts': ['expected', 'unexpected', 'expected'] })), 끝(결과({ 'mkt/A.spec.ts': 하나 }, { startTime: 뒤 }))],
        수정('mkt/A.spec.ts'),
      ),
    ).toMatch(/3번 다 초록인 기록이 없는 파일 1개/);
  });

  it('차례로 나눠 돈 덩어리 여럿을 합쳐 본다', () => {
    expect(
      끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': 셋 })), 끝(결과({ 'mkt/B.spec.ts': 셋 }))], 수정('mkt/A.spec.ts', 'mkt/B.spec.ts')),
    ).toBeNull();
  });

  it('실패는 마지막 기록 가운데 가장 늦은 것으로 센다 — 고친 파일만 뒤에 다시 돌렸으면 경고가 없다', () => {
    const 고친때 = Date.parse(시작) + 60_000;
    expect(
      끝돌려보기경고(
        [끝(결과({ 'mkt/A.spec.ts': 셋, 'mkt/B.spec.ts': ['expected', 'unexpected', 'expected'] })), 끝(결과({ 'mkt/B.spec.ts': 셋 }, { startTime: 뒤 }))],
        { 'mkt/A.spec.ts': 앞수정, 'mkt/B.spec.ts': 고친때 },
      ),
    ).toBeNull();
    expect(끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': ['unexpected', 'unexpected', 'unexpected'] }))], 수정('mkt/A.spec.ts'))).toMatch(/실패 3회/);
  });

  it('보류 케이스의 skipped 3회도 3번으로 센다', () => {
    expect(끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': ['skipped', 'skipped', 'skipped'] }))], 수정('mkt/A.spec.ts'))).toBeNull();
  });

  it('기록이 없거나 깨졌으면 경고', () => {
    expect(끝돌려보기경고([], 수정('mkt/A.spec.ts'))).toMatch(/^⚠️ 마지막 전체 돌려 보기가 규칙대로 돌지 않았다 — 돌려 본 기록이 없다/);
    expect(끝돌려보기경고([끝('{깨짐')], 수정('mkt/A.spec.ts'))).toMatch(/기록을 못 읽었다/);
  });

  it('마지막 기록을 동시에 돌렸으면 경고 — 보조 AI 기록은 PC · 휴대폰을 한 번에 돌려 동시 둘이어도 된다', () => {
    expect(끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': 셋 }, { workers: 3 }))], 수정('mkt/A.spec.ts'))).toMatch(/동시 3개/);
    expect(
      끝돌려보기경고([보조(결과({ 'mkt/A.spec.ts': 셋 }, { workers: 2 })), 끝(결과({ 'mkt/A.spec.ts': 하나 }, { startTime: 뒤 }))], 수정('mkt/A.spec.ts')),
    ).toBeNull();
  });

  it('응답을 늦추지 않고 돈 기록은 3번 근거가 아니고, 마지막 기록이 그러면 따로 센다 (PRD-F9-35)', () => {
    expect(
      끝돌려보기경고([보조(결과({ 'mkt/A.spec.ts': 셋 }, { slowApi: false })), 끝(결과({ 'mkt/A.spec.ts': 하나 }, { startTime: 뒤 }))], 수정('mkt/A.spec.ts')),
    ).toMatch(/3번 다 초록인 기록이 없는 파일 1개/);
    expect(
      끝돌려보기경고([보조(결과({ 'mkt/A.spec.ts': 셋 })), 끝(결과({ 'mkt/A.spec.ts': 하나 }, { startTime: 뒤, slowApi: false }))], 수정('mkt/A.spec.ts')),
    ).toMatch(/서버 응답을 늦추지 않고 돈 파일 1개/);
  });

  it('돌려 보지 않은 파일을 센다 · 휴대폰 결과는 세지 않는다 — PC 만', () => {
    const 휴대폰만 = JSON.stringify({
      config: { workers: 1 },
      stats: { startTime: 시작 },
      suites: [{ file: 'mkt/A.spec.ts', specs: [0, 1, 2].map(() => ({ tests: [{ projectName: 'mobile', status: 'expected' }] })) }],
    });
    expect(끝돌려보기경고([끝(휴대폰만)], 수정('mkt/A.spec.ts', 'mkt/B.spec.ts'))).toMatch(/돌려 보지 않은 파일 2개/);
  });

  it('하위 묶음(describe) 안의 결과도 위 파일 이름으로 센다', () => {
    const 글 = JSON.stringify({
      config: { workers: 1, metadata: { slowApi: true } },
      stats: { startTime: 시작 },
      suites: [{ file: 'mkt/A.spec.ts', suites: [{ specs: [0, 1, 2].map(() => ({ tests: [{ projectName: 'desktop', status: 'expected' }] })) }] }],
    });
    expect(끝돌려보기경고([끝(글)], 수정('mkt/A.spec.ts'))).toBeNull();
  });

  it('그 파일이나 그것이 쓰는 Page Object 를 모든 기록 뒤에 고쳤으면 경고', () => {
    expect(끝돌려보기경고([끝(결과({ 'mkt/A.spec.ts': 셋 }))], { 'mkt/A.spec.ts': Date.parse(시작) + 60_000 })).toMatch(
      /마지막으로 돌린 뒤에 고친 파일 1개/,
    );
  });

  it('볼 케이스가 없으면(표만 고친 작성) 기록이 없어도 경고하지 않는다', () => {
    expect(끝돌려보기경고([], {})).toBeNull();
  });
});

describe('기록남기며비우기 — 끊긴 자리부터 다시 시작할 때 (§7 「이어하기」 · 2026-10-19)', () => {
  it('돌려 본 기록 · 서브에이전트 보고 · 용어 조각만 남기고 나머지는 지운다 — 링크는 따라가지 않는다', () => {
    const 바깥 = mkdtempSync(join(tmpdir(), 'gate3-바깥-'));
    const 임시 = mkdtempSync(join(tmpdir(), 'gate3-임시-'));
    writeFileSync(join(바깥, '남의것.json'), '{"비밀":1}');
    writeFileSync(join(임시, 'gate3-final-1.json'), '{"끝":1}');
    writeFileSync(join(임시, 'gate3-part-shop-2.json'), '{"보조":1}');
    writeFileSync(join(임시, 'summary-shop.md'), '보고');
    writeFileSync(join(임시, 'secret-scan.mjs'), '앞 자식 캐시');
    writeFileSync(join(임시, 'gate3-final-1.log'), '긴 로그');
    mkdirSync(join(임시, 'glossary'));
    writeFileSync(join(임시, 'glossary', 'shop.md'), '용어');
    symlinkSync(join(바깥, '남의것.json'), join(임시, 'gate3-final-9.json'));

    const 수 = 기록남기며비우기(임시, () => {
      rmSync(임시, { recursive: true, force: true });
      mkdirSync(임시);
    });

    expect(수).toBe(4);
    expect(readdirSync(임시).sort()).toEqual(['gate3-final-1.json', 'gate3-part-shop-2.json', 'glossary', 'summary-shop.md']);
    expect(readFileSync(join(임시, 'glossary', 'shop.md'), 'utf8')).toBe('용어');
    expect(readFileSync(join(임시, 'gate3-part-shop-2.json'), 'utf8')).toBe('{"보조":1}');
  });
});

describe('판들읽기 — 돌려 보기 명령이 다음 차례 길이와 빨간 까닭을 읽는다', () => {
  it('회차 시간과 빨간 회차의 첫 오류 줄(색 글자 뺌)을 담는다', () => {
    const 글 = JSON.stringify({
      config: { workers: 1, metadata: { slowApi: true } },
      stats: { startTime: 시작 },
      suites: [
        {
          file: 'mkt/A.spec.ts',
          specs: [
            { tests: [{ projectName: 'desktop', status: 'expected', results: [{ duration: 2000 }] }] },
            { tests: [{ projectName: 'desktop', status: 'unexpected', results: [{ duration: 4000, error: { message: '\u001b[31m\n기대: 15,000원\u001b[39m\n받음: 0원' } }] }] },
          ],
        },
      ],
    });
    const 판 = 판들읽기([끝(글)])?.판들.get('mkt/A.spec.ts\0desktop')?.[0];
    expect(판?.시간들).toEqual([2000, 4000]);
    expect(판?.오류).toBe('기대: 15,000원');
    expect(파일상태보기(판 === undefined ? [] : [판], 앞수정)).toMatchObject({ 있음: true, 새것: true, 셋: false });
  });
});

describe('살필케이스 — 이번 작성이 바꾼 케이스 · 부품에 닿는 케이스만 (PRD-F9-13)', () => {
  const 파일 = (경로: string, 때: number, ...가져옴: string[]) => ({ 경로, 때, 글: 가져옴.map((p) => `import { x } from '${p}';`).join('\n') });
  const 폴더 = [
    파일('mkt/MKT-FN-001.spec.ts', 1, './pages/signup.page.js'),
    파일('mkt/MKT-FN-002.spec.ts', 2, './pages/cart.page.js'),
    파일('mkt/MKT-UI-003.spec.ts', 3, './pages/home.page.js'),
    파일('mkt/pages/signup.page.ts', 10, '../components/header.component.js'),
    파일('mkt/pages/cart.page.ts', 4),
    파일('mkt/pages/home.page.ts', 5, '../components/header.component.js'),
    파일('mkt/components/header.component.ts', 6),
  ];

  it('바꾼 케이스 파일과 바꾼 Page Object 를 쓰는 케이스만 — 시각은 닿는 파일 가운데 가장 늦은 것', () => {
    expect(살필케이스(폴더, new Set(['mkt/MKT-FN-002.spec.ts', 'mkt/pages/signup.page.ts']))).toEqual({
      'mkt/MKT-FN-001.spec.ts': 10,
      'mkt/MKT-FN-002.spec.ts': 4,
    });
  });

  it('Page Object 를 거쳐 쓰는 Component 를 고쳤으면 그 Page Object 를 쓰는 케이스 전부', () => {
    expect(Object.keys(살필케이스(폴더, new Set(['mkt/components/header.component.ts'])))).toEqual(['mkt/MKT-FN-001.spec.ts', 'mkt/MKT-UI-003.spec.ts']);
  });

  it('Page Object 끼리 서로 가져다 써도(돌아도) 케이스마다 끝까지 따라간다 · 폴더 밖 바뀐 도우미도 잡는다', () => {
    const 돌기 = [
      파일('mkt/MKT-FN-001.spec.ts', 1, './pages/b.page.js'),
      파일('mkt/MKT-FN-002.spec.ts', 1, './pages/a.page.js'),
      파일('mkt/pages/a.page.ts', 1, './b.page.js'),
      파일('mkt/pages/b.page.ts', 1, './a.page.js', '../components/header.component.js'),
      파일('mkt/components/header.component.ts', 7),
      파일('mkt/MKT-FN-003.spec.ts', 1, '../shared/login.helper.js'),
    ];
    expect(살필케이스(돌기, new Set(['mkt/components/header.component.ts', 'shared/login.helper.ts']))).toEqual({
      'mkt/MKT-FN-001.spec.ts': 7,
      'mkt/MKT-FN-002.spec.ts': 7,
      'mkt/MKT-FN-003.spec.ts': 1,
    });
  });

  it('첫 작성은 다 바뀐 것이라 폴더 전체 · 아무것도 안 바꿨으면 빈 목록', () => {
    expect(Object.keys(살필케이스(폴더, new Set(폴더.map((f) => f.경로))))).toHaveLength(3);
    expect(살필케이스(폴더, new Set(['MKT.md']))).toEqual({});
  });
});
