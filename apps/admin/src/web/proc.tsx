// 테스트 프로시저 화면이 같이 쓰는 판단과 작은 부품 — 판정 점과 글자 · 판정 점 줄 · Blocked 가르기 (DESIGN.md 「테스트 프로시저 · 목록 · 결과」 「판정」)
// 글자의 정본은 docs/WORDS.md 「판정과 테스트 프로시저 화면에서 쓰는 말」이다. 판정 글자는 영어 화면에서도 같다

import type { CaseRow, ItemStatus, LastResult } from './api.js';
import { keyOf, type LastMap } from './catalogView.js';
import { use말 } from './i18n.js';
import { STATUS_LABEL } from './ui.js';

type 결과 = Pick<LastResult, 'status' | 'blocked' | 'blockedBy'>;

/** Blocked 는 판정값이 아니라 Not tested 의 사유다. 드물게 막은 케이스 번호 없이 오는 줄이 있어 blocked 를 먼저 본다 (도메인/실행 §7) */
export const 막혔나 = (r: 결과 | undefined): boolean => r !== undefined && r.status === 'NA' && (r.blocked === true || r.blockedBy != null);

export type 점모양 = 'pass' | 'fail' | 'blocked' | 'na' | 'none';

/** 실행 기록이 없으면 none — 점선 원이다 */
export const 점모양of = (r: 결과 | undefined): 점모양 =>
  r === undefined ? 'none' : r.status === 'PASS' ? 'pass' : r.status === 'FAIL' ? 'fail' : 막혔나(r) ? 'blocked' : 'na';

/**
 * 케이스 한 줄의 대표 결과 — 디바이스 가운데 Fail 이 하나라도 있으면 그것이다(마지막판정과 같은 차례).
 * 프로시저는 앱 · 게임이라 디바이스가 하나지만 선언이 둘이어도 틀리지 않게 고른다
 */
export function 대표결과(row: CaseRow, 마지막: LastMap): LastResult | undefined {
  const 돈것 = row.platforms.flatMap((p) => 마지막[keyOf(row.tcId, p)] ?? []);
  return 돈것.find((r) => r.status === 'FAIL') ?? 돈것.find((r) => r.status === 'NA') ?? 돈것[0];
}

/** Pass 는 점과 글자로 조용하게, Fail 만 채운 배지다. 목록이 초록 배지로 차면 실패가 묻힌다 (2026-11-24 사용자 · 시안 5판) */
export function 판정표시({ 결과 }: { 결과: 결과 }) {
  const t = use말();
  if (결과.status === 'FAIL') return <span className="verdict v-fail">{t(STATUS_LABEL.FAIL)}</span>;
  if (결과.status === 'PASS') return <span className="vd vd-pass">{t(STATUS_LABEL.PASS)}</span>;
  if (막혔나(결과)) return <span className="vd vd-blocked">Blocked</span>;
  return <span className="vd vd-na">{t(STATUS_LABEL.NA)}</span>;
}

/** 프로시저의 케이스 판정을 실행 차례대로 점으로 — 어디서 흐름이 끊겼는지 헤더에서 읽힌다. 장식이라 읽어 주는 이름은 옆 글자가 맡는다 */
export function 판정점줄({ 결과들 }: { 결과들: readonly (결과 | undefined)[] }) {
  return (
    <span className="flow-dots" aria-hidden="true">
      {결과들.map((r, i) => (
        <i key={i} className={`fd-${점모양of(r)}`} />
      ))}
    </span>
  );
}

/**
 * Blocked 의 사유 한 줄. 막은 케이스가 그 실행에서 어떻게 끝났는지는 그 케이스의 마지막 결과가 같은 실행 것일 때만 안다 —
 * 실패면 「실패」, 판정 없이 끝났으면(kit 이 한도에서 끊었다) 「제한 시간 초과」다. 그 뒤에 다시 돌아 다른 실행 것이면 번호까지만 적는다(틀린 까닭을 적지 않는다).
 * 막은 케이스 번호가 없는 줄은 사유가 없다(null)
 */
export function use막힘사유(): (r: LastResult, 마지막: LastMap) => string | null {
  const 글 = use막힘사유글();
  return (r, 마지막) => {
    if (r.blockedBy == null) return null;
    const 막은 = 마지막[keyOf(r.blockedBy, r.platform)];
    return 글(r.blockedBy, 막은 === undefined || 막은.runId !== r.runId ? undefined : 막은.status);
  };
}

/**
 * 사유 글자 하나 — 막은 케이스가 같은 실행에서 어떻게 끝났는지 알 때만 까닭을 붙인다(모르면 undefined).
 * 실행 결과 · 항목 상세는 같은 실행의 항목에서, 케이스 목록 · 상세는 마지막 결과에서 그 판정을 찾아 넘긴다
 */
export function use막힘사유글(): (blockedBy: string, 막은판정: ItemStatus | undefined) => string {
  const t = use말();
  return (blockedBy, 막은판정) => {
    if (막은판정 === undefined || 막은판정 === 'PASS') return t('선행 케이스 {케이스}', { 케이스: blockedBy });
    return 막은판정 === 'NA' ? t('선행 케이스 {케이스} 제한 시간 초과', { 케이스: blockedBy }) : t('선행 케이스 {케이스} 실패', { 케이스: blockedBy });
  };
}
