// QA 리포트 첫 장 뒤 종류별 구획의 글 — 기능 = 요구사항 추적표 · UI = 화면별 · E2E = 흐름 한 줄 · 「비기능 검증」 구분 머리 (도메인/리포팅 §3.17 「종류별 구획」)
// 케이스 카드(HTML · PDF)와 케이스 목록 표(워드)는 이 머리 뒤에 형식마다 붙는다

import type { EvidenceItem } from './collect.js';
import type { E2E단계, E2E증적 } from './collectScenario.js';
import type { 문서재료 } from './qaReportDoc.js';
import { 결과글, 디바이스이름, 종류이름, 품질특성, type 덩이, type 표줄 } from './qaReportText.js';

export interface 구획 {
  머리: 덩이[];
  /** 이 머리 뒤에 붙일 케이스 카드 · 목록의 종류 */
  케이스?: 'FN' | 'UI';
  /** E2E — 시나리오마다 흐름 한 줄 뒤에 그 시나리오의 단계 */
  시나리오?: { 머리: 덩이[]; doc: E2E증적 }[];
}

const 실행없음: 덩이 = { 꼴: '글', 글: '실행한 케이스 없음' };
const 판정말 = { PASS: '통과', FAIL: '실패', NA: '미실행', NOT_RUN: '미실행' } as const;

// 화면 결과 줄의 거터 색과 같은 규칙이다 — 하나라도 실패면 실패, 전부 통과면 통과, 나머지 미실행 (web/RunResultRow.tsx worst)
function 가장나쁜(items: EvidenceItem[]): EvidenceItem['status'] {
  if (items.some((i) => i.status === 'FAIL')) return 'FAIL';
  return items.length > 0 && items.every((i) => i.status === 'PASS') ? 'PASS' : 'NA';
}

/** 케이스마다 (번호, 이름, 판정) — 번호 차례. 로캘을 못박아 서버마다 차례가 갈리지 않게 한다 */
function 케이스판정(items: EvidenceItem[]): { tcId: string; name: string; 판정: string }[] {
  const 표 = new Map<string, EvidenceItem[]>();
  for (const i of items) 표.set(i.tcId, [...(표.get(i.tcId) ?? []), i]);
  return [...표]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([tcId, 들]) => ({ tcId, name: 들[0]!.tcName, 판정: 판정말[가장나쁜(들)] }));
}

/** 워드의 케이스 목록 — 케이스 × 디바이스 한 줄. 회차는 접고 사유는 처음 나온 것 */
export function 케이스목록(items: EvidenceItem[]): 덩이 {
  const 표 = new Map<string, EvidenceItem[]>();
  for (const i of items) 표.set(`${i.tcId}\u0000${i.platform}`, [...(표.get(`${i.tcId}\u0000${i.platform}`) ?? []), i]);
  const 줄: 표줄[] = [...표.values()]
    .sort((a, b) => a[0]!.tcId.localeCompare(b[0]!.tcId, 'en') || a[0]!.platform.localeCompare(b[0]!.platform, 'en'))
    .map((들) => ({
      칸: [`${들[0]!.tcId} ${들[0]!.tcName}`, 디바이스이름[들[0]!.platform] ?? 들[0]!.platform, 판정말[가장나쁜(들)], 들.find((i) => i.notRunReason !== null)?.notRunReason ?? '—'],
    }));
  return 줄.length === 0 ? 실행없음 : { 꼴: '표', 머리: ['케이스', '디바이스', '판정', '사유'], 줄, 판정칸: 2 };
}

function 요구사항추적표(재료: 문서재료, items: EvidenceItem[]): 덩이[] {
  if (items.length === 0) return [{ 꼴: '소절', 글: '요구사항 추적표' }, 실행없음];
  const 판정 = new Map(케이스판정(items).map((c) => [c.tcId, c]));
  const 걸린 = new Set<string>();
  const 줄: 표줄[] = 재료.요구.flatMap((r) => {
    const 덮음 = r.tcIds.filter((t) => 판정.has(t));
    if (덮음.length === 0) return [];
    for (const t of 덮음) 걸린.add(t);
    return [{ 칸: [r.reqId, r.text ?? 'PRD 에 없음', 덮음.map((t) => `${t} ${판정.get(t)!.판정}`).join('\n')] }];
  });
  const 안걸린 = [...판정.values()].filter((c) => !걸린.has(c.tcId));
  if (안걸린.length > 0) 줄.push({ 칸: ['—', '요구사항에 안 걸린 케이스', 안걸린.map((c) => `${c.tcId} ${c.판정}`).join('\n')] });
  return [
    { 꼴: '소절', 글: '요구사항 추적표' },
    { 꼴: '표', 머리: ['요구사항', '문장', '케이스 판정'], 줄, 판정칸: 2 },
    { 꼴: '글', 글: '요구사항 연결은 문서를 받은 때의 지도 기준이다', 결: '흐림' },
  ];
}

function 화면별(재료: 문서재료, items: EvidenceItem[]): 덩이[] {
  if (items.length === 0) return [{ 꼴: '소절', 글: '화면별' }, 실행없음];
  const 화면 = new Map<string, string[]>();
  for (const c of 케이스판정(items)) {
    // 화면 파일 둘이 같은 주소를 가리켜도 케이스는 그 화면에 한 번만 선다
    for (const 곳 of new Set(재료.화면.get(c.tcId) ?? ['화면 기록 없음'])) 화면.set(곳, [...(화면.get(곳) ?? []), `${c.tcId} ${c.판정}`]);
  }
  return [
    { 꼴: '소절', 글: '화면별' },
    { 꼴: '표', 머리: ['화면', '케이스 판정'], 줄: [...화면].map(([곳, 줄]) => ({ 칸: [곳, 줄.join('\n')] })), 판정칸: 1 },
  ];
}

// 결과 화면의 단계 줄 끝과 같다 — 모킹 켜기 · 끄기는 「적용됨」, 안 돈 단계는 「실행 안 함」 (htmlScenario.ts 끝)
function 단계판정(d: E2E단계): string {
  if (d.적용됨) return '적용됨';
  if (d.안돌았다) return '실행 안 함';
  return 판정말[d.status];
}

const 단계이름 = (d: E2E단계): string => (d.item === null ? d.종류 : d.item.tcName);

/** 흐름 한 줄 그림 — 「1 로그인 통과 → 2 장바구니 실패 → 3 결제 실행 안 함」 */
export function 흐름(doc: E2E증적): 덩이 {
  return { 꼴: '흐름', 단계: doc.parts.map((d) => ({ 글: `${d.seq} ${단계이름(d)}`, 판정: 단계판정(d) })) };
}

/** 워드의 E2E 단계 표 — HTML 은 증적 단계 카드를 그대로 쓴다 */
export function 단계목록(doc: E2E증적): 덩이 {
  return { 꼴: '표', 머리: ['단계', '종류', '내용', '판정'], 줄: doc.parts.map((d) => ({ 칸: [String(d.seq), d.종류, d.item === null ? d.요약 : `${d.item.tcId} ${d.item.tcName}`, 단계판정(d)] })) };
}

/** 기능 · UI · E2E → 「비기능 검증」 구분 → 호환성 · 성능 · 안정화. 그 묶음에 든 종류만 선다 */
export function 구획들(재료: 문서재료): 구획[] {
  const { summary } = 재료.리포트;
  const 종류항목 = (k: 'FN' | 'UI') => 재료.항목.filter((i) => 재료.종류.get(i.tcId) === k);
  const 구획: 구획[] = [];
  for (const k of ['FN', 'UI'] as const) {
    if (!summary.kinds.includes(k)) continue;
    const items = 종류항목(k);
    구획.push({ 머리: [{ 꼴: '절', 글: 종류이름[k] }, ...(k === 'FN' ? 요구사항추적표(재료, items) : 화면별(재료, items))], 케이스: k });
  }
  if (summary.kinds.includes('E2E')) {
    구획.push({
      머리: [{ 꼴: '절', 글: 'E2E' }, ...(재료.시나리오.length === 0 ? [{ 꼴: '글', 글: '이번 빌드에 실행 없음' } as const] : [])],
      시나리오: 재료.시나리오.map((doc) => ({
        머리: [
          { 꼴: '소절', 글: `SC-${doc.scenarioId} ${doc.header.title}` },
          흐름(doc),
        ],
        doc,
      })),
    });
  }
  // 비기능 — 돈 종류(호환성 · 성능)와 늘 서는 안정화. 구획 안 격자 · 목표 표 · 오류 종류는 QAR-F1-06 이 채운다
  const 비기능 = summary.results.nonFunctional.filter((x) => x.kind === 'STAB' || summary.kinds.includes(x.kind));
  if (비기능.length > 0) {
    구획.push({
      머리: [
        { 꼴: '절', 글: '비기능 검증' },
        ...비기능.flatMap((x): 덩이[] => [
          { 꼴: '소절', 글: `${x.kind === 'STAB' ? '안정화 · 오류 종류' : 종류이름[x.kind]} — ${품질특성[x.quality]}` },
          { 꼴: '글', 글: 결과글(x) },
        ]),
      ],
    });
  }
  return 구획;
}
