// 표준 기획서 워드가 도메인/작성 §3.6 「워드로 내려받기」대로 나오는지 본다 — 기능 묶음 · 표 · 확인 필요 바탕 · 비밀번호 가림

import type { PrdItem } from '@platform/kit';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { 비밀번호가리기, 워드만들기 } from './docx.js';

const 항목 = (reqId: string, feature: string, 덧: Partial<PrdItem> = {}): PrdItem => ({
  reqId,
  feature,
  text: `${reqId} 요구`,
  basis: [{ from: '기획서.docx', ref: 'REQ-1', quote: '원본 문장' }],
  status: 'CONFIRMED',
  ...덧,
});

async function 본문(items: PrdItem[], 비밀번호들: string[] = []): Promise<string> {
  const 바이트 = await 워드만들기({ service: 'MKT', version: 3, generatedAt: '2026-10-10 11:40', items }, 비밀번호들);
  return (await JSZip.loadAsync(바이트)).file('word/document.xml')!.async('string');
}

const 글만 = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('|');

describe('표준 기획서 워드', () => {
  it('제목 · 머리글 다음에 기능 묶음이 판에 처음 나온 차례로 표 하나씩 선다', async () => {
    const xml = await 본문([
      항목('MKT-REQ-001', '회원가입'),
      항목('MKT-REQ-002', '로그인', { status: 'NEEDS_CHECK' }),
      항목('MKT-REQ-003', '회원가입'),
    ]);
    const 글 = 글만(xml);
    expect(글.startsWith('MKT 표준 기획서|판 3 · 요구 3건 · 확인 필요 1건 · 2026-10-10 11:40 내려받음|회원가입|번호|요구 문장|상태|근거|MKT-REQ-001')).toBe(true);
    expect(글.indexOf('MKT-REQ-003')).toBeLessThan(글.indexOf('|로그인|'));
    expect(xml.match(/<w:tbl>/g)).toHaveLength(2);
    expect(xml.match(/w:val="Heading1"/g)).toHaveLength(2);
  });

  it('확인 필요 줄만 바탕색을 칠하고 상태 글자를 굵게 쓴다', async () => {
    const xml = await 본문([항목('MKT-REQ-001', '가'), 항목('MKT-REQ-002', '가', { status: 'NEEDS_CHECK' })]);
    const 줄들 = xml.split('<w:tr>').slice(2);
    expect(줄들[0]).not.toContain('FFF1E4');
    expect(줄들[0]).toContain('확정');
    expect(줄들[1]).toContain('w:fill="FFF1E4"');
    expect(줄들[1]).toContain('<w:b/><w:color w:val="B4560A"/></w:rPr><w:t xml:space="preserve">확인 필요');
  });

  it('근거는 자료 이름 · 원본 번호와 따옴표 친 원문 — 번호가 없으면 자료 이름만', async () => {
    const 글 = 글만(
      await 본문([항목('MKT-REQ-001', '가', { basis: [{ from: '화면', ref: '/cart', quote: '담기' }, { from: '피그마', quote: '20개' }] })]),
    );
    expect(글).toContain('|화면 · /cart|“담기”|피그마|“20개”');
  });

  it('비밀번호는 모든 글 칸에서 가린다', async () => {
    const xml = await 본문(
      [
        항목('MKT-REQ-001', 'abc1 묶음', {
          text: '계정 abc12345 로 로그인',
          basis: [{ from: 'abc1.docx', ref: 'abc1', quote: '비밀번호 abc1' }],
        }),
      ],
      ['abc1', 'abc12345'],
    );
    expect(xml).not.toContain('abc1');
    expect(글만(xml)).toContain('계정 •••••• 로 로그인');
  });

  it('겹친 비밀번호는 걸친 자리를 합쳐 한 번에 가려 남는 글자가 없다', () => {
    expect(비밀번호가리기('값 abcdef 끝', ['abcd', 'cdef'])).toBe('값 •••••• 끝');
    expect(비밀번호가리기('abcd와 cdef', ['abcd', 'cdef'])).toBe('••••••와 ••••••');
    expect(비밀번호가리기('aaaaa', ['aaaa'])).toBe('••••••');
  });

  it('문턱보다 짧은 비밀번호는 가리지 않는다 — 요구 문장의 숫자가 지워지지 않게', () => {
    expect(비밀번호가리기('1개까지 · 123개', ['1', '123', ''])).toBe('1개까지 · 123개');
  });

  it('XML 특수 문자는 풀어 쓰고 줄바꿈은 워드 줄바꿈으로', async () => {
    const xml = await 본문([항목('MKT-REQ-001', '가', { text: '<a> & "b"', basis: [{ from: 'x', quote: '첫 줄\n둘째 줄' }] })]);
    expect(xml).toContain('&lt;a&gt; &amp; &quot;b&quot;');
    expect(xml).toContain('“첫 줄</w:t><w:br/><w:t xml:space="preserve">둘째 줄”');
  });

  it('워드가 여는 데 필요한 파트를 다 싣는다', async () => {
    const zip = await JSZip.loadAsync(await 워드만들기({ service: 'MKT', version: 1, generatedAt: 'x', items: [] }, []));
    expect(Object.values(zip.files).filter((f) => !f.dir).map((f) => f.name).sort()).toEqual(
      ['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/styles.xml'].sort(),
    );
  });
});
