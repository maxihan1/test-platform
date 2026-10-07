// 항목 상세 (SPEC §8.4). 증적 문서 PDF와 같은 레이아웃이어야 한다 (DESIGN.md)
// 스크린샷과 코드는 실패한 '검증 문장' 아래에 둔다. 스텝 헤더가 아니다 — 어느 확인에서 깨졌는지와 화면이 붙어야 의미가 있다

import { api, type RunItemDetail } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Step } from './ItemSteps.js';
import { fieldsOf, type Field } from './mask.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync, Verdict, when } from './ui.js';

export function ItemDetail({ runId, historyId }: { runId: number; historyId: number }) {
  const t말 = use말();
  const 언어 = use언어();
  const detail = useAsync<RunItemDetail>(() => api.item(runId, historyId), [runId, historyId]);
  const item = detail.data;

  if (detail.error !== null) return <Failed error={detail.error} />;
  if (item === null) return <Loading />;

  // 라벨도 마스킹도 항목에 박제된 스키마로 한다. 카탈로그를 읽으면 케이스 코드를 고친 날
  // 반년 전 증적의 라벨이 같이 바뀐다 (SPEC §3.3). 비밀값은 표시가 없어도 이름으로 가린다 (§4.1)
  const params = fieldsOf(item.params, item.paramSchema, 언어);
  // 증적 블록과 모양이 같아야 한다 (SPEC §8.4). 비어 박제된 칸은 fieldsOf 가 박제 스키마의 기본값으로 채운다
  const expected = fieldsOf(item.expected, item.expectedSchema, 언어);

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="case-tc">
            {item.tcId} · {t말('이력 {번호}', { 번호: item.historyId })} · {PLATFORM_LABEL[item.platform]}
          </div>
          <div className="case-name">{item.tcName}</div>
          <div className="runmeta">
            RUN {item.runId} {item.runTitle} · {when(item.finishedAt ?? item.startedAt, 언어)}
          </div>
        </div>
        <Verdict status={item.status} big />
      </div>

      {item.error === null ? null : (
        <div className="sec">
          <div className="sec-h">{t말('실행이 멈춘 사유')}</div>
          <div className="scan-error">{item.error.message}</div>
        </div>
      )}

      <div className="sec">
        <div className="sec-h">{t말('사전조건')}</div>
        {item.precondition.length === 0 ? (
          <p className="hint">{t말('선언된 사전조건이 없습니다.')}</p>
        ) : (
          item.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>

      <값칸 머리={t말('입력값')} 없음={t말('입력 없음')} 칸={params} />
      <값칸 머리={t말('기대결과')} 없음={t말('기대결과 없음')} 칸={expected} />

      <div className="sec">
        <div className="sec-h">{t말('시험 절차')}</div>
        {item.steps.length === 0 ? (
          <p className="hint">{t말('실행된 절차가 없습니다.')}</p>
        ) : (
          item.steps.map((step) => <Step key={step.seq} step={step} tcId={item.tcId} runId={item.runId} historyId={item.historyId} />)
        )}
      </div>

      <div className="actions">
        <span className="note">{t말('이 화면의 구성이 증적 문서에 그대로 출력됩니다.')}</span>
        <a className="btn ghost" href={`#/runs/${item.runId}`}>
          {t말('실행 결과')}
        </a>
        <a className="btn" href={`#/cases/${encodeURIComponent(item.tcId)}/run`}>
          {t말('값 바꿔 재실행')}
        </a>
      </div>
    </div>
  );
}

function 값칸({ 머리, 없음, 칸 }: { 머리: string; 없음: string; 칸: Field[] }) {
  return (
    <div className="sec">
      <div className="sec-h">{머리}</div>
      {칸.length === 0 ? (
        <p className="hint">{없음}</p>
      ) : (
        칸.map((field) => (
          <div className="field" key={field.key}>
            <label>{field.label}</label>
            <div className="val">{field.value}</div>
          </div>
        ))
      )}
    </div>
  );
}
