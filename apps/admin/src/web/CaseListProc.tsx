// 케이스 목록의 테스트 프로시저 묶음 — 헤더 한 줄 아래 케이스가 실행 차례대로 선다 (도메인/카탈로그 §8.1 「테스트 프로시저」 · DESIGN.md 「테스트 목록」)
// 차례는 서버가 정한다(같은 프로시저의 케이스를 붙여서 준다). 화면은 이웃한 줄끼리 프로시저가 바뀌는 곳에서 가를 뿐이다

import type { CaseRow, Platform, 앱종류 } from './api.js';
import { 케이스줄 } from './CaseListParts.js';
import type { LastMap } from './catalogView.js';
import { use말 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 종류 } from './kind.js';
import { 대표결과, 막혔나, 판정점줄 } from './proc.js';

/** 목록 상자의 클래스 — 디바이스가 하나인 종류(앱 · 게임 · API)는 결과 칸을 한 칸 폭으로 좁히고 남는 폭을 케이스명에 준다 (`caseList.css` `.dev-1`) */
export const 목록상자 = (kind: 앱종류 | undefined): string => (종류(kind).디바이스칩 ? 'rows-scroll case-rows' : 'rows-scroll case-rows dev-1');

export interface 프로시저묶음 {
  /** null 은 프로시저에 안 든 케이스(옛 꼴 · 웹 · API)다 — 한 건이 한 묶음이다 */
  procId: string | null;
  rows: CaseRow[];
}

/** 비활성 케이스는 헤더 아래에 안 선다 — 내려간 케이스는 지금 그 프로시저의 케이스가 아니다(procCount 가 null) */
export function 프로시저로묶기(rows: readonly CaseRow[]): 프로시저묶음[] {
  const 묶음들: 프로시저묶음[] = [];
  for (const row of rows) {
    const 앞 = 묶음들.at(-1);
    const id = row.isActive ? (row.procId ?? null) : null;
    if (id !== null && 앞 !== undefined && 앞.procId === id) 앞.rows.push(row);
    else 묶음들.push({ procId: id, rows: [row] });
  }
  return 묶음들;
}

/** 프로시저 헤더 줄 — 선택과 실행은 프로시저 단위다. rows 는 그 프로시저에서 지금 보이는 줄이다(조건을 걸면 일부만 온다) */
export function 프로시저머리({
  rows,
  마지막,
  고른수,
  on고르기,
  on실행,
  테스트만 = false,
}: {
  rows: CaseRow[];
  마지막: LastMap;
  고른수: number;
  on고르기: () => void;
  on실행?: () => void;
  테스트만?: boolean;
}) {
  const t = use말();
  const 첫 = rows[0]!;
  const 번호 = 첫.procId ?? '';
  const 결과들 = rows.map((r) => 대표결과(r, 마지막));
  const 실패 = 결과들.filter((r) => r?.status === 'FAIL').length;
  const 막힘 = 결과들.filter(막혔나).length;
  const 전체 = 첫.procCount ?? rows.length;
  return (
    <div className="row pickable case-line proc-head">
      <div className="gutter" />
      <label className="pick">
        <input
          type="checkbox"
          checked={고른수 === rows.length}
          // 일부만 선택된 프로시저는 가운데 줄이다 — 속성이 없어 요소에 직접 건다
          ref={(el) => {
            if (el !== null) el.indeterminate = 고른수 > 0 && 고른수 < rows.length;
          }}
          aria-label={t('{아이디} {이름} 케이스 {건수}건 선택', { 아이디: 번호, 이름: 첫.procName ?? '', 건수: rows.length })}
          onChange={on고르기}
        />
      </label>
      <div className="tcid">{번호}</div>
      <div className="title">
        <b className="proc-name">{첫.procName}</b>
        <판정점줄 결과들={결과들} />
        {/* 조건에 걸려 일부만 보이면 그만큼만 점을 찍고 몇 건 중 몇 건인지 적는다 */}
        <span className="proc-count">{rows.length < 전체 ? t('{전체}건 중 {건수}건', { 전체, 건수: rows.length }) : t('{건수}건', { 건수: rows.length })}</span>
        {실패 === 0 ? null : <span className="proc-count toc-fail">{t('Fail {건수}', { 건수: 실패 })}</span>}
        {막힘 === 0 ? null : <span className="proc-count">{t('Blocked {건수}', { 건수: 막힘 })}</span>}
      </div>
      <div className="right">
        {on실행 === undefined ? null : (
          <button type="button" className="btn ghost proc-run" aria-label={t(테스트만 ? '{프로시저} 시험 실행' : '{프로시저} 실행', { 프로시저: 번호 })} onClick={on실행}>
            <아이콘 이름="run" />
            {t(테스트만 ? '시험 실행' : '실행')}
          </button>
        )}
      </div>
    </div>
  );
}

/** 기능 묶음 덩어리 하나의 줄들 — 프로시저마다 헤더를 세우고 그 밖의 케이스는 지금처럼 줄마다 ▶ 가 선다 */
export function 덩어리줄들({
  rows,
  마지막,
  골랐나,
  뒤집기,
  열린,
  on실행,
  on묶음고르기,
  on묶음실행,
  테스트만,
  on열기,
  on스모크,
}: {
  rows: CaseRow[];
  마지막: LastMap;
  골랐나: (row: CaseRow) => boolean;
  뒤집기: (row: CaseRow, 사이: boolean) => void;
  열린: string | undefined;
  on실행?: (row: CaseRow, 디바이스: Platform) => void;
  on묶음고르기: (rows: CaseRow[]) => void;
  on묶음실행?: (rows: CaseRow[]) => void;
  테스트만: boolean;
  on열기: (tcId: string) => void;
  on스모크?: () => Promise<unknown>;
}) {
  return 프로시저로묶기(rows).map((묶음) => {
    const 줄들 = 묶음.rows.map((row) => (
      <케이스줄
        key={row.tcId}
        row={row}
        마지막={마지막}
        고름={골랐나(row)}
        뒤집기={뒤집기}
        열림={열린 === row.tcId}
        프로시저안={묶음.procId !== null}
        // 프로시저 안 케이스 줄에는 ▶ 가 없다 — 케이스 하나만 따로 실행하는 길이 없다 (도메인/실행 §3.2 「테스트 프로시저 실행」)
        on실행={묶음.procId === null ? on실행 : undefined}
        테스트만={테스트만}
        on열기={on열기}
        on스모크={on스모크}
      />
    ));
    if (묶음.procId === null) return 줄들;
    return (
      <div key={묶음.procId + ':' + 묶음.rows[0]!.tcId} className="proc-group">
        <프로시저머리
          rows={묶음.rows}
          마지막={마지막}
          고른수={묶음.rows.filter(골랐나).length}
          on고르기={() => on묶음고르기(묶음.rows)}
          on실행={on묶음실행 === undefined ? undefined : () => on묶음실행(묶음.rows)}
          테스트만={테스트만}
        />
        {줄들}
      </div>
    );
  });
}
