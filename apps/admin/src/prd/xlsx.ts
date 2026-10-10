// 요구사항 추적표 엑셀 — 지금 판의 요구 한 줄마다 덮는 케이스 · 종류 · 기법 · 마지막 결과 (도메인/작성 §3.6 「메뉴가 곧 요구사항 추적표다」 · §7 export)
// 순수 렌더러다. 실행 read 판단은 부르는 쪽이 끝내고 결과 읽기를 넘긴다 — 없으면 null 이고 「마지막 결과」 칸이 빈다

// reporting/xlsx.ts 머리 주석 — 이름 import 는 노드 ESM 서버에서만 깨진다
import ExcelJS from 'exceljs';

import type { PrdItem } from '@platform/kit';

import { 제어빼기 } from '../../../../scripts/authoring-docx.js';
import { 비밀번호가리기 } from './docx.js';
import { 추적하기, type 결과읽기, type 덮는케이스 } from './trace.js';

export interface 추적표자료 {
  /** 함수 안에서 new Date() 를 부르면 같은 입력이 다른 바이트가 된다 (SPEC §3.3) */
  generatedAt: string;
  items: PrdItem[];
  cases: Record<string, 덮는케이스[]>;
  결과: 결과읽기 | null;
}

const 머리 = ['요구 번호', '기능 묶음', '요구 문장', '상태', '케이스 수', 'TC ID', '정상', '경계', '예외', 'UI', '설계 기법', '마지막 결과'];
const 너비 = [14, 16, 48, 10, 9, 18, 7, 7, 7, 7, 26, 26];
// 안 덮인 줄 — 거르지 않아도 눈에 띄게. 워드의 확인 필요 바탕(docx.ts 확인바탕)과 같은 색이다
const 안덮임바탕 = 'FFFFF1E4';

/** 워드와 같이 테스트 계정 비밀번호를 가린다 — 요구 문장 · 기능 묶음이 밖으로 나간다 (§3.6 「워드로 내려받기」) */
export async function 추적표만들기(자료: 추적표자료, 비밀번호들: string[]): Promise<Buffer> {
  const 가림 = (글: string) => 비밀번호가리기(제어빼기(글), 비밀번호들);
  const wb = new ExcelJS.Workbook();
  wb.created = new Date(자료.generatedAt);
  wb.modified = wb.created;
  const sheet = wb.addWorksheet('요구사항 추적표');
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = 너비.map((width) => ({ width, style: { alignment: { wrapText: true, vertical: 'top' } } }));
  sheet.addRow(머리);

  for (const x of 자료.items) {
    const 추적 = 추적하기(자료.cases[x.reqId] ?? [], 자료.결과);
    const 번호들 = [...추적.기능, ...추적.UI];
    const 덮나 = 번호들.length > 0;
    const 줄 = sheet.addRow([
      x.reqId,
      가림(x.feature),
      가림(x.text),
      x.status === 'NEEDS_CHECK' ? '확인 필요' : '확정',
      번호들.length,
      덮나 ? 번호들.join('\n') : '안 덮임',
      추적.종류.정상,
      추적.종류.경계,
      추적.종류.예외,
      추적.종류.UI,
      추적.기법.map(([기법, 수]) => `${기법} ${String(수)}`).join(' · ') || null,
      추적.결과 === null || !덮나 ? null : `통과 ${String(추적.결과.통과)} · 실패 ${String(추적.결과.실패)} · 미실행 ${String(추적.결과.미실행)}`,
    ]);
    if (!덮나) {
      for (let i = 1; i <= 머리.length; i += 1) 줄.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 안덮임바탕 } };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
