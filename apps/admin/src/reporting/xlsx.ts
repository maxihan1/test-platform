// 표시용 모델을 §8.4 「한 행 = 한 검증 문장」 표로 가장 잘게 편다. 시트 하나, 머리행 고정
// 가공하지 않는다 — 라벨·마스킹·빈 값은 collect.ts 가 이미 끝냈다. 여기서 또 하면 마스킹이 새는 자리가 둘이 된다

// exceljs 는 CJS 이고 진입점이 require 를 한 번 더 거친다. 노드 ESM 은 이름을 못 읽어
// `import { Workbook }` 이 서버에서만 깨진다 — Vitest 는 번들러가 덮어 줘서 안 잡힌다
import ExcelJS from 'exceljs';

import type { EvidenceAssertion, EvidenceDocument, EvidenceField, EvidenceItem, EvidenceStep } from './collect.js';

export interface RenderOptions {
  /** 렌더 입력으로 받는다 — 함수 안에서 new Date() 를 부르면 재현성이 깨진다 (SPEC §3.3) */
  generatedAt: string;
}

/** 화면 표기는 PC / 모바일이다. desktop / mobile 은 코드 안에서만 쓴다 (SPEC §2 · web/ui.tsx) */
const 디바이스: Record<EvidenceItem['platform'], string> = { desktop: 'PC', mobile: '모바일' };

// html.ts 의 같은 표와 낱말이 어긋나면 한 문서의 두 형식이 다른 말을 한다. 고칠 때 둘을 같이 고친다
const 판정글자: Record<EvidenceItem['status'], string> = {
  PASS: '통과',
  FAIL: '실패',
  NA: '미실행',
  NOT_RUN: '미실행',
};

/** SPEC §8.4 가 정본이다. 칸 순서를 여기서만 정하고 행 만드는 쪽은 이 길이에 맞춘다 */
const 머리행 = [
  'RUN',
  '실행일시',
  '서비스',
  '대상서버',
  '주소',
  '실행자',
  'tcId',
  '케이스명',
  '디바이스',
  '회차',
  '판정',
  '소요(ms)',
  '사전조건',
  '입력값',
  '기대값',
  '절차번호',
  '절차명',
  '절차판정',
  '절차소요(ms)',
  '검증문장',
  '기대',
  '실제',
  '판정',
  '스크린샷경로',
];

type 칸값 = string | number | null;

// 라벨 없이 값만 적으면 무슨 칸인지 모른다. 여러 쌍을 한 칸에 넣어야 하므로 줄로 나눈다
function 라벨값(칸: EvidenceField[]): string {
  return 칸.map((f) => `${f.label}: ${f.value}`).join('\n');
}

function 실행칸(doc: EvidenceDocument): 칸값[] {
  const h = doc.header;
  return [doc.runId, h.startedAt, h.serviceName, h.env, h.baseUrl, h.triggeredByName];
}

function 케이스칸(item: EvidenceItem): 칸값[] {
  return [
    item.tcId,
    item.tcName,
    디바이스[item.platform],
    item.attempt,
    판정글자[item.status],
    item.durationMs,
    item.precondition.join('\n'),
    라벨값(item.params),
    라벨값(item.expected),
  ];
}

function 절차칸(s: EvidenceStep): 칸값[] {
  return [s.seq, s.title, 판정글자[s.status], s.durationMs];
}

function 검증칸(a: EvidenceAssertion, s: EvidenceStep): 칸값[] {
  return [a.statement, a.expected, a.actual, 판정글자[a.status], s.screenshotPath];
}

const 빈절차: 칸값[] = [null, null, null, null];
const 빈검증: 칸값[] = [null, null, null, null, null];

// 절차가 없는 항목도, 검증 문장이 없는 절차도 한 행을 남긴다 —
// 행이 없으면 「돌지 못했다」와 「절차가 없었다」가 표에서 사라진다 (SPEC §8.4)
function 항목행들(doc: EvidenceDocument, item: EvidenceItem): 칸값[][] {
  const 앞 = [...실행칸(doc), ...케이스칸(item)];
  if (item.steps.length === 0) return [[...앞, ...빈절차, ...빈검증]];

  return item.steps.flatMap((s) => {
    const 절차 = [...앞, ...절차칸(s)];
    if (s.assertions.length === 0) return [[...절차, ...빈검증]];
    return s.assertions.map((a) => [...절차, ...검증칸(a, s)]);
  });
}

export async function renderXlsx(doc: EvidenceDocument, options: RenderOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  // 안 적으면 exceljs 가 지금 시각을 박아 같은 실행의 증적이 뽑을 때마다 다른 바이트로 나온다 (SPEC §3.3)
  workbook.created = new Date(options.generatedAt);
  workbook.modified = workbook.created;

  const sheet = workbook.addWorksheet('증적');
  // 머리행만 고정한다. 24칸을 가로로 훑는 표라 머리가 흘러가면 무슨 칸인지 못 읽는다
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.addRow(머리행);
  for (const item of doc.items) sheet.addRows(항목행들(doc, item));

  // exceljs 는 자기 모듈 안에 Buffer 를 따로 선언해 둔다. 노드 Buffer 로 맞춰 내보낸다
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
