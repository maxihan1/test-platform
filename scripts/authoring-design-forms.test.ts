// 설계 판정의 글자본 꼴 검사 — 같은 기획서를 md 로 받든 서버 변환(pandoc)으로 받든 요구마다 같은 설계가 나오는지
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 원장뽑기 } from './authoring-ledger.js';

const 읽기 = (이름: string) => readFileSync(new URL(`./fixtures/ledger/${이름}`, import.meta.url), 'utf8');
// 워드 변환은 곧은 따옴표를 둥근 따옴표로 바꾼다 — 근거 글자만 다르고 판정은 같아야 한다
const 따옴표 = (글: string) => 글.replace(/\\"/g, '"').replace(/[“”]/g, '"');

describe('설계 — 글자본 꼴이 달라도 같다', () => {
  it('데모마켓 md 원본과 서버 변환본의 설계가 172 요구마다 같고 경계 32 · 예외 53 이다', () => {
    const md = 원장뽑기(읽기('demomarket.md'), '기획서.md');
    const 서버 = new Map(원장뽑기(읽기('demomarket-pandoc.txt'), '기획서.docx').항목.map((h) => [h.번호, h.설계]));
    expect(md.항목).toHaveLength(172);
    for (const h of md.항목) {
      expect([h.번호, 따옴표(JSON.stringify(h.설계 ?? null))]).toEqual([h.번호, 따옴표(JSON.stringify(서버.get(h.번호) ?? null))]);
    }
    expect([md.항목.filter((h) => (h.설계?.경계.length ?? 0) > 0).length, md.항목.filter((h) => (h.설계?.예외.length ?? 0) > 0).length]).toEqual([32, 53]);
  });
});
