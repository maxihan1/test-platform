// 케이스 상세 상자 (SPEC §8.1, 2026-09-21 ② · 2026-09-22 에 펼침에서 상자로 · 2026-09-22 ② 입력값 직접 입력)
//
// **펼침을 그만둔 이유** — 줄 아래로 늘어나면 시선이 그대로라 눌러도 열렸다는 느낌이 없고,
// 긴 목록에서는 펴진 자리가 화면 밖으로 밀린다. 사람이 눌러서 여는 상자라
// 「가로막는 상자」가 아니다 (DESIGN.md 「모달」).
//
// §8.1 의 「케이스마다 이력을 따로 부르지 않는다」는 **목록**을 두고 한 말이다.
// 여기는 사람이 한 줄을 열었을 때 한 번 부르므로 그 규칙의 예외다 — 목록이 부르는 것이 아니다.
// **한 번 받은 것은 닫았다 열어도 다시 안 받는다.** 받아 둔 것은 목록(`CaseList`)이 들고 있어서
// 상자를 닫아도 남는다 — 상자가 들면 닫는 순간 같이 사라진다.
//
// **입력값은 읽기만 하던 표에서 줄과 같은 편집 칸(`Form`)으로 바꿨다 (2026-09-22 ②).**
// 줄에 넷까지만 보이고 「N개 더」를 누르면 여기가 열리는데, 읽기 전용 표만 있으면
// 넘친 값은 보이기만 하고 고칠 곳이 없었다. 줄이 쓰는 것과 같은 `채운글자`·`글자`·`on값` 을
// 그대로 받아써서 두 자리가 늘 같은 값을 보여준다.

import { useEffect, useState } from 'react';

import { api, type CaseRow, type HistoryRow, type LastResult, type RunItemDetail } from './api.js';
import { 채운글자, type 줄글자 } from './CaseRowParams.js';
import { Form } from './Form.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { schemaToFields } from './schema.js';
import { PLATFORM_LABEL, seconds, Verdict, when } from './ui.js';

interface 받은것 {
  이력: HistoryRow[] | null;
  절차: RunItemDetail | null;
}

// 이력이 null 이면 아직 안 받은 것이다. 둘을 한 번에 set 하므로 이 하나로 「받는 중」이 갈린다
const 아직 = (): 받은것 => ({ 이력: null, 절차: null });

export function CaseDetail({
  row,
  폈나,
  마지막,
  글자,
  onClose,
  on값,
}: {
  row: CaseRow;
  폈나: boolean;
  /** 마지막 결과. 있으면 그 실행의 절차를 가져온다. 없으면 절차를 아예 안 부른다 */
  마지막: LastResult | undefined;
  /** 줄에서 고쳐 넣은 값. 줄과 같은 표를 본다 (SPEC §8.1) */
  글자?: 줄글자;
  onClose: () => void;
  on값: (어디: 'params' | 'expected', key: string, value: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();
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
      set받은({ 이력: 이력.items, 절차 });
    })();

    return () => {
      살아있나 = false;
    };
  }, [폈나, row.tcId, 마지막, 받은.이력]);

  if (!폈나) return null;

  const 입력값 = schemaToFields(row.paramSchema);
  const 기대결과 = schemaToFields(row.expectedSchema);
  const 오류없음: Record<string, string> = {};

  return (
    <Modal
      제목={`${row.tcId} ${row.name}`}
      onClose={onClose}
      넓게
      버튼={<button className="btn" onClick={onClose}>{t('닫기')}</button>}
    >
    <div className="detail">
      {row.precondition.length === 0 ? null : (
        <div className="dsec">
          <div className="dlabel">{t('사전조건')}</div>
          <ol className="dlist">
            {row.precondition.map((줄) => (
              <li key={줄}>{줄}</li>
            ))}
          </ol>
        </div>
      )}

      {입력값.length === 0 && 기대결과.length === 0 ? null : (
        <div className="dsec dcols">
          {입력값.length === 0 ? null : (
            <div>
              <div className="dlabel">{t('입력값')}</div>
              <Form
                idPrefix={`detail-${row.tcId}-p`}
                fields={입력값}
                text={채운글자(입력값, 글자?.params)}
                errors={오류없음}
                onChange={(key, value) => { on값('params', key, value); }}
              />
            </div>
          )}
          {기대결과.length === 0 ? null : (
            <div>
              <div className="dlabel">{t('기대결과')}</div>
              <Form
                idPrefix={`detail-${row.tcId}-e`}
                fields={기대결과}
                text={채운글자(기대결과, 글자?.expected)}
                errors={오류없음}
                onChange={(key, value) => { on값('expected', key, value); }}
              />
            </div>
          )}
        </div>
      )}

      <div className="dsec">
        <div className="dlabel">
          {t('시험 절차')}
          {받은.절차 === null ? null : (
            <span className="dfrom">{t('{실행이름} 에서 가져왔다', { 실행이름: 받은.절차.runTitle })}</span>
          )}
        </div>
        {마지막 === undefined ? (
          <p className="hint">{t('아직 돌린 적이 없습니다. 한 번 돌리면 절차가 여기에 남습니다')}</p>
        ) : 받은.이력 !== null && 받은.절차 === null ? (
          <p className="hint">{t('절차를 불러오지 못했습니다')}</p>
        ) : 받은.절차 === null ? (
          <p className="hint">{t('절차를 불러오는 중입니다')}</p>
        ) : (
          <ol className="dsteps">
            {받은.절차.steps.map((단계) => (
              <li key={단계.seq}>
                <span className="n mono">{단계.seq}</span>
                <span className="t">{단계.title}</span>
                <Verdict status={단계.status} />
                <span className="d mono">{seconds(단계.durationMs, 언어)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="dsec">
        <div className="dlabel">
          {t('실행 이력')}
          <span className="dfrom">{t('최근 {건수}건', { 건수: 받은.이력?.length ?? 0 })}</span>
        </div>
        {받은.이력 === null ? (
          <p className="hint">{t('불러오는 중입니다')}</p>
        ) : 받은.이력.length === 0 ? (
          <p className="hint">{t('아직 기록이 없습니다')}</p>
        ) : (
          <table className="dhist">
            <tbody>
              {받은.이력.map((줄) => (
                <tr key={줄.historyId}>
                  <td>
                    <a href={`#/runs/${줄.runId}/items/${줄.historyId}`}>{줄.runTitle}</a>
                  </td>
                  <td>{t(PLATFORM_LABEL[줄.platform])}</td>
                  <td>
                    <Verdict status={줄.status} />
                  </td>
                  <td className="mono">{seconds(줄.durationMs, 언어)}</td>
                  <td className="mono">{when(줄.finishedAt, 언어)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </Modal>
  );
}
