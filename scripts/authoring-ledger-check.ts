// 원장 대조 — 원장의 번호마다 요구사항 표에서 케이스로 덮였는지, 「제외」 표에 사유와 함께 한 줄로 있는지 본다
// 에이전트가 올리기 직전에 부르고(빠짐 · 형식 오류는 셈과 PR 본문 머리에 적고 거절하지 않는다 — 2026-09-30 게이트 1),
// 사람과 자식은 `npm run check:ledger` 로 부른다 (도메인/작성 §3.6 「★ 원장」)

import { tcId종류 } from '../apps/admin/src/catalog/rules.js';
import { 케이스tcId } from './authoring-held-apply.js';
import { type 원장, type 원장항목, 번호찾기 } from './authoring-ledger.js';
import { type 칸재료, type 표줄, 칸번호 } from './authoring-slots.js';

/** 제외 종류 — 닫힌 다섯. **목록의 정본은 여기다** — 명세 · 스킬은 이 목록을 가리킨다 */
export const 제외종류 = ['다음 요청', '되돌릴 수 없음', '자료 없음', '요구 아님', '사람이 뺌'] as const;
export type 제외종류 = (typeof 제외종류)[number];

/** 출처 칸 하나에 몰아 적을 수 있는 번호 수 — 한 줄에 원장을 통째로 적어 대조를 통과하지 못하게 */
const 출처상한 = 10;
const tcId꼴 = /^[A-Z][A-Z0-9]{0,11}-(?:(?:UI|FN)-)?\d+$/;

export interface 셈 {
  총: number;
  케이스: number;
  제외: Partial<Record<제외종류, number>>;
  빠짐: number;
}

export interface 대조결과 {
  빠짐: string[];
  형식오류: string[];
  경고: string[];
  셈: 셈;
  /** 원장 번호 → 그 번호를 덮은 tcId 들. 보류 케이스만으로 덮였는지는 셈을 만드는 쪽이 이것으로 가린다 */
  덮음: Map<string, Set<string>>;
  /** 원장 번호 → 제외 종류. 케이스로 덮인 번호는 뺀다 — `셈.제외` 와 같은 거름이라야 번호 목록이 종류별 수와 맞는다 */
  제외번호: Map<string, 제외종류>;
  /** UI 케이스로만 덮인 원장 번호(원장 순서) — R19 를 사람이 PR 에서 보게 하는 보고용이다. 빠짐으로 세지 않는다 */
  UI만: string[];
  /** tcId 가 칸 번호와 다른 요구 줄 · 번호를 못 매긴 줄. 덮음 · 셈은 그대로다 — 번호 하나 틀렸다고 덮은 요구를 빠짐으로 떨구지 않는다 (작성 §3.6 「칸과 번호」) */
  칸어긋남: string[];
  칸알림: string[];
}

/** 기준(main) 표에서 뽑아 대조에 넘기는 것 — 사람의 결정 · 앞 실행이 남긴 「다음 요청」 · 칸 번호 재료(기준 표를 못 읽었으면 null) */
export interface 기준결정 {
  사람이뺌: Set<string>;
  다음요청: Set<string>;
  칸재료: 칸재료 | null;
}

/**
 * 케이스 파일 글들에서 tcId 를 모은다 — 대조의 `있는케이스` 재료. 파일 이름이 아니라 **`defineCase` 선언**을 문법 트리로 읽는다.
 * 글자로 찾으면 절차 제목에 「tcId: 'X'」 만 적어도 케이스가 있는 것으로 쳐 대조를 넘는다 (2026-09-30 코드 검토)
 */
export function tcId들(글들: string[]): Set<string> {
  return new Set(글들.map(케이스tcId).filter((t): t is string => t !== null));
}

/** 마크다운 표 한 줄을 칸으로. `\|` 는 칸 가름이 아니다 */
function 칸들(줄: string): string[] {
  return 줄
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

/** 절 아래 표의 몸 줄마다 글 안 줄 차례 · 머리 칸 · 칸. 읽기와 번호 채우기가 같은 줄을 같은 차례로 보게 한 곳에 둔다 */
function 표몸줄들(줄들: string[], 제목: string): { 줄: number; 머리: string[]; 칸: string[] }[] {
  const 시작 = 줄들.findIndex((l) => new RegExp(`^##\\s+${제목}\\s*$`).test(l.trim()));
  if (시작 < 0) return [];
  const 몸: { 줄: number; 머리: string[]; 칸: string[] }[] = [];
  let 머리: string[] | null = null;
  for (let i = 시작 + 1; i < 줄들.length; i++) {
    const l = 줄들[i] ?? '';
    if (/^#{1,2}\s/.test(l)) break;
    if (!l.trim().startsWith('|')) {
      // 표가 끝났다 — 다음 표는 머리 줄부터 다시 읽는다
      머리 = null;
      continue;
    }
    const 칸 = 칸들(l);
    if (머리 === null) {
      머리 = 칸;
      continue;
    }
    if (칸.every((c) => /^:?-+:?$/.test(c))) continue;
    몸.push({ 줄: i, 머리, 칸 });
  }
  return 몸;
}

/** `## <제목>` 절 아래 표를 전부(### 소제목으로 나눠도) 머리 칸 이름으로 읽는다. 다음 `#`·`##` 에서 멈춘다. 절이 없으면 빈 배열 */
export function 표읽기(글: string, 제목: string): Record<string, string>[] {
  return 표몸줄들(글.split(/\r?\n/), 제목).map(({ 머리, 칸 }) => Object.fromEntries(머리.map((h, i) => [h, 칸[i] ?? ''])));
}

const 백틱벗기기 = (글: string) => 글.trim().replace(/^`(.*)`$/, '$1').trim();

/**
 * 「요구사항」 표에서 `기대`(차례 → tcId)가 있는 줄의 tcId 칸만 고쳐 쓴다 — 번호 명령(`npm run ledger:number`)이 부른다.
 * 다른 칸 · 다른 절(미확정 · 보류 표도 tcId 칸이 있다) · 줄 끝 `\r` · 칸의 백틱은 그대로 둔다
 */
export function 표번호채우기(표글: string, 기대: Map<number, string>): string {
  const 줄들 = 표글.split('\n');
  표몸줄들(줄들, '요구사항').forEach(({ 줄, 머리 }, 차례) => {
    const 새 = 기대.get(차례);
    const 열 = 머리.indexOf('tcId');
    if (새 === undefined || 열 < 0) return;
    const 원 = 줄들[줄] ?? '';
    const 끝 = 원.endsWith('\r') ? '\r' : '';
    const 몸 = 원.slice(0, 원.length - 끝.length);
    const 조각 = 몸.split(/(?<!\\)\|/);
    const 앞 = 몸.trim().startsWith('|') ? 1 : 0;
    const 자리 = 열 + 앞;
    // 칸이 모자란 줄은 둔다 — 끝 가름 자리에 쓰면 표가 깨진다. 대조가 어긋남으로 보인다
    if (자리 >= 조각.length - (몸.trimEnd().endsWith('|') ? 1 : 0)) return;
    const 옛 = (조각[자리] ?? '').trim();
    if (백틱벗기기(옛) === 새) return;
    조각[자리] = ` ${옛.startsWith('`') ? `\`${새}\`` : 새} `;
    줄들[줄] = 조각.join('|') + 끝;
  });
  return 줄들.join('\n');
}

/** 「요구사항」 표 줄을 칸 계산 재료로 — 차례는 표읽기 차례다 */
export function 요구줄들(표글: string): 표줄[] {
  return 표읽기(표글, '요구사항').map((행, 차례) => ({ 차례, 출처: 행['출처'] ?? '', 축: (행['축'] ?? '').trim(), tcId: 백틱벗기기(행['tcId'] ?? '') }));
}

/**
 * 원장을 표와 맞댄다.
 * `있는케이스` — 올릴 트리에 실제로 있는 tcId. 주면 요구 줄의 tcId 파일이 있어야 덮은 것으로 친다(자식이 쓴 표만 믿지 않는다).
 * `에이전트` — 참이면 「사람이 뺌」을 형식 오류로 친다. 작성 에이전트의 자식은 사람 결정을 대신 못 한다
 */
export function 원장대조(
  원장: 원장항목[],
  표글: string,
  // 에이전트 — 참이면 「사람이 뺌」을 형식 오류로 친다. 단 사람이뺌(기준(main) 표에 이미 있던 번호)의 줄은 인정한다 — 사람의 결정이다 (2026-09-30 게이트 1)
  // 다음요청 — 기준 표에 있던 「다음 요청」 번호. 칸재료 — 주면(에이전트) 요구 줄 tcId 를 칸 번호와 견준다 (2026-10-04 게이트 1)
  선택: { 있는케이스?: Set<string>; 에이전트: boolean; 사람이뺌?: Set<string>; 다음요청?: Set<string>; 칸재료?: 칸재료 | null },
): 대조결과 {
  const 형식오류: string[] = [];
  const 케이스로 = new Map<string, Set<string>>();
  const 제외로 = new Map<string, 제외종류>();
  const 표번호 = new Set<string>();
  const 기능으로 = new Set<string>();

  for (const 행 of 표읽기(표글, '요구사항')) {
    const 번호들 = 번호찾기(행['출처'] ?? '').번호들;
    번호들.forEach((b) => 표번호.add(b));
    if (번호들.length > 출처상한) {
      형식오류.push(`요구 줄 출처 칸에 번호가 ${String(번호들.length)}개다 — ${String(출처상한)}개까지`);
      continue;
    }
    // 백틱을 벗긴다 — 번호 명령 · 칸 대조와 같은 글로 본다(사람 표는 tcId 를 백틱으로 감싼다)
    const tcId = 백틱벗기기(행['tcId'] ?? '');
    if (!tcId꼴.test(tcId)) continue;
    if (선택.있는케이스 !== undefined && !선택.있는케이스.has(tcId)) {
      형식오류.push(`요구 줄의 tcId ${tcId} 케이스 파일이 없다`);
      continue;
    }
    // 종류는 tcId 에서만 읽는다 — 옛 꼴은 기능으로 본다 (작성 §3.6). 축 칸은 자식이 쓴 글이라 믿지 않는다
    const UI줄 = tcId종류(tcId) === 'UI';
    for (const b of 번호들) {
      케이스로.set(b, (케이스로.get(b) ?? new Set<string>()).add(tcId));
      if (!UI줄) 기능으로.add(b);
    }
  }

  for (const 행 of 표읽기(표글, '제외')) {
    const 요구 = 행['요구'] ?? '';
    const 종류 = (행['종류'] ?? '').trim();
    const 번호들 = 번호찾기(요구).번호들;
    번호들.forEach((b) => 표번호.add(b));
    const 틀림 = (까닭: string) => 형식오류.push(`제외 줄 「${요구}」 — ${까닭}`);
    if (/[~～]/.test(요구)) {
      틀림('범위는 못 쓴다');
      continue;
    }
    if (번호들.length !== 1) {
      틀림('한 줄에 번호 하나');
      continue;
    }
    if (!(제외종류 as readonly string[]).includes(종류)) {
      틀림(`모르는 종류 「${종류}」`);
      continue;
    }
    if (종류 === '사람이 뺌' && 선택.에이전트 && !(선택.사람이뺌?.has(번호들[0] ?? '') ?? false)) {
      틀림('「사람이 뺌」은 사람 세션만 쓴다');
      continue;
    }
    // 범위는 AI 가 줄이지 않는다 — 1차 MKT 가 「필수를 먼저 덮었다」며 9개를 뺐다 (작성 §3.6 원장 표 「제외 종류」)
    if (종류 === '다음 요청' && 선택.에이전트 && !(선택.다음요청?.has(번호들[0] ?? '') ?? false)) {
      틀림('「다음 요청」은 작성 에이전트가 새로 못 쓴다');
      continue;
    }
    if ((행['사유'] ?? '').trim() === '') {
      틀림('사유가 비었다');
      continue;
    }
    제외로.set(번호들[0] ?? '', 종류 as 제외종류);
  }

  const 원장번호 = new Set(원장.map((h) => h.번호));
  const 빠짐 = 원장.map((h) => h.번호).filter((b) => !케이스로.has(b) && !제외로.has(b));
  const 밖 = [...표번호].filter((b) => !원장번호.has(b));
  const 제외번호 = new Map([...제외로].filter(([b]) => 원장번호.has(b) && !케이스로.has(b)));
  const 제외셈: Partial<Record<제외종류, number>> = {};
  for (const 종류 of 제외번호.values()) 제외셈[종류] = (제외셈[종류] ?? 0) + 1;
  const 칸어긋남: string[] = [];
  let 칸알림: string[] = [];
  if (선택.에이전트 && 선택.칸재료 != null) {
    const 줄들 = 요구줄들(표글);
    const 칸 = 칸번호(원장.map((h) => h.번호), 줄들, 선택.칸재료);
    칸어긋남.push(...칸.어긋남);
    for (const 줄 of 줄들) {
      const 기대 = 칸.기대.get(줄.차례);
      if (기대 !== undefined && 줄.tcId !== 기대) 칸어긋남.push(`요구 줄 ${String(줄.차례 + 1)} tcId ${줄.tcId === '' ? '(빈칸)' : 줄.tcId} — 칸 번호 ${기대}`);
    }
    칸알림 = 칸.알림;
  }
  const 덮음 = new Map<string, Set<string>>();
  for (const { 번호 } of 원장) {
    const 덮은것 = 케이스로.get(번호);
    if (덮은것 !== undefined) 덮음.set(번호, 덮은것);
  }
  return {
    빠짐,
    형식오류,
    경고: 밖.length > 0 ? [`원장에 없는 번호가 표에 있다 — ${밖.join(' · ')}`] : [],
    셈: {
      총: 원장.length,
      케이스: 원장.filter((h) => 케이스로.has(h.번호)).length,
      제외: 제외셈,
      빠짐: 빠짐.length,
    },
    덮음,
    제외번호,
    UI만: 원장.map((h) => h.번호).filter((b) => 케이스로.has(b) && !기능으로.has(b)),
    칸어긋남,
    칸알림,
  };
}

/**
 * 표의 「제외」에서 「사람이 뺌」 번호만. 에이전트가 기준(main) 표에서 뽑아 들고 대조에 넘긴다 —
 * 사람이 병합 뒤 적은 결정을 다음 실행이 형식 오류 · 빠짐으로 세지 않게. 한 줄에 번호 하나가 아닌 줄은 뺀다(대조가 형식 오류로 본다)
 */
export function 사람이뺀번호(표글: string): Set<string> {
  return 제외번호들(표글, '사람이 뺌');
}

/** 표의 「제외」에서 그 종류 번호만 — 에이전트가 기준 표에서 뽑는다. 한 줄에 번호 하나가 아닌 줄은 뺀다 */
export function 제외번호들(표글: string, 종류: 제외종류): Set<string> {
  const 번호들 = 표읽기(표글, '제외')
    .filter((행) => (행['종류'] ?? '').trim() === 종류)
    .map((행) => 번호찾기(행['요구'] ?? '').번호들)
    .filter((b) => b.length === 1);
  return new Set(번호들.map((b) => b[0] ?? ''));
}

/** PR 본문 머리에 싣는 셈 한 줄 — 에이전트가 센 것이다(자식 요약을 믿지 않는다) */
export function 셈글(셈: 셈, 가족: Record<string, number>): string {
  const 제외수 = Object.values(셈.제외).reduce((a, n) => a + (n ?? 0), 0);
  const 종류별 = Object.entries(셈.제외)
    .map(([k, n]) => `${k} ${String(n)}`)
    .join(' · ');
  const 가족글 = Object.entries(가족)
    .map(([k, n]) => `${k} ${String(n)}`)
    .join(' · ');
  return `원장: 요구 ${String(셈.총)} → 케이스 ${String(셈.케이스)} · 제외 ${String(제외수)}${종류별 === '' ? '' : `(${종류별})`} · 빠짐 ${String(셈.빠짐)}${가족글 === '' ? '' : ` · 번호 가족 ${가족글}`}`;
}

/** 머리글 경고 한 줄 — PR 본문이 길어지지 않게 앞 몇 개만. 전체 목록은 `대조` 에 있다 */
function 경고줄(이름: string, 목록: string[], 앞수: number, 머리 = '⚠️ '): string[] {
  if (목록.length === 0) return [];
  const 더 = 목록.length > 앞수 ? ' …' : '';
  return [`${머리}${이름} ${String(목록.length)} — ${목록.slice(0, 앞수).join(' · ')}${더}`];
}

/**
 * 에이전트의 올리기 판정. 메모리의 원장 · 올릴 트리의 표 · 트리의 케이스로 본다 — 자식의 말과 자식이 고친 사본을 안 믿는다.
 * 빠짐 · 형식 오류가 있어도 **거절하지 않는다** — 올리고 PR 본문 `머리글`(셈 줄 아래 경고 줄)에 적는다. `대조` 는 셈 재료다.
 * 거절하면 자식이 만든 케이스를 통째로 못 쓴다 (도메인/작성 §3.6 「★ 원장」, 2026-09-30 게이트 1). 원장 없음은 `없음` 에 까닭
 */
export function 원장판정(
  원장값: 원장 | { 없음: string },
  표글: string,
  있는케이스: Set<string>,
  // 기준 — 안 주면(옛 호출 · 검사) 칸 번호를 안 보고 머리글에도 안 싣는다
  기준?: 기준결정,
): { 머리글: string; 대조: 대조결과 } | { 머리글: string; 없음: string } {
  if ('없음' in 원장값) return { 머리글: `⚠️ 원장 없음 — ${원장값.없음}. 빠진 요구를 기계로 확인하지 못했다`, 없음: 원장값.없음 };
  const 결과 = 원장대조(원장값.항목, 표글, { 있는케이스, 에이전트: true, 사람이뺌: 기준?.사람이뺌, 다음요청: 기준?.다음요청, 칸재료: 기준?.칸재료 });
  const 못넣음 = 원장값.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${원장값.빠진자료.join(' · ')}` : '';
  // UI 로만 덮음은 경고가 아니라 보고다 — 원장은 그 요구가 동작 요구인지 모르므로 사람이 PR 에서 본다 (작성 §3.6 R19)
  const UI만줄 = 경고줄('UI 로만 덮음', 결과.UI만, 10, '');
  const 칸줄 = 기준 === undefined ? [] : 기준.칸재료 === null ? ['칸 번호 — 기준 표를 못 읽어 안 봤다'] : [...결과.칸알림, ...경고줄('칸 번호 어긋남', 결과.칸어긋남, 3)];
  const 줄들 = [`${셈글(결과.셈, 원장값.가족)}${못넣음}`, ...UI만줄, ...경고줄('빠짐', 결과.빠짐, 10), ...경고줄('형식 오류', 결과.형식오류, 3), ...칸줄];
  return { 머리글: 줄들.join('\n'), 대조: 결과 };
}
