// 학습 세션 인수인계 — 컨텍스트 60% 에서 바뀐 다음 세션 맨 위에 기계가 모은 것을 둔다: 가장 멀리 간 곳 · 최근 회고 셋 · 지금 계획 · 열린 물음과 안 간 곳 · 게임 지금 상태 (도메인/게임 §3.10 「인수인계」)
// 쪽지 하나에 다 적게 했더니 절반은 기계가 더 정확히 아는 것이었다(2026-11-26 다섯 번째 실측) — 쪽지에는 AI 의 짐작과 믿지 말 것만 남긴다
import type { 지도줄 } from './authoring-game-find.js';
import { 열린물음 } from './authoring-game-tree.js';
import { type 판기록, 나아감 } from './authoring-learn-check.js';
import { 회고줄들 } from './authoring-learn-retro.js';
import { 목록글, 자름 } from './authoring-learn-map.js';

const 회고수 = 3;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 칸 = (x: 지도줄 | undefined): Record<string, unknown> => 객체(x?.learned?.data);
const 한칸 = (글: string): string => 글.replace(/\s+/g, ' ').trim();

/** 프롬프트에 싣는 인수인계 줄 — 회고 줄이 하나도 없으면(계획으로 해 본 적이 없으면) 빈 목록 */
export function 인수인계(지도: { 줄들: 지도줄[] }, 기록들: readonly 판기록[], 오늘: string, 빌드?: string): string[] {
  const 회고 = 회고줄들(지도.줄들) as 지도줄[];
  if (회고.length === 0) return [];
  const 가장 = 회고.reduce<지도줄 | null>((m, x) => (typeof 칸(x).나아감 === 'number' && (m === null || (칸(x).나아감 as number) > (칸(m).나아감 as number)) ? x : m), null);
  const 회고글 = (x: 지도줄): string => {
    const d = 칸(x);
    const 목표 = 객체(d.목표);
    const 어 = 객체(d.어긋남);
    return `  - ${x.key} · 계획 ${String(d.계획 ?? '?')} · 목표 ${String(목표.값 ?? '?')} ${String(목표.기준 ?? '?')} 에 ${String(목표.닿은 ?? '못 읽음')}까지${Object.keys(어).length === 0 ? '' : ` · ${String(어.초 ?? '?')}초에 어긋남(${String(어.값이름)} ${String(어.값)} · 기대 ${String(어.기대)})`} · 까닭 ${String(d.까닭)}${typeof d.열쇠 === 'string' ? `(${d.열쇠})` : ''} — ${자름(한칸(x.learned!.text), 160)}`;
  };
  const 다음 = 칸(회고.at(-1)).다음;
  const 계획 = typeof 다음 === 'string' ? 지도.줄들.find((x) => x.key === 다음 && x.learned !== null) : undefined;
  const 열린 = 열린물음(지도 as Parameters<typeof 열린물음>[0], 오늘, 빌드).map((x) => x.key);
  const 안간 = 지도.줄들.filter((x) => x.kind === 'STAGE' && x.learned !== null && x.learned.belief !== 'OVERTURNED' && 칸(x).상태 !== '가봄' && 칸(x).상태 !== '못감').map((x) => x.key);
  const 마지막 = [...기록들].reverse().find((r) => r.값기록 !== undefined && r.값기록.때.length > 0);
  const 끝값 = 마지막?.값기록?.때.at(-1)?.값;
  return [
    `- 가장 멀리 간 것: ${가장 === null ? '나아감을 못 읽음' : `${나아감} ${String(칸(가장).나아감)} — ${가장.key}(계획 ${String(칸(가장).계획)}). 그때 쓴 함수는 기록 이름 뒤쪽이다`}`,
    `- 최근 회고 ${Math.min(회고수, 회고.length)}개 (전체 ${회고.length})`,
    ...회고.slice(-회고수).map(회고글),
    `- 지금 계획: ${계획 === undefined ? '마지막 회고의 다음 계획을 못 찾음' : `${계획.key} — ${자름(한칸(계획.learned!.text), 200)}`}`,
    `- 열린 물음 ${열린.length}: ${목록글(열린, 15) || '없음'}`,
    `- 아직 안 간 곳 ${안간.length}: ${목록글(안간, 15) || '없음'}`,
    ...(마지막 === undefined || 끝값 === undefined ? [] : [`- 게임 지금 상태(${마지막.이름} 끝): ${Object.entries(끝값).map(([k, v]) => `${k} ${v ?? '못 읽음'}`).join(' · ')} — 화면부터 보고 잇는다`]),
  ];
}
