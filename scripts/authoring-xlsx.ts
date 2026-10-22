// 엑셀 자료를 시트마다 CSV 글로 바꾼다 — 에이전트가 자식 uid 로 따로 띄워 믿을 수 없는 파일을 에이전트 밖에서 연다 (도메인/게임 §3.10 「작성 — 한 바퀴」 1)
// claude 의 Read 는 .xlsx 를 못 열고 서버 이미지의 pandoc(jammy 2.9)은 엑셀을 못 읽는다

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// reporting/xlsx.ts 머리 주석 — 이름 import 는 노드 ESM 서버에서만 깨진다
import ExcelJS from 'exceljs';

/** 칸 하나를 CSV 칸으로 — 쉼표 · 따옴표 · 줄바꿈이 있으면 따옴표로 싼다 */
export function csv칸(글: string): string {
  return /[",\n\r]/.test(글) ? `"${글.replaceAll('"', '""')}"` : 글;
}

/** 시트마다 「# 시트: 이름」 머리와 CSV 줄. 칸은 화면에 보이는 글자(cell.text)다 — 수식은 계산 값, 날짜는 표시 꼴 */
export function 책글(책: ExcelJS.Workbook): string {
  return 책.worksheets
    .map((시트) => {
      const 줄들: string[] = [];
      시트.eachRow({ includeEmpty: true }, (줄) => {
        const 칸들: string[] = [];
        for (let i = 1; i <= 줄.cellCount; i += 1) 칸들.push(csv칸(줄.getCell(i).text));
        줄들.push(칸들.join(','));
      });
      return [`# 시트: ${시트.name}`, ...줄들].join('\n');
    })
    .join('\n\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [받은것, 낼곳] = process.argv.slice(2);
  if (받은것 === undefined || 낼곳 === undefined) throw new Error('쓰는 법: authoring-xlsx.ts <받은.xlsx> <낼.txt>');
  const 책 = new ExcelJS.Workbook();
  await 책.xlsx.readFile(받은것);
  writeFileSync(낼곳, 책글(책), { mode: 0o644 });
}
