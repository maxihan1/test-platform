// 엑셀 자료 글 바꾸기 검사 — 시트마다 CSV 줄 · 따옴표 싸기, 에이전트가 거는 그대로 node 로 띄워 txt 를 낸다
import ExcelJS from 'exceljs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { 자료계획 } from './authoring-assets.js';
import { csv칸, 책글 } from './authoring-xlsx.js';

const 폴더 = mkdtempSync(join(tmpdir(), 'authoring-xlsx-'));
afterAll(() => rmSync(폴더, { recursive: true, force: true }));

function 확률책(): ExcelJS.Workbook {
  const 책 = new ExcelJS.Workbook();
  const 강화 = 책.addWorksheet('강화 확률');
  강화.addRow(['단계', '성공 %', '비고']);
  강화.addRow([1, 90, '']);
  강화.addRow([2, { formula: '90-20', result: 70 }, '실패 시 "파괴", 아님']);
  책.addWorksheet('아이템').addRow(['sword_long', '공격력 +14']);
  return 책;
}

describe('엑셀 자료를 글로', () => {
  it('쉼표 · 따옴표 · 줄바꿈이 든 칸만 따옴표로 싼다', () => {
    expect(csv칸('90')).toBe('90');
    expect(csv칸('a,b')).toBe('"a,b"');
    expect(csv칸('실패 시 "파괴"')).toBe('"실패 시 ""파괴"""');
    expect(csv칸('줄\n바꿈')).toBe('"줄\n바꿈"');
  });

  it('시트마다 이름 머리와 CSV 줄을 쓰고 수식은 계산 값으로 적는다', () => {
    expect(책글(확률책())).toBe(
      ['# 시트: 강화 확률', '단계,성공 %,비고', '1,90,', '2,70,"실패 시 ""파괴"", 아님"', '', '# 시트: 아이템', 'sword_long,공격력 +14'].join('\n'),
    );
  });

  it('에이전트가 거는 변환 명령을 그대로 돌리면 txt 가 생긴다', async () => {
    const [계획] = 자료계획([{ id: 3, position: 1, kind: 'FILE', name: '확률.xlsx', figmaUrl: null }], 폴더);
    if (계획?.kind !== 'FILE' || 계획.변환 === null) throw new Error('엑셀 변환 계획이 없다');
    await 확률책().xlsx.writeFile(계획.받을자리);
    const r = spawnSync(계획.변환.명령, 계획.변환.인자, { cwd: 폴더, encoding: 'utf8', timeout: 60_000 });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(readFileSync(계획.읽을자리, 'utf8')).toContain('# 시트: 아이템\nsword_long,공격력 +14');
  }, 60_000);
});
