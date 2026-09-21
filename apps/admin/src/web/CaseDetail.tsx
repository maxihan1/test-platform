// 케이스 줄 아래로 펼쳐지는 상세 (SPEC §8.1, 2026-09-21 ②)
//
// §8.1 의 「케이스마다 이력을 따로 부르지 않는다」는 **목록**을 두고 한 말이다.
// 여기는 사람이 한 줄을 폈을 때 한 번 부르므로 그 규칙의 예외다 — 목록이 부르는 것이 아니다.
// **한 번 받은 것은 접었다 펴도 다시 안 받는다.** 접을 때마다 버리면 예외가 위반으로 바뀐다.

import { useEffect, useState } from 'react';

import { api, type CaseRow, type HistoryRow, type LastResult, type RunItemDetail } from './api.js';
import { schemaToFields } from './schema.js';
import { PLATFORM_LABEL, seconds, Verdict, when } from './ui.js';

interface 받은것 {
  이력: HistoryRow[] | null;
  절차: RunItemDetail | null;
  절차실패: boolean;
}

const 아직 = (): 받은것 => ({ 이력: null, 절차: null, 절차실패: false });

/** 스키마가 준 라벨·타입·기본값 셋. **JSON 원문이 아니다** (DESIGN.md 「금지」) */
function 칸표({ 제목, schema }: { 제목: string; schema: CaseRow['paramSchema'] }) {
  const 칸들 = schemaToFields(schema);
  if (칸들.length === 0) return null;

  return (
    <div>
      <div className="dlabel">{제목}</div>
      <table className="dtab">
        <tbody>
          {칸들.map((칸) => (
            <tr key={칸.key}>
              <td className="k">{칸.label}</td>
              <td className="t">{칸.kind === 'number' ? '숫자' : 칸.kind === 'boolean' ? '예/아니오' : '글자'}</td>
              <td className="mono">
                {칸.secret ? '********' : 칸.default === undefined ? '—' : String(칸.default)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CaseDetail({
  row,
  폈나,
  마지막,
}: {
  row: CaseRow;
  폈나: boolean;
  /** 마지막 결과. 있으면 그 실행의 절차를 가져온다. 없으면 절차를 아예 안 부른다 */
  마지막: LastResult | undefined;
}) {
  const [받은, set받은] = useState<받은것>(아직);

  // 펼쳤을 때 한 번만 받는다. 접어도 버리지 않으므로 다시 펴도 왕복이 늘지 않는다
  useEffect(() => {
    if (!폈나 || 받은.이력 !== null) return;
    let 살아있나 = true;

    void (async () => {
      const 이력 = await api.caseHistory(row.tcId).catch(() => ({ items: [] as HistoryRow[] }));
      // 절차는 마지막 결과가 있을 때만 있다. 하나가 실패해도 나머지는 그린다
      const 절차 =
        마지막 === undefined ? null : await api.item(마지막.runId, 마지막.historyId).catch(() => null);
      if (!살아있나) return;
      set받은({ 이력: 이력.items, 절차, 절차실패: 마지막 !== undefined && 절차 === null });
    })();

    return () => {
      살아있나 = false;
    };
  }, [폈나, row.tcId, 마지막, 받은.이력]);

  if (!폈나) return null;

  return (
    <div className="detail">
      {row.precondition.length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">사전조건</div>
          <ol className="dlist">
            {row.precondition.map((줄) => (
              <li key={줄}>{줄}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="dsec dcols">
        <칸표 제목="입력값" schema={row.paramSchema} />
        <칸표 제목="기대결과" schema={row.expectedSchema} />
      </div>

      <div className="dsec">
        <div className="dlabel">
          시험 절차
          {받은.절차 === null ? null : <span className="dfrom">{받은.절차.runTitle} 에서 가져왔다</span>}
        </div>
        {마지막 === undefined ? (
          <p className="hint">아직 돌린 적이 없습니다. 한 번 돌리면 절차가 여기에 남습니다</p>
        ) : 받은.절차실패 ? (
          <p className="hint">절차를 불러오지 못했습니다</p>
        ) : 받은.절차 === null ? (
          <p className="hint">절차를 불러오는 중입니다</p>
        ) : (
          <ol className="dsteps">
            {받은.절차.steps.map((단계) => (
              <li key={단계.seq}>
                <span className="n mono">{단계.seq}</span>
                <span className="t">{단계.title}</span>
                <Verdict status={단계.status} />
                <span className="d mono">{seconds(단계.durationMs)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="dsec">
        <div className="dlabel">
          실행 이력<span className="dfrom">최근 {받은.이력?.length ?? 0}건</span>
        </div>
        {받은.이력 === null ? (
          <p className="hint">불러오는 중입니다</p>
        ) : 받은.이력.length === 0 ? (
          <p className="hint">아직 기록이 없습니다</p>
        ) : (
          <table className="dhist">
            <tbody>
              {받은.이력.map((줄) => (
                <tr key={줄.historyId}>
                  <td>
                    <a href={`#/runs/${줄.runId}/items/${줄.historyId}`}>{줄.runTitle}</a>
                  </td>
                  <td>{PLATFORM_LABEL[줄.platform]}</td>
                  <td>
                    <Verdict status={줄.status} />
                  </td>
                  <td className="mono">{seconds(줄.durationMs)}</td>
                  <td className="mono">{when(줄.finishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
