// 표시용 모델을 §8.4 「한 행 = 한 검증 문장」 표로 가장 잘게 편다. 시트 하나, 머리행 고정
// 가공하지 않는다 — 라벨·마스킹·빈 값은 collect.ts 가 이미 끝냈다. 여기서 또 하면 마스킹이 새는 자리가 둘이 된다

// exceljs 는 CJS 이고 진입점이 require 를 한 번 더 거친다. 노드 ESM 은 이름을 못 읽어
// `import { Workbook }` 이 서버에서만 깨진다 — Vitest 는 번들러가 덮어 줘서 안 잡힌다
import ExcelJS from 'exceljs';

import type { EvidenceAssertion, EvidenceDocument, EvidenceField, EvidenceItem, EvidenceStep } from './collect.js';
import type { E2E단계, E2E증적 } from './collectScenario.js';

export interface RenderOptions {
  /** 렌더 입력으로 받는다 — 함수 안에서 new Date() 를 부르면 재현성이 깨진다 (SPEC §3.3) */
  generatedAt: string;
}

/** 화면 표기는 PC / 모바일이다. desktop / mobile 은 코드 안에서만 쓴다 (SPEC §2 · web/ui.tsx) */
const 디바이스: Record<EvidenceItem['platform'], string> = { desktop: 'PC', mobile: '모바일', android: 'Android 앱' };

// htmlItem.ts 의 같은 표와 낱말이 어긋나면 한 문서의 두 형식이 다른 말을 한다. 고칠 때 둘을 같이 고친다
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
  // 판정 옆에 둔다. 「미실행」 · 「NA」 · 예외로 깨진 「FAIL」 모두 여기에 이유를 적는다 (collect.ts 의 notRunReason)
  '미실행·판정불가 사유',
  // 비면 확정 항목이다. 걸러 내기로 미확정만 골라 볼 수 있다 (도메인/리포팅 · 실행 §3.2)
  '미확정 사유',
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
  // 맨 끝에 붙인다 — 앞에 끼우면 이 엑셀을 칸 위치로 읽는 시트가 전부 한 칸씩 밀린다 (PR #131)
  '종류',
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
    // 항목 단위 값이라 그 항목이 만드는 모든 행에 같은 값이 반복된다 — 병합 셀을 안 쓰기로 했다 (SPEC §8.4)
    item.notRunReason,
    item.unconfirmed,
    item.precondition.join('\n'),
    라벨값(item.params),
    라벨값(item.expected),
  ];
}

function 절차칸(s: EvidenceStep): 칸값[] {
  // 건너뛴 「만들기」 절차는 PASS 로 적혀 있다. 「통과」로 쓰면 준비까지 한 것으로 읽힌다 (E2E 증적)
  return [s.seq, s.title, s.skipped === true ? '건너뜀' : 판정글자[s.status], s.durationMs];
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
  // 머리행만 고정한다. 머리행 길이만큼 가로로 훑는 표라 머리가 흘러가면 무슨 칸인지 못 읽는다
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  // 「기기」는 종류 뒤 맨 끝이다 — E2E 엑셀과 같이 쓰는 머리행에 끼우면 그쪽 칸 위치가 밀린다 (APP-F1-05)
  sheet.addRow([...머리행, '기기']);
  for (const item of doc.items) sheet.addRows(항목행들(doc, item).map((행) => [...행, doc.header.kind, item.device ?? null]));

  // exceljs 는 자기 모듈 안에 Buffer 를 따로 선언해 둔다. 노드 Buffer 로 맞춰 내보낸다
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// 단계 칸 — 차례 · 종류 · 붙는 표시를 한 칸에 줄로 적는다. 값 연결 · 모킹을 빼면 꾸민 응답으로 통과한 것이 진짜로 읽힌다 (도메인/리포팅 §8.4)
function 단계글(d: E2E단계): string {
  return [
    [`${d.seq}단계`, d.종류, ...(d.모킹구간.length > 0 ? ['모킹 구간'] : []), ...(d.단독실행 ? ['단독 실행'] : [])].join(' · '),
    ...(d.모킹구간.length > 0 && !d.모킹안탐 ? [`모킹이 적용된 상태로 실행했습니다 — ${d.모킹구간.join(', ')}`] : []),
    ...(d.모킹안탐 ? ['이 단계의 API 호출은 모킹되지 않습니다'] : []),
    ...d.건너뜀,
    ...d.값연결.map((v) => `${v.종류} · ${v.글}`),
  ].join('\n');
}

// 절차가 없는 단계(모킹 · API · 대기 · 안 돈 케이스)도 한 행을 남긴다 — 행이 없으면 그 단계가 표에서 사라진다
function 한행(판: EvidenceDocument, d: E2E단계, platform: E2E증적['platform']): 칸값[] {
  const 판정 = d.적용됨 ? '적용됨' : d.안돌았다 ? '실행 안 됨' : 판정글자[d.status];
  const 케이스 = d.item === null ? [null, d.요약] : [d.item.tcId, d.item.tcName];
  return [
    ...실행칸(판),
    ...케이스,
    디바이스[platform],
    d.item === null ? null : 1,
    판정,
    d.안돌았다 ? null : d.durationMs,
    d.사유,
    d.item?.unconfirmed ?? null,
    ...빈항목뒤,
    ...빈절차,
    ...빈검증,
  ];
}

/** 케이스칸 중 판정 · 사유 · 미확정 뒤의 셋(사전조건 · 입력값 · 기대값) */
const 빈항목뒤: 칸값[] = [null, null, null];

/** E2E 증적 엑셀 — 「한 행 = 한 검증 문장」에 단계 칸이 앞에 하나 더 붙는다 (도메인/리포팅 §8.4) */
export async function renderScenarioXlsx(doc: E2E증적, options: RenderOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date(options.generatedAt);
  workbook.modified = workbook.created;

  const sheet = workbook.addWorksheet('E2E 증적');
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.addRow(['단계', ...머리행]);
  // 실행 칸 여섯은 케이스 증적과 같은 함수가 채운다 — 항목은 단계마다 따로 넘긴다
  const 판: EvidenceDocument = { runId: doc.runId, header: doc.header, items: [] };
  for (const d of doc.parts) {
    const 행들 = d.item !== null && !d.안돌았다 ? 항목행들(판, d.item) : [한행(판, d, doc.platform)];
    sheet.addRows(행들.map((행) => [단계글(d), ...행, doc.header.kind]));
  }
  // 판정에는 안 든다 — 마지막 단계 뒤에 한 줄씩 (도메인/시나리오 §3.7 결정 12)
  // 칸 수를 머리행에 맞춘다 — 종류로 거르면 정리 행이 사라지고, 칸 위치로 읽는 시트가 깨진다
  const 빈칸 = Array<null>(머리행.length - 실행칸(판).length - 1).fill(null);
  for (const 글 of doc.정리) sheet.addRow([글, ...실행칸(판), ...빈칸, doc.header.kind]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
