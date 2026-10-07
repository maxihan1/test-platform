// 절차 · 확인 · 스크린샷 · 코드 뷰 그림 — 항목 상세와 실행 결과의 증거 카드가 같이 쓴다 (SPEC §8.4)

import { useState } from 'react';

import { api, type StepResult } from './api.js';
import { t, use말, use언어, type 언어 } from './i18n.js';
import { useAsync, Verdict } from './ui.js';

export const MARK = { PASS: '✓', FAIL: '✗', NA: '–' } as const;

export function show(value: unknown, 언어: 언어): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? t('예', 언어) : t('아니오', 언어);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface StepProps {
  step: StepResult;
  tcId: string;
  runId: number;
  historyId: number;
  // 카드에서는 코드를 상세에만 둔다 — 코드 뷰는 기본 노출하지 않는다 (SPEC §8.4)
  코드?: boolean;
  /** 같은 실패로 묶인 디바이스는 화면을 절차 밖에 디바이스마다 나란히 놓는다. 그때는 절차 안에서 뺀다 */
  화면?: boolean;
}

export function Step({ step, tcId, runId, historyId, 코드 = true, 화면 = true }: StepProps) {
  const t말 = use말();
  const 언어 = use언어();
  const firstFail = step.assertions.findIndex((assertion) => assertion.status === 'FAIL');
  // capture:true로 찍은 스크린샷은 실패가 없다. 그때는 절차 끝에 붙인다
  const evidenceAtEnd = firstFail === -1;

  const attachments = (
    <Attachments
      step={step}
      tcId={tcId}
      runId={runId}
      historyId={historyId}
      코드={코드}
      화면={화면}
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
            <span className="mark" style={{ color: `var(--${assertion.status === 'PASS' ? 'pass' : assertion.status === 'FAIL' ? 'fail' : 'na'}-text)` }}>
              {MARK[assertion.status]}
            </span>
            <span style={assertion.status === 'NA' ? { color: 'var(--ink-faint)' } : undefined}>
              {assertion.statement}
              {/* 이 문장이 뒤 절차를 멈추게 했다. 뒤가 왜 없는지 설명이 필요하다 (SPEC §8.4) */}
              {assertion.blocker === true && assertion.status === 'FAIL' ? (
                <span className="blocker">{t말('실행 중단§막음')}</span>
              ) : null}
            </span>
            <span className="exp">{t말('기대 {값}', { 값: show(assertion.expected, 언어) })}</span>
            <span className="act">
              {t말('실제')} <b>{show(assertion.actual, 언어)}</b>
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
  코드: boolean;
  화면: boolean;
  className?: string;
}

function Attachments({ step, tcId, runId, historyId, 코드, 화면, className }: AttachmentProps) {
  const t말 = use말();
  const hasTrace = 코드 && step.httpTrace !== undefined;
  const hasCode = 코드 && step.line !== undefined;
  const 사진 = 화면 && step.screenshotPath !== undefined;
  if (!사진 && !hasCode && !hasTrace) return null;

  return (
    <div className={className}>
      {!사진 ? null : (
        <div className="shot">
          <a href={api.screenshot(runId, historyId, step.seq)} target="_blank" rel="noreferrer">
            {/* 카드가 여러 장 한꺼번에 뜨므로 화면 밖 이미지는 늦게 읽는다 */}
            <img
              src={api.screenshot(runId, historyId, step.seq)}
              alt={t말('{절차} 실패 시점 화면', { 절차: step.title })}
              loading="lazy"
            />
          </a>
        </div>
      )}

      {/* API 케이스는 화면이 없다. 같은 자리에 요청·응답 원문을 남긴다 (SPEC §4) */}
      {!hasTrace ? null : (
        <details className="code">
          <summary>{t말('요청·응답 원문')}</summary>
          <pre>{JSON.stringify(step.httpTrace, null, 2)}</pre>
        </details>
      )}

      {!hasCode || step.line === undefined ? null : <CodeView tcId={tcId} line={step.line} />}
    </div>
  );
}

// 코드 뷰는 기본 접힘이다. 이 플랫폼의 전제가 "코드를 몰라도 쓴다"이므로 펼쳐야 보인다 (SPEC §8.4)
function CodeView({ tcId, line }: { tcId: string; line: number }) {
  const t말 = use말();
  const [opened, setOpened] = useState(false);
  const source = useAsync(() => (opened ? api.source(tcId, line) : Promise.resolve(null)), [opened, tcId, line]);

  return (
    <details className="code" onToggle={(e) => setOpened(e.currentTarget.open)}>
      <summary>{t말('실패 지점 코드')}</summary>
      {source.error !== null ? (
        <p className="hint" style={{ color: 'var(--fail-text)' }}>
          {source.error}
        </p>
      ) : source.data === null ? (
        <p className="hint">{t말('불러오는 중입니다.')}</p>
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
