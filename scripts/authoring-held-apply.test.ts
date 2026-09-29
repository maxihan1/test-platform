// 반영 때 보류 케이스에 값을 적고 held 를 빼는 순수 함수 — 결과가 K 규칙을 통과하고 값이 코드 그대로 읽히는지 본다
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { checkSource, checkSpec } from '../apps/admin/src/catalog/rules.js';
import {
  값적기,
  보류남음,
  보류있나,
  반영커밋인가,
  반영푸시인자,
  비밀칸들,
  새머리판정,
  실패문장들,
  실행입력,
  케이스tcId,
  표고치기,
} from './authoring-held-apply.js';

const 원문 = `import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'XHA-001',
  name: '쿠폰 두 장을 겹쳐 쓰면 최종 금액이 기준대로 나온다',
  platforms: ['desktop'],
  held: '판정 불가 — 쿠폰 중복 적용 시 최종 금액 기준이 기획서에 없다',
  unconfirmed: '화면 기준 — 작성 요청 7',
  precondition: ['쿠폰 두 장이 있다'],
  params: z.object({
    coupon: z.string().describe('쿠폰 코드'),
    count: z.number().describe('장 수').default(1),
    memo: z.string().describe('메모').optional(),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    total: z.number().describe('최종 금액'),
    shown: z.boolean().describe('보이나'),
    grade: z.enum(['A', 'B']).describe('등급'),
  }),
});

test(spec, async ({ params, expected }) => {
  await test.step('쿠폰을 적용한다', async () => {
    await verify('최종 금액이 기준과 같다', params.coupon.length, expected.total);
  });
});
`;

const 까다로운글 = `it's "따옴표"\n줄바꿈 \\ 역슬래시 \${주입}`;
const 입력 = {
  params: { coupon: 까다로운글, count: 3, memo: '메모값' },
  expected: { total: -1500.5, shown: false, grade: 'B' },
};

const 임시 = mkdtempSync(join(dirname(fileURLToPath(import.meta.url)), '.held-apply-'));
afterAll(() => rmSync(임시, { recursive: true, force: true }));

function 적음(글: string, 값 = 입력): string {
  const r = 값적기(글, 값);
  if ('사유' in r) throw new Error(r.사유);
  return r.글;
}

describe('값적기 — 채운 칸에 .default(리터럴) 을 적고 held 를 뺀다', () => {
  it('결과가 K 규칙(held 없음 기준)을 통과하고 스키마 기본값이 넣은 값 그대로다', async () => {
    const 글 = 적음(원문);
    expect(checkSource('XHA-001.spec.ts', 글).violations).toEqual([]);
    const 파일 = join(임시, 'XHA-001.spec.ts');
    writeFileSync(파일, 글);
    process.env.PLATFORM_SCAN = '1';
    const 모듈 = (await import(pathToFileURL(파일).href)) as { spec: Parameters<typeof checkSpec>[1] & { unconfirmed?: string } };
    expect(모듈.spec.held).toBeUndefined();
    expect(모듈.spec.unconfirmed).toBe('화면 기준 — 작성 요청 7');
    const { propLines } = checkSource('XHA-001.spec.ts', 글);
    expect(checkSpec('XHA-001.spec.ts', 모듈.spec, propLines, { noHeld: true })).toEqual([]);
    expect(모듈.spec.paramSchema).toMatchObject({
      properties: { coupon: { default: 까다로운글 }, count: { default: 3 }, memo: { default: '메모값' } },
    });
    expect(모듈.spec.expectedSchema).toMatchObject({
      properties: { total: { default: -1500.5 }, shown: { default: false }, grade: { default: 'B' } },
    });
  });

  it('이미 .default 가 있는 칸은 그 값을 바꾼다 — 두 번 적지 않는다', () => {
    const 글 = 적음(원문);
    expect(글).toContain("describe('장 수').default(3)");
    expect(글).not.toContain('.default(1)');
  });

  it('optional 칸에도 적는다', () => {
    expect(적음(원문)).toContain(".describe('메모').optional().default('메모값')");
  });

  it('비밀값 칸과 unconfirmed 는 그대로 둔다', () => {
    const 글 = 적음(원문);
    expect(글).toContain(".optional().meta({ secret: true }),");
    expect(글).toContain("unconfirmed: '화면 기준 — 작성 요청 7',");
    expect(글).not.toContain('held:');
  });

  it('다시 적어도 같다 — 실패 뒤 다시 누른 반영이 값을 겹쳐 쓰지 않는다', () => {
    const 한번 = 적음(원문);
    expect(적음(한번)).toBe(한번);
  });

  it('코드에 없는 칸 이름이면 사유를 낸다 — 옛 칸 이름에 적으면 코드가 깨진다', () => {
    expect(값적기(원문, { params: { 없는칸: 'x' } })).toEqual({ 사유: expect.stringContaining('params.없는칸') });
  });

  it('숫자가 아닌 수(NaN·무한)는 적지 않는다', () => {
    expect(값적기(원문, { expected: { total: Number.NaN } })).toHaveProperty('사유');
  });

  it('입력에 값이 없어도 held 는 뺀다 — 기본값이 이미 다 있는 보류가 있다', () => {
    expect(적음(원문, {} as typeof 입력)).not.toContain('held:');
  });
});

describe('보류남음 · 케이스tcId', () => {
  it('held 속성이 있는지 코드에서 본다', () => {
    expect(보류남음(원문)).toBe(true);
    expect(보류남음(적음(원문))).toBe(false);
  });

  it('defineCase 의 tcId 글자를 읽는다', () => {
    expect(케이스tcId(원문)).toBe('XHA-001');
    expect(케이스tcId('export const x = 1;')).toBeNull();
  });
});

describe('표고치기 — 제거한 tcId 칸을 「제거함」으로', () => {
  const 표 = [
    '| 요구 | 결과 | tcId |',
    '|------|------|------|',
    '| 1 | 보인다 | XHA-001 |',
    '| 2 | 보인다 | XHA-0012 |',
    'XHA-001 은 본문 글이다',
  ].join('\n');

  it('표 줄의 그 칸만 바꾸고 비슷한 번호와 본문은 안 건드린다', () => {
    const 고친 = 표고치기(표, ['XHA-001']);
    expect(고친).toContain('| 1 | 보인다 | 제거함(XHA-001) |');
    expect(고친).toContain('| 2 | 보인다 | XHA-0012 |');
    expect(고친).toContain('XHA-001 은 본문 글이다');
    expect(표고치기(고친, ['XHA-001'])).toBe(고친);
  });
});

describe('보류있나 · 반영커밋인가', () => {
  it('비지 않은 held 입력 묶음만', () => {
    expect(보류있나(undefined)).toBe(false);
    expect(보류있나({})).toBe(false);
    expect(보류있나({ 'XHA-001': { removed: true } })).toBe(true);
  });

  it('앞 반영이 올린 값 커밋을 알아본다 — 그 위가 아니라 자식이 끝낸 커밋 위에 다시 적는다', () => {
    const 본문 = `[WS-작성] XHA 작성 요청 5번 케이스\n\n보류 값 반영\n`;
    expect(반영커밋인가(본문)).toBe(true);
    expect(반영커밋인가('[WS-작성] XHA 작성 요청 5번 케이스\n')).toBe(false);
  });
});

describe('반영푸시인자 — 자기 브랜치에 읽은 머리일 때만 덮어쓴다', () => {
  it('--force-with-lease 에 옛 머리를 박고 그냥 --force 는 안 쓴다', () => {
    const sha = 'a'.repeat(40);
    const 인자 = 반영푸시인자(5, sha);
    expect(인자).toEqual(['push', `--force-with-lease=refs/heads/author-5:${sha}`, 'origin', 'HEAD:refs/heads/author-5']);
    expect(인자).not.toContain('--force');
  });
});

describe('새머리판정 — 옛 head 로 병합하지 않는다', () => {
  const 옛 = 'a'.repeat(40);
  const 올린 = 'b'.repeat(40);

  it('PR 이 올린 커밋을 가리키면 그 SHA 로 CI 를 기다린다', () => {
    expect(새머리판정(옛, 올린, 올린)).toEqual({ sha: 올린 });
  });

  it('PR 이 아직 옛 머리면 기다린다 — 옛 커밋의 초록으로 병합하지 않는다', () => {
    expect(새머리판정(옛, 올린, 옛)).toEqual({ 아직: true });
  });

  it('다른 커밋이면 병합하지 않는다 — 누가 그 사이에 얹었다', () => {
    expect(새머리판정(옛, 올린, 'c'.repeat(40))).toHaveProperty('사유');
  });
});

describe('실패문장들 — 케이스마다 첫 실패 문장', () => {
  it('JSON 보고에서 파일별 첫 실패의 검증 문장을 뽑는다', () => {
    const 보고 = JSON.stringify({
      suites: [
        {
          file: 'XHA/XHA-001.spec.ts',
          specs: [
            {
              file: 'XHA/XHA-001.spec.ts',
              tests: [
                { results: [{ status: 'passed' }, { status: 'failed', error: { message: '\u001b[31mError: 검증 실패: 최종 금액이 기준과 같다\u001b[39m\n    at x' } }] },
              ],
            },
          ],
        },
        {
          file: 'XHA/XHA-002.spec.ts',
          specs: [{ file: 'XHA/XHA-002.spec.ts', tests: [{ results: [{ status: 'timedOut', error: { message: 'Test timeout of 30000ms exceeded.' } }] }] }],
        },
        { file: 'XHA/XHA-003.spec.ts', specs: [{ file: 'XHA/XHA-003.spec.ts', tests: [{ results: [{ status: 'passed' }] }] }] },
      ],
    });
    expect(실패문장들(`앞 잡음\n${보고}`)).toEqual([
      'XHA/XHA-001.spec.ts — 최종 금액이 기준과 같다',
      'XHA/XHA-002.spec.ts — Test timeout of 30000ms exceeded.',
    ]);
  });

  it('보고를 못 읽으면 null', () => {
    expect(실패문장들('JSON 아님')).toBeNull();
  });
});

describe('비밀칸들 · 실행입력 — 비밀값 칸은 대상 서버 줄의 테스트 계정으로 채운다', () => {
  it('params 의 .meta({ secret: true }) 칸 이름을 읽는다', () => {
    expect(비밀칸들(원문)).toEqual(['password']);
  });

  it('아이디 모양 이름은 아이디, 나머지는 비밀번호', () => {
    const 대상 = { env: 'qa', baseUrl: 'https://qa.test', loginId: 'u1', loginPassword: 'p"w\\1' };
    const 환경 = 실행입력(대상, ['password', 'loginId', 'userEmail']);
    expect(환경.PLATFORM_BASE_URL).toBe('https://qa.test');
    expect(JSON.parse(환경.PLATFORM_PARAMS)).toEqual({
      params: { password: 'p"w\\1', loginId: 'u1', userEmail: 'u1' },
      expected: {},
    });
  });
});
