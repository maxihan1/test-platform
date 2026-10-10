// 케이스 목록을 납품·검수용 엑셀로 만든다 — 시트 ① 테스트 케이스 · 시트 ② 보류 처리 기록 (카탈로그 §8.1)
// 순수 렌더러다. 권한 판단은 부르는 쪽이 끝내고 결과만 canSee* · held 로 넘긴다

// reporting/xlsx.ts 머리 주석 — 이름 import 는 노드 ESM 서버에서만 깨진다
import ExcelJS from 'exceljs';

import type { CaseSpec, ItemStatus, Platform } from '@platform/kit';

import type { 보류, 입력한것, 칸 } from '../authoring/held.js';
import { 가려야하나 } from '../web/mask.js';

export interface ExportCase
  extends Pick<CaseSpec, 'tcId' | 'name' | 'platforms' | 'precondition' | 'paramSchema' | 'expectedSchema' | 'techniques'> {
  unconfirmed?: string | null;
  /** at 은 표에 그대로 적는 글자다 — 시간대 변환은 부르는 쪽 몫 */
  lastResult?: { status: ItemStatus; at: string } | null;
  /** 반영된 보류 입력이 있으면 그 작성 요청의 뿌리와 넣은 사람 */
  filledBy?: { rootId: number; by: string } | null;
  /** 맥락 — 지도 ① 과 표준 기획서 지금 판 (카탈로그 §8.1 「맥락」). 요구 문장은 싣지 않는다 */
  feature?: string | null;
  reqIds?: string[];
}

export interface ExportHeld {
  rootId: number;
  held: Pick<보류, 'tcId' | 'kind' | 'reason'> & { fields: Pick<칸, 'side' | 'key' | 'description'>[] };
  /** at 은 표에 그대로 적는 글자다 */
  input: 입력한것 | null;
  /** 그 뿌리에 끝난 MERGE 가 있다 */
  merged: boolean;
}

export interface ExportInput {
  /** 함수 안에서 new Date() 를 부르면 같은 입력이 다른 바이트가 된다 (SPEC §3.3) */
  generatedAt: string;
  cases: ExportCase[];
  /** null = 작성 read 가 없다 → 시트 ② 를 만들지 않는다 */
  held: ExportHeld[] | null;
  canSeeRuns: boolean;
  canSeeAuthoring: boolean;
  /** UI 면 설계 기법 열을 안 만든다 — UI 테스트에는 기법이 없다 (카탈로그 §7) */
  kind?: 'UI' | 'FN';
}

// reporting/xlsx.ts 와 같은 낱말이다. 한 납품물의 두 엑셀이 다른 말을 하면 안 된다
const 디바이스: Record<Platform, string> = { desktop: 'PC', mobile: '모바일', android: 'Android 앱' };
const 판정글자: Record<ItemStatus, string> = { PASS: '통과', FAIL: '실패', NA: '판정 불가' };
const 구분글자: Record<보류['kind'], string> = { UNDECIDABLE: '판정 불가', ON_HOLD: '보류' };
const 없음 = '—';
const 모킹표시 = '가짜 응답(모킹)';

const 케이스머리 = ['TC ID', '케이스명', '기기', '전제', '입력값', '기대값', '상태', '마지막 결과'];
const 보류머리 = ['작성 요청', 'TC ID', '구분', '왜 보류됐나', '처리', '넣은 값', '누가', '언제', '반영'];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function 글자로(v: unknown): string {
  if (typeof v === 'boolean') return v ? '예' : '아니오';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// 값이 아니라 스키마를 훑는다 — 목록에는 실행 값이 없고, 기본값이 없는 칸도 「있다」는 게 보여야 한다
function 스키마글(schema: unknown): string {
  const props = isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};
  return Object.entries(props)
    .map(([key, raw]) => {
      const prop = isPlainObject(raw) ? raw : {};
      const 라벨 = typeof prop.description === 'string' && prop.description !== '' ? prop.description : key;
      if (가려야하나(key, prop)) return `${라벨} = ••••`;
      return `${라벨} = ${'default' in prop ? 글자로(prop.default) : '(실행 때 넣음)'}`;
    })
    .join('\n');
}

function 상태(c: ExportCase, canSeeAuthoring: boolean): string {
  const 조각 = [c.unconfirmed ? `미확정 — ${c.unconfirmed}` : '정식'];
  if (c.precondition.some((p) => p.includes(모킹표시))) 조각.push('모킹');
  if (canSeeAuthoring && c.filledBy) 조각.push(`사람이 값 채움 — 작성 요청 #${c.filledBy.rootId} · ${c.filledBy.by}`);
  return 조각.join(' · ');
}

function 케이스행(c: ExportCase, input: ExportInput): (string | null)[] {
  const 기기 = c.platforms.length === 0 ? ['desktop' as const] : c.platforms;
  const 결과 = c.lastResult ? `${판정글자[c.lastResult.status]} · ${c.lastResult.at}` : 없음;
  return [
    c.tcId,
    c.name,
    기기.map((p) => 디바이스[p]).join(' · '),
    c.precondition.join('\n'),
    스키마글(c.paramSchema),
    스키마글(c.expectedSchema),
    상태(c, input.canSeeAuthoring),
    input.canSeeRuns ? 결과 : null,
  ];
}

function 넣은값(h: ExportHeld): string {
  const 입력 = h.input;
  if (!입력 || 입력.removed) return 없음;
  const 줄 = (['params', 'expected'] as const).flatMap((쪽) =>
    Object.entries(입력[쪽] ?? {}).map(([key, v]) => {
      const 칸 = h.held.fields.find((f) => f.side === 쪽 && f.key === key);
      // 화면은 비밀값 칸을 받지 않지만(held.ts 입력검사) 이름으로 한 번 더 막는다 — 새면 검수처로 나간다
      return `${칸?.description || key} = ${가려야하나(key, {}) ? '••••' : 글자로(v)}`;
    }),
  );
  return 줄.length === 0 ? 없음 : 줄.join(' · ');
}

function 보류행(h: ExportHeld): string[] {
  const 처리 = !h.input ? '값 필요' : h.input.removed ? '제거함' : '값 채움';
  return [
    `#${h.rootId}`,
    h.held.tcId,
    구분글자[h.held.kind],
    h.held.reason,
    처리,
    넣은값(h),
    h.input?.by ?? 없음,
    h.input?.at ?? 없음,
    h.merged ? '반영됨' : '반영 전',
  ];
}

function 시트(wb: ExcelJS.Workbook, 이름: string, 머리: string[], 너비: number[], 행들: (string | null)[][]): void {
  const sheet = wb.addWorksheet(이름);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns = 너비.map((width) => ({ width, style: { alignment: { wrapText: true, vertical: 'top' } } }));
  sheet.addRow(머리);
  sheet.addRows(행들);
}

export async function renderCatalogXlsx(input: ExportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date(input.generatedAt);
  wb.modified = wb.created;

  // UI 테스트에는 기법이 없다. 열을 번호로 읽는 검사 · 사람이 있어 새 열은 맨 끝에 붙인다 (카탈로그 §7)
  const 기법열 = input.kind !== 'UI';
  시트(
    wb,
    '테스트 케이스',
    [...케이스머리, ...(기법열 ? ['설계 기법'] : []), '기능 묶음', '요구 번호'],
    [12, 40, 12, 36, 36, 36, 30, 22, ...(기법열 ? [20] : []), 18, 20],
    input.cases.map((c) => [
      ...케이스행(c, input),
      ...(기법열 ? [c.techniques?.join(' · ') || null] : []),
      c.feature ?? null,
      c.reqIds?.join('\n') || null,
    ]),
  );
  if (input.held !== null) {
    시트(wb, '보류 처리 기록', 보류머리, [10, 12, 10, 40, 10, 36, 12, 18, 10], input.held.map(보류행));
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
