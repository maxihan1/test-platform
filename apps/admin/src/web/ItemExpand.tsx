// 항목 상세의 사전조건 · 입력 · 절차를 그리는 본문과, 한 줄을 펼쳐 그것을 불러오는 부품 (실행 §8.3 실패 카드 · 통과 줄)

import { useState, type ReactNode } from 'react';

import { api, type Platform, type RunItemDetail } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Step } from './ItemSteps.js';
import { fieldsOf } from './mask.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync } from './ui.js';

/**
 * 라벨도 마스킹도 항목에 박제된 스키마로 한다 — 카탈로그를 읽으면 케이스 코드를 고친 날 옛 증적의 라벨이 바뀐다.
 * 코드 뷰는 상세에만 둔다 (`코드={false}`).
 */
export function 증거본문({ item }: { item: RunItemDetail }) {
  const t = use말();
  const 언어 = use언어();
  const 입력 = fieldsOf(item.params, item.paramSchema, 언어);

  return (
    <div className="fc-body">
      <div className="fc-sec">
        <span className="fc-k">{t('사전조건')}</span>
        {item.precondition.length === 0 ? (
          <span className="fc-faint">{t('선언된 사전조건이 없습니다.')}</span>
        ) : (
          <ul className="fc-list">
            {item.precondition.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="fc-sec">
        <span className="fc-k">{t('입력값')}</span>
        {입력.length === 0 ? (
          <span className="fc-faint">{t('입력 없음')}</span>
        ) : (
          입력.map((field) => (
            <span key={field.key} className="fc-kv">
              <label>{field.label}</label>
              <span>{field.value}</span>
            </span>
          ))
        )}
      </div>

      <div className="fc-steps">
        {item.steps.length === 0 ? (
          <span className="fc-faint">{t('실행된 절차가 없습니다.')}</span>
        ) : (
          item.steps.map((step) => (
            <Step key={step.seq} step={step} tcId={item.tcId} runId={item.runId} historyId={item.historyId} 코드={false} />
          ))
        )}
      </div>
    </div>
  );
}

export function 상세본문({ runId, historyId }: { runId: number; historyId: number }) {
  const 상세 = useAsync(() => api.item(runId, historyId), [runId, historyId]);
  if (상세.error !== null) return <Failed error={상세.error} />;
  if (상세.data === null) return <Loading />;
  return <증거본문 item={상세.data} />;
}

interface Props {
  runId: number;
  historyId: number;
  tcId: string;
  platform: Platform;
  className?: string;
  /** 한 줄의 앞쪽 내용. 펼치기 버튼이 그 뒤에 붙는다 */
  children: ReactNode;
}

/**
 * 한 줄 + 펼치기. 처음 펼칠 때만 상세를 부르고, 접었다 다시 펴도 다시 부르지 않는다 —
 * 접은 패널은 지우지 않고 가려 둔다.
 */
export function ItemExpand({ runId, historyId, tcId, platform, className, children }: Props) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const [불렀나, set불렀나] = useState(false);
  const 패널 = `item-expand-${String(runId)}-${String(historyId)}`;

  return (
    <div className={className}>
      <div className="fc-line">
        {children}
        <button
          type="button"
          className="btn small ghost"
          aria-expanded={열림}
          aria-controls={패널}
          aria-label={t(열림 ? '{케이스} {디바이스} 접기' : '{케이스} {디바이스} 펼치기', {
            케이스: tcId,
            디바이스: PLATFORM_LABEL[platform],
          })}
          onClick={() => {
            set열림(!열림);
            set불렀나(true);
          }}
        >
          {열림 ? t('접기') : t('펼치기')}
        </button>
      </div>
      <div id={패널} hidden={!열림}>
        {불렀나 ? <상세본문 runId={runId} historyId={historyId} /> : null}
      </div>
    </div>
  );
}
