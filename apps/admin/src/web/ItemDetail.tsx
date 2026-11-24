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
import { 기대문장 } from './expectedLines.js';
import { fieldsOf, type Field } from './mask.js';
import { 케이스서비스 } from './role.js';
import { use막힘사유글 } from './proc.js';
import { 실행결과주소 } from './route.js';
import { 막힌항목 } from './runFlow.js';
import { 미실행사유 } from './runState.js';
import type { 판정하기 } from './runJudge.js';
import type { RunDetail } from './runProgress.js';
import { 한건인가 } from './RunSingleDone.js';
import { RunWindow } from './RunWindow.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync, Verdict, when } from './ui.js';

/** @param 판정하기 그 항목의 서비스 칸으로 「입력 값 수정 후 다시 실행」을 가른다 — 띠와 다른 서비스의 항목일 수 있다 */
export function ItemDetail({ runId, historyId, 판정하기 }: { runId: number; historyId: number; 판정하기: 판정하기 }) {
  const t말 = use말();
  const 언어 = use언어();
  const detail = useAsync<RunItemPage>(() => api.item(runId, historyId), [runId, historyId]);
  const item = detail.data;
  const [다시, set다시] = useState(false);
  // 같은 실행 — 프로시저의 건수 · 막은 케이스의 판정 · 한 건 실행인지를 찾는다. 윗줄(항목실행줄)이 읽은 것을 받아 쓴다
  const [실행, set실행] = useState<RunDetail | null>(null);
  // 다른 실행의 항목으로 옮긴 직후에는 앞 실행이 남아 있다 — 그 줄로 세면 건수가 틀린다
  const 항목들 = 실행?.runId === runId ? 실행.items : [];
  const 막힘사유글 = use막힘사유글();

  if (detail.error !== null) return <Failed error={detail.error} />;
  if (item === null) return <Loading />;

  // 라벨도 마스킹도 항목에 박제된 스키마로 한다. 카탈로그를 읽으면 케이스 코드를 고친 날
  // 반년 전 증적의 라벨이 같이 바뀐다 (SPEC §3.3). 비밀값은 표시가 없어도 이름으로 가린다 (§4.1)
  const params = fieldsOf(item.params, item.paramSchema, 언어);
  // 증적 블록과 모양이 같아야 한다 (SPEC §8.4). 비어 박제된 칸은 fieldsOf 가 박제 스키마의 기본값으로 채운다
  const expected = fieldsOf(item.expected, item.expectedSchema, 언어);
  const 막힘 = 막힌항목(item);
  // 다시 실행한 결과가 덮은 줄은 실행 단위 번호가 달라 번호로 세면 「2건 중 3번째」가 된다
  const 프로시저건수 = 항목들.filter((i) => i.procId != null && i.procId === item.procId && i.platform === item.platform && i.attempt === item.attempt).length;
  // 막은 케이스가 같은 실행 · 같은 디바이스 · 같은 회차에서 어떻게 끝났는지 알 때만 까닭을 붙인다
  const 막은항목 = 항목들.find((i) => i.tcId === item.blockedBy && i.platform === item.platform && i.attempt === item.attempt);
  const 막은판정 = 막은항목?.status;
  // 한 건 실행은 결과 화면이 없다 — 「실행 결과」는 보던 케이스를 짚어 보내고(그 주소가 붙은 실행이나 케이스 상세로 옮긴다) 막은 케이스는 같은 실행의 그 항목으로 간다 (도메인/실행 §7)
  const 한건 = 실행 !== null && 한건인가(실행);
  // 판정이 다 난 뒤 프로세스가 실패로 끝난 사유다. 러너에 못 보내고 닫은 사유는 케이스 줄 사유와 같은 글이라 한 번만 보인다 (도메인/실행 §3.2 「돌리기 · 저장」)
  const 단위오류 = item.execError == null || item.execError.message === item.error?.message ? null : item.execError;

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="case-tc">
            {item.tcId} · {PLATFORM_LABEL[item.platform]}
          </div>
          <div className="case-name">{item.tcName}</div>
          {item.procId == null ? null : (
            <div className="runmeta">
              <span className="mono">{item.procId}</span> {item.procName}
              {item.execSeq == null || 프로시저건수 === 0 ? null : <> · {t말('{전체}건 중 {번째}번째', { 전체: 프로시저건수, 번째: item.execSeq })}</>}
            </div>
          )}
          <div className="runmeta">
            RUN {item.runId} {item.runTitle} · {when(item.finishedAt ?? item.startedAt, 언어)}
          </div>
        </div>
        <Verdict status={item.status} blocked={막힘} big />
      </div>

      {/* 회차 · 이전/다음 실패 · 증적 · 관련 요구 · 판정 — 같은 실행의 다른 실패로 가는 길과 판정 자리가 항목 상세에도 있어야 한다 (점검 3.2 · 3.4) */}
      <항목실행줄 item={item} 판정하기={판정하기} on실행={set실행} />

      {/* 「실행이 멈춘 사유」는 실행 전체가 멈춘 것처럼 읽혔다. 이유는 유형과 한 줄, 러너 원문(최대 2천 자)은 접는다 (점검 3.1 · 3.6) */}
      {/* Blocked 는 실패가 아니다 — 고칠 것은 막은 케이스라 그 케이스로 가는 고리를 둔다 (DESIGN.md 「항목 상세」) */}
      {!막힘 ? null : (
        <div className="sec">
          <div className="sec-h">{t말('사유')}</div>
          <p>
            <b>Blocked</b>
            {item.blockedBy == null ? null : <> {막힘사유글(item.blockedBy, 막은판정)}</>}
          </p>
          {item.blockedBy == null ? null : (
            <p>
              <a href={한건 && 막은항목 !== undefined ? `#/runs/${String(item.runId)}/items/${String(막은항목.historyId)}` : 실행결과주소(item.runId, { 펼칠: item.blockedBy })}>{t말(막은판정 === 'FAIL' ? '{케이스} 실패 보기' : '{케이스} 결과 보기', { 케이스: item.blockedBy })}</a>
            </p>
          )}
        </div>
      )}
      {단위오류 === null ? null : (
        <div className="sec">
          <div className="sec-h">{t말('프로시저 실행 오류')}</div>
          <p>{미실행사유(단위오류, 언어)}</p>
          <원문보기 글={[단위오류.message, 단위오류.stack].filter(Boolean).join('\n\n')} />
        </div>
      )}
      {막힘 || (item.error === null && (item.failure ?? null) === null) ? null : (
        <div className="sec">
          <div className="sec-h">{t말('실패 이유')}</div>
          <실패이유 failure={item.failure} />
          {/* 멈춰 닫힌 미실행은 서버가 이유를 안 준다 — 미실행 사유(「사용자가 멈춤」 따위)를 적는다 */}
          {(item.failure ?? null) !== null || item.status !== 'NA' ? null : <p>{미실행사유(item.error, 언어)}</p>}
          <원문보기 글={item.error === null ? null : [item.error.message, item.error.stack].filter(Boolean).join('\n\n')} />
        </div>
      )}

      <div className="sec">
        <div className="sec-h">{t말('사전 조건')}</div>
        {item.precondition.length === 0 ? (
          <p className="hint">{t말('사전 조건 없음')}</p>
        ) : (
          item.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>

      <값칸 머리={t말('입력값')} 없음={t말('입력 없음')} 칸={params} />
      {/* 기대 결과는 케이스의 성공 조건이라 안 돈 항목에도 선다 — 확인 문장을 먼저 적고 값 칸은 그 아래다 (도메인/리포팅 §8.4 「기대 결과」) */}
      <값칸 머리={t말('기대 결과')} 없음={t말('기대 결과 없음')} 칸={expected} 문장={기대문장(item.verifyStatements, item.steps)} />

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
        <a className="btn ghost" href={실행결과주소(item.runId, 한건 ? { 펼칠: item.tcId } : {})}>
          {t말('실행 결과')}
        </a>
        {/* 이 항목에서 쓴 값으로 실행 창을 연다. 비밀값 칸은 응답이 가려 주므로 비워서 연다 (도메인/실행 §8.10) */}
        {!판정하기(케이스서비스(item.tcId))('실행') ? null : (
          <button className="btn" onClick={() => set다시(true)}>
            {t말('입력값 수정 후 다시 실행')}
          </button>
        )}
      </div>
      {!다시 ? null : (
        <RunWindow
          tcIds={[item.tcId]}
          지난값={{ [item.tcId]: { params: item.params, expected: item.expected } }}
          위치실행={item.runId}
          onClose={() => set다시(false)}
        />
      )}
    </div>
  );
}

function 값칸({ 머리, 없음, 칸, 문장 = [] }: { 머리: string; 없음: string; 칸: Field[]; 문장?: string[] }) {
  return (
    <div className="sec">
      <div className="sec-h">{머리}</div>
      {문장.map((줄) => (
        <div className="pre" key={줄}>
          {줄}
        </div>
      ))}
      {칸.length === 0 ? (
        문장.length > 0 ? null : <p className="hint">{없음}</p>
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
