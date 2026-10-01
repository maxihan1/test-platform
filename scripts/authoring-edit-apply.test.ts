// 케이스 고치기(EDIT)의 순수 함수 — 확정 · 기대값 · 삭제를 main 사본의 글에 적고 PR 본문 줄을 만든다
import { describe, expect, it } from 'vitest';

import { checkSource } from '../apps/admin/src/catalog/rules.js';
import { 속성빼기 } from './authoring-held-apply.js';
import { type 고칠것, 기대기본값들, 미확정사유, 편집PR본문, 편집계산, 확정하기 } from './authoring-edit-apply.js';

const 사유문 = '기획서는 「홈으로」를 버튼이라 적었는데 화면은 링크다 — 차이 D1 (작성 요청 7)';
const 사유줄 = `\n  unconfirmed: '${사유문}',`;

const 미확정 = `import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'XEE-001',
  name: '없는 주소로 들어가면 제목과 「홈으로」 링크가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    path: z.string().min(1).describe('들어갈 없는 주소').default('/no-such-page'),
  }),
  expected: z.object({
    heading: z.string().describe('보여야 할 화면 제목').default('페이지를 찾을 수 없습니다'),
    homeLinkVisible: z.boolean().describe('「홈으로」가 보일지 여부').default(true),
    count: z.number().describe('링크 수'),
  }),${사유줄}
});

test(spec, async ({ page, params, expected }) => {
  await test.step('없는 주소로 들어간다', async () => {
    await page.goto(params.path);
    await verify(
      '제목과 「홈으로」 링크가 보인다',
      { 제목: await page.title(), 수: 1, 홈: true },
      { 제목: expected.heading, 수: expected.count, 홈: expected.homeLinkVisible },
    );
  });
});
`;

const 확정된 = 미확정.replace("tcId: 'XEE-001'", "tcId: 'XEE-002'").replace(사유줄, '');

const 경로1 = 'tests/XEE/XEE-001.spec.ts';
const 경로2 = 'tests/XEE/XEE-002.spec.ts';
const 케이스들 = [
  { 경로: 경로1, 글: 미확정 },
  { 경로: 경로2, 글: 확정된 },
];
const 표 = {
  경로: 'docs/cases/XEE.md',
  글: ['| 요구 | 결과 | tcId |', '|------|------|------|', '| 1 | 보인다 | XEE-001 |', '| 2 | 보인다 | XEE-002 |'].join('\n'),
};

function 계산됨(edits: 고칠것[], 표글: typeof 표 | null = 표) {
  const r = 편집계산(케이스들, 표글, edits);
  if ('사유' in r) throw new Error(r.사유);
  return r;
}

describe('속성빼기 — defineCase 의 속성 줄 하나를 통째로 뺀다', () => {
  it('앞 줄바꿈부터 뒤 쉼표까지 빼고 나머지 글자는 그대로다', () => {
    expect(속성빼기(미확정, 'unconfirmed')).toBe(미확정.replace(사유줄, ''));
    expect(속성빼기(미확정, 'precondition')).toBe(미확정.replace("\n  precondition: ['비회원이다'],", ''));
  });

  it('그 속성이 없으면 원문 그대로다', () => {
    expect(속성빼기(확정된, 'unconfirmed')).toBe(확정된);
  });
});

describe('확정하기 — unconfirmed 줄만 뺀다', () => {
  it('결과는 unconfirmed 줄만 빠진 글이고 K 규칙을 통과한다', () => {
    const r = 확정하기(미확정);
    expect(r).toEqual({ 글: 미확정.replace(사유줄, '') });
    if ('사유' in r) throw new Error(r.사유);
    expect(checkSource('XEE-001.spec.ts', r.글).violations).toEqual([]);
  });

  it('이미 확정된 케이스는 같은 글이다', () => {
    expect(확정하기(확정된)).toEqual({ 글: 확정된 });
  });

  it('defineCase 가 없으면 사유를 낸다', () => {
    expect(확정하기('export const x = 1;\n')).toHaveProperty('사유');
  });
});

describe('미확정사유 · 기대기본값들 — PR 본문에 싣는 지금 값', () => {
  it('unconfirmed 글자를 읽고 없으면 null', () => {
    expect(미확정사유(미확정)).toBe(사유문);
    expect(미확정사유(확정된)).toBeNull();
  });

  it('expected 칸마다 .default 인자의 코드 글자 — 기본값이 없는 칸은 빠진다', () => {
    expect(기대기본값들(미확정)).toEqual({ heading: "'페이지를 찾을 수 없습니다'", homeLinkVisible: 'true' });
    expect(기대기본값들('export const x = 1;\n')).toEqual({});
  });
});

describe('편집계산 — 고칠 것을 사본 글에 적는다', () => {
  it('기대값은 값적기로 적고 칸마다 옛 값 → 새 값 줄을 낸다', () => {
    const r = 계산됨([{ tcId: 'XEE-001', expected: { heading: '없는 페이지', count: 2 } }]);
    const 글 = r.쓰기.get(경로1);
    expect(글).toContain(".describe('보여야 할 화면 제목').default('없는 페이지')");
    expect(글).toContain(".describe('링크 수').default(2)");
    expect(글).toContain(사유줄);
    expect([...r.쓰기.keys()]).toEqual([경로1]);
    expect(r.지우기).toEqual([]);
    expect(r.줄들).toEqual([
      "- XEE-001 기대값 heading: '페이지를 찾을 수 없습니다' → '없는 페이지'",
      '- XEE-001 기대값 count: 없음 → 2',
    ]);
  });

  it('기대값을 먼저 적고 확정한다 — 확정 줄의 지금 기대값은 바꾼 뒤 값이다', () => {
    const r = 계산됨([{ tcId: 'XEE-001', expected: { homeLinkVisible: false }, confirm: true }]);
    expect(r.쓰기.get(경로1)).toBe(
      미확정.replace("'「홈으로」가 보일지 여부').default(true)", "'「홈으로」가 보일지 여부').default(false)").replace(사유줄, ''),
    );
    expect(r.줄들).toEqual([
      '- XEE-001 기대값 homeLinkVisible: true → false',
      `- XEE-001 확정 — 미확정 사유: ${사유문} · 지금 기대값: heading='페이지를 찾을 수 없습니다', homeLinkVisible=false`,
    ]);
  });

  it('삭제는 지울 목록에 넣고 요구사항 표의 그 칸을 「제거함」으로 바꾼다', () => {
    const r = 계산됨([{ tcId: 'XEE-002', delete: true }]);
    expect(r.지우기).toEqual([경로2]);
    expect([...r.쓰기.keys()]).toEqual([표.경로]);
    expect(r.쓰기.get(표.경로)).toContain('| 2 | 보인다 | 제거함(XEE-002) |');
    expect(r.쓰기.get(표.경로)).toContain('| 1 | 보인다 | XEE-001 |');
    expect(r.줄들).toEqual(['- XEE-002 삭제']);
  });

  it('요구사항 표가 없으면 케이스 파일만 지운다', () => {
    const r = 계산됨([{ tcId: 'XEE-002', delete: true }], null);
    expect(r.지우기).toEqual([경로2]);
    expect(r.쓰기.size).toBe(0);
  });

  it('바뀐 파일만 쓰기에 담고 아무것도 안 바뀐 케이스는 줄도 안 낸다', () => {
    const r = 계산됨([
      { tcId: 'XEE-001', confirm: true },
      { tcId: 'XEE-002', expected: { heading: '페이지를 찾을 수 없습니다' }, confirm: true },
    ]);
    expect([...r.쓰기.keys()]).toEqual([경로1]);
    expect(r.줄들).toHaveLength(1);
    expect(r.줄들[0]).toMatch(/^- XEE-001 확정 — /);
  });

  it('케이스 파일이 없으면 사유를 낸다', () => {
    expect(편집계산(케이스들, 표, [{ tcId: 'XEE-009', delete: true }])).toEqual({ 사유: 'XEE-009 케이스 파일을 못 찾았다' });
  });

  it('값적기가 못 적으면 tcId 를 붙여 그 사유를 낸다', () => {
    expect(편집계산(케이스들, 표, [{ tcId: 'XEE-001', expected: { 없는칸: 'x' } }])).toEqual({
      사유: 'XEE-001: expected.없는칸 칸을 코드에서 못 찾았다',
    });
  });

  it('바뀐 것이 하나도 없으면 사유를 낸다 — 빈 커밋은 올라가지 않는다', () => {
    expect(
      편집계산(케이스들, 표, [{ tcId: 'XEE-002', expected: { homeLinkVisible: true }, confirm: true }]),
    ).toEqual({ 사유: '고칠 것이 이미 반영돼 있다' });
  });
});

describe('편집PR본문 — 케이스마다 한 줄', () => {
  it('머리 · 줄 · 병합 근거 문장 순서다', () => {
    const 본문 = 편집PR본문(['- XEE-002 삭제', '- XEE-001 기대값 count: 없음 → 2']);
    expect(본문.startsWith('## 케이스 고치기\n\n- XEE-002 삭제\n- XEE-001 기대값 count: 없음 → 2\n\n')).toBe(true);
    expect(본문).toContain('어드민');
    expect(본문).toContain('「반영」');
    expect(본문).toContain('CI');
  });
});
