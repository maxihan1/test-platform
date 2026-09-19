// 항목 상세 (SPEC §8.4). 증적 문서 PDF와 같은 레이아웃이어야 한다 (DESIGN.md)
// 스크린샷과 코드는 실패한 '검증 문장' 아래에 둔다. 스텝 헤더가 아니다 — 어느 확인에서 깨졌는지와 화면이 붙어야 의미가 있다

import { useState } from 'react';

import { api, type RunItemDetail, type StepResult } from './api.js';
import { fieldsOf } from './mask.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync, Verdict, when } from './ui.js';

const MARK = { PASS: '✓', FAIL: '✗', NA: '–' } as const;

function show(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ItemDetail({ runId, historyId }: { runId: number; historyId: number }) {
  const detail = useAsync<RunItemDetail>(() => api.item(runId, historyId), [runId, historyId]);
  const item = detail.data;

  if (detail.error !== null) return <Failed error={detail.error} />;
  if (item === null) return <Loading />;

  // 라벨도 마스킹도 항목에 박제된 스키마로 한다. 카탈로그를 읽으면 케이스 코드를 고친 날
  // 반년 전 증적의 라벨이 같이 바뀐다 (SPEC §3.3). 비밀값은 표시가 없어도 이름으로 가린다 (§4.1)
  const params = fieldsOf(item.params, item.paramSchema);

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="case-tc">
            {item.tcId} · 이력 {item.historyId} · {PLATFORM_LABEL[item.platform]}
          </div>
          <div className="case-name">{item.tcName}</div>
          <div className="runmeta">
            RUN {item.runId} {item.runTitle} · {when(item.finishedAt ?? item.startedAt)}
          </div>
        </div>
        <Verdict status={item.status} big />
      </div>

      {item.error === null ? null : (
        <div className="sec">
          <div className="sec-h">실행이 멈춘 사유</div>
          <div className="scan-error">{item.error.message}</div>
        </div>
      )}

      <div className="sec">
        <div className="sec-h">사전조건</div>
        {item.precondition.length === 0 ? (
          <p className="hint">선언된 사전조건이 없습니다.</p>
        ) : (
          item.precondition.map((line) => (
            <div className="pre" key={line}>
              {line}
            </div>
          ))
        )}
      </div>

      <div className="sec">
        <div className="sec-h">입력값</div>
        {params.length === 0 ? (
          <p className="hint">입력 없음</p>
        ) : (
          params.map((field) => (
            <div className="field" key={field.key}>
              <label>{field.label}</label>
              <div className="val">{field.value}</div>
            </div>
          ))
        )}
      </div>

      <div className="sec">
        <div className="sec-h">시험 절차</div>
        {item.steps.length === 0 ? (
          <p className="hint">실행된 절차가 없습니다.</p>
        ) : (
          item.steps.map((step) => <Step key={step.seq} step={step} item={item} />)
        )}
      </div>

      <div className="actions">
        <span className="note">이 화면의 구성이 증적 문서에 그대로 출력됩니다.</span>
        <a className="btn ghost" href={`#/runs/${item.runId}`}>
          실행 결과로 돌아가기
        </a>
        <a className="btn" href={`#/cases/${encodeURIComponent(item.tcId)}/run`}>
          값을 바꿔 다시 실행
        </a>
      </div>
    </div>
  );
}

function Step({ step, item }: { step: StepResult; item: RunItemDetail }) {
  const firstFail = step.assertions.findIndex((assertion) => assertion.status === 'FAIL');
  // capture:true로 찍은 스크린샷은 실패가 없다. 그때는 절차 끝에 붙인다
  const evidenceAtEnd = firstFail === -1;

  const attachments = (
    <Attachments
      step={step}
      tcId={item.tcId}
      runId={item.runId}
      historyId={item.historyId}
      className={evidenceAtEnd ? undefined : 'after-assert'}
    />
  );

  return (
    <div className="step">
      <div className="step-h">
        <span className="step-n">{step.seq}</span>
        <span className="step-t">{step.title}</span>
        <span className="dur">{step.durationMs}ms</span>
        <Verdict status={step.status} />
      </div>

      {step.assertions.map((assertion, index) => (
        <div key={`${assertion.statement}-${index}`}>
          <div className={assertion.status === 'FAIL' ? 'assert bad' : 'assert'}>
            <span className="mark" style={{ color: `var(--${assertion.status === 'PASS' ? 'pass' : assertion.status === 'FAIL' ? 'fail' : 'na'})` }}>
              {MARK[assertion.status]}
            </span>
            <span style={assertion.status === 'NA' ? { color: 'var(--ink-faint)' } : undefined}>
              {assertion.statement}
              {/* 이 문장이 뒤 절차를 멈추게 했다. 뒤가 왜 없는지 설명이 필요하다 (SPEC §8.4) */}
              {assertion.blocker === true && assertion.status === 'FAIL' ? (
                <span className="blocker">실행 중단</span>
              ) : null}
            </span>
            <span className="exp">기대 {show(assertion.expected)}</span>
            <span className="act">
              실제 <b>{show(assertion.actual)}</b>
            </span>
          </div>
          {index === firstFail ? attachments : null}
        </div>
      ))}

      {evidenceAtEnd ? attachments : null}
    </div>
  );
}

interface AttachmentProps {
  step: StepResult;
  tcId: string;
  runId: number;
  historyId: number;
  className?: string;
}

function Attachments({ step, tcId, runId, historyId, className }: AttachmentProps) {
  const hasTrace = step.httpTrace !== undefined;
  if (step.screenshotPath === undefined && step.line === undefined && !hasTrace) return null;

  return (
    <div className={className}>
      {step.screenshotPath === undefined ? null : (
        <div className="shot">
          <a href={api.screenshot(runId, historyId, step.seq)} target="_blank" rel="noreferrer">
            <img src={api.screenshot(runId, historyId, step.seq)} alt={`${step.title} 실패 시점 화면`} />
          </a>
        </div>
      )}

      {/* API 케이스는 화면이 없다. 같은 자리에 요청·응답 원문을 남긴다 (SPEC §4) */}
      {!hasTrace ? null : (
        <details className="code">
          <summary>요청·응답 원문</summary>
          <pre>{JSON.stringify(step.httpTrace, null, 2)}</pre>
        </details>
      )}

      {step.line === undefined ? null : <CodeView tcId={tcId} line={step.line} />}
    </div>
  );
}

// 코드 뷰는 기본 접힘이다. 이 플랫폼의 전제가 "코드를 몰라도 쓴다"이므로 펼쳐야 보인다 (SPEC §8.4)
function CodeView({ tcId, line }: { tcId: string; line: number }) {
  const [opened, setOpened] = useState(false);
  const source = useAsync(() => (opened ? api.source(tcId, line) : Promise.resolve(null)), [opened, tcId, line]);

  return (
    <details className="code" onToggle={(e) => setOpened(e.currentTarget.open)}>
      <summary>실패 지점 코드</summary>
      {source.error !== null ? (
        <p className="hint" style={{ color: 'var(--fail)' }}>
          {source.error}
        </p>
      ) : source.data === null ? (
        <p className="hint">불러오는 중입니다.</p>
      ) : (
        <pre>
          {source.data.lines.map((row) => (
            <span key={row.no} className={row.no === source.data!.focus ? 'focus' : undefined}>
              <span className="no">{String(row.no).padStart(3, ' ')}</span>
              {row.text}
              {'\n'}
            </span>
          ))}
        </pre>
      )}
    </details>
  );
}
