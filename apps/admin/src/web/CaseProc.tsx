// 케이스 상세 칸의 「테스트 프로시저」 구획 — 이 케이스가 혼자 실행되지 않는다는 것을 맨 위에서 알린다 (도메인/카탈로그 §8.1 「상세 칸」 · DESIGN.md 「케이스 상세」)
// 같은 프로시저의 케이스는 서랍이 따로 받는다 — 다른 화면의 케이스 고리는 그 번호로 찾은 목록을 열어 받은 줄이 한 건뿐이다

import { useEffect, useState } from 'react';

import { api, type CaseRow } from './api.js';
import type { 상세기억 } from './caseDetailView.js';
import type { LastMap } from './catalogView.js';
import { use말 } from './i18n.js';
import { 대표결과, 판정표시 } from './proc.js';
import { 케이스서비스 } from './role.js';

/**
 * 같은 프로시저의 활성 케이스를 실행 차례대로. undefined 는 받는 중 · null 은 받기 실패 · 옛 꼴 케이스는 빈 배열이다.
 * 찾기(`?q=`)가 프로시저 번호에도 맞는다 — 이름에 그 번호가 든 다른 케이스가 걸릴 수 있어 번호로 한 번 더 거른다
 */
export function use같은프로시저(row: CaseRow, 기억: 상세기억): CaseRow[] | null | undefined {
  const [, set받음] = useState(0);
  const 번호 = row.isActive ? (row.procId ?? null) : null;
  const 서비스 = 케이스서비스(row.tcId);
  useEffect(() => {
    if (번호 === null || 서비스 === null || 기억.프로시저.has(번호)) return;
    let 살아있나 = true;
    void api
      .cases({ service: 서비스, q: 번호 })
      .then(
        (r): CaseRow[] | null => r.items.filter((c) => c.procId === 번호).sort((a, b) => (a.procSeq ?? 0) - (b.procSeq ?? 0)),
        () => null,
      )
      .then((줄들) => {
        기억.프로시저.set(번호, 줄들);
        if (살아있나) set받음((n) => n + 1);
      });
    return () => {
      살아있나 = false;
    };
  }, [번호, 서비스, 기억]);
  return 번호 === null ? [] : 기억.프로시저.get(번호);
}

export function 프로시저구획({ row, 같은, 마지막 }: { row: CaseRow; 같은: CaseRow[] | null | undefined; 마지막: LastMap }) {
  const t = use말();
  if (!row.isActive || row.procId == null) return null;
  return (
    <div className="dsec case-proc">
      <div className="dlabel">{t('테스트 프로시저')}</div>
      <p className="case-proc-line">
        <span className="mono case-proc-id">{row.procId}</span> {row.procName}
        {row.procSeq == null || row.procCount == null ? null : <span className="case-proc-seq">{t('{전체}건 중 {번째}번째', { 전체: row.procCount, 번째: row.procSeq })}</span>}
      </p>
      {같은 === undefined ? (
        <p className="hint">{t('불러오는 중입니다')}</p>
      ) : 같은 === null ? (
        <p className="hint">{t('같은 프로시저의 케이스를 불러오지 못했습니다')}</p>
      ) : (
        <ol className="case-proc-list">
          {같은.map((c) => {
            const 결과 = 대표결과(c, 마지막);
            return (
              <li key={c.tcId} className={c.tcId === row.tcId ? 'cur' : undefined} aria-current={c.tcId === row.tcId ? 'true' : undefined}>
                <span className="n mono">{c.procSeq}</span>
                <span className="mono id">{c.tcId}</span>
                <span className="t">{c.name}</span>
                {결과 === undefined ? <span className="device-none">{t('실행 기록 없음')}</span> : <판정표시 결과={결과} />}
              </li>
            );
          })}
        </ol>
      )}
      <p className="hint">{t('단독으로 실행할 수 없습니다. 프로시저 단위로 실행합니다')}</p>
    </div>
  );
}
