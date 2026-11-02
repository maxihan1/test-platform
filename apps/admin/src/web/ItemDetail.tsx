// 항목 상세 (SPEC §8.4). 증적 문서 PDF와 같은 레이아웃이어야 한다 (DESIGN.md)
// 스크린샷과 코드는 실패한 '검증 문장' 아래에 둔다. 스텝 헤더가 아니다 — 어느 확인에서 깨졌는지와 화면이 붙어야 의미가 있다

import { useState } from 'react';

import { api, type RunItemPage } from './api.js';
import { 통과영상, 팜증적 } from './FarmEvidence.js';
import { 원문보기, 실패이유 } from './FailureWhy.js';
import { use말, use언어 } from './i18n.js';
import { 항목실행줄 } from './ItemRunContext.js';
import { Step } from './ItemSteps.js';
import { ItemTraceSection } from './ItemTrace.js';
import { fieldsOf, type Field } from './mask.js';
import { 케이스서비스 } from './role.js';
import { 실행기록주소 } from './route.js';
import { 미실행사유 } from './runState.js';
import type { 판정하기 } from './runJudge.js';
import { RunWindow } from './RunWindow.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync, Verdict, when } from './ui.js';

/** @param 판정하기 그 항목의 서비스 칸으로 「값 바꿔 재실행」을 가른다 — 띠와 다른 서비스의 항목일 수 있다 */
export function ItemDetail({ runId, historyId, 판정하기 }: { runId: number; historyId: number; 판정하기: 판정하기 }) {
  const t말 = use말();
  const 언어 = use언어();
  const detail = useAsync<RunItemPage>(() => api.item(runId, historyId), [runId, historyId]);
  const item = detail.data;
  const [다시, set다시] = useState(false);

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
            {item.tcId} · {PLATFORM_LABEL[item.platform]}
          </div>
          <div className="case-name">{item.tcName}</div>
          <div className="runmeta">
            RUN {item.runId} {item.runTitle} · {when(item.finishedAt ?? item.startedAt, 언어)}
          </div>
        </div>
        <Verdict status={item.status} big />
      </div>

      {/* 회차 · 이전/다음 실패 · 증적 · 관련 요구 · 판정 — 같은 실행의 다른 실패로 가는 길과 판정 자리가 항목 상세에도 있어야 한다 (점검 3.2 · 3.4) */}
      <항목실행줄 item={item} 판정하기={판정하기} />

      {/* 「실행이 멈춘 사유」는 실행 전체가 멈춘 것처럼 읽혔다. 이유는 유형과 한 줄, 러너 원문(최대 2천 자)은 접는다 (점검 3.1 · 3.6) */}
      {item.error === null && (item.failure ?? null) === null ? null : (
        <div className="sec">
          <div className="sec-h">{t말('실패 이유')}</div>
          <실패이유 failure={item.failure} />
          {/* 멈춰 닫힌 미실행은 서버가 이유를 안 준다 — 미실행 사유(「사용자가 멈춤」 따위)를 적는다 */}
          {(item.failure ?? null) !== null || item.status !== 'NA' ? null : <p>{미실행사유(item.error, 언어)}</p>}
          <원문보기 글={item.error === null ? null : [item.error.message, item.error.stack].filter(Boolean).join('\n\n')} />
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

      <팜증적 주소={(name) => api.farmFile(item.runId, item.historyId, name)} files={item.farm} />
      {/* 통과한 앱 항목은 영상을 받아 두지 않는다 — 누르면 팜에서 가져온다 (도메인/게임 §3.10 「실행 결과」) */}
      {item.platform === 'android' && item.status === 'PASS' && item.farm.length === 0 ? <통과영상 runId={item.runId} historyId={item.historyId} /> : null}
      <ItemTraceSection trace={item.trace} />

      <div className="actions">
        <span className="note">{t말('이 화면의 구성이 리포트에 그대로 출력됩니다.')}</span>
        {/* 실행 기록에서 그 실행을 고른 채 연다 — 결과 화면을 새로 열면 목록으로 돌아갈 길이 없다 (도메인/실행 §8.7 「A안」) */}
        <a className="btn ghost" href={실행기록주소(item.tcId, item.runId)}>
          {t말('실행 결과')}
        </a>
        {/* 이 항목에서 쓴 값으로 실행 창을 연다. 비밀값 칸은 응답이 가려 주므로 비워서 연다 (도메인/실행 §8.10) */}
        {!판정하기(케이스서비스(item.tcId))('실행') ? null : (
          <button className="btn" onClick={() => set다시(true)}>
            {t말('입력 값 수정 후 다시 실행')}
          </button>
        )}
      </div>
      {!다시 ? null : (
        <RunWindow
          tcIds={[item.tcId]}
          지난값={{ [item.tcId]: { params: item.params, expected: item.expected } }}
          onClose={() => set다시(false)}
        />
      )}
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
