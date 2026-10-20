// 「PRD 관리」 전체 요구의 한 줄 — 머리(번호 · 문장 · 꼬리표 · 추적 칸)와 펼친 칸(근거 · 설계 미리보기 · 고치기) (도메인/작성 §3.6 「★ 표준 기획서」)
// PrdList 가 300줄을 넘어 떼어 냈다 (2026-10-19 ⑫-2)

import type { PrdItem } from '@platform/kit';
import { useState } from 'react';

import type { 줄보류 } from '../prd/heldText.js';
import type { 추적 } from '../prd/trace.js';
import { use말 } from './i18n.js';
import type { PrdItemDraft } from './prdApi.js';
import { 거치는API, type 거치는줄 } from './PrdApis.js';
import { 근거목록 } from './PrdBasis.js';
import { PrdItemForm } from './PrdItemForm.js';
import { use나이글, use반영종류글 } from './PrdTodo.js';
import { 설계미리보기, 추적칸, 테스트구획 } from './PrdTrace.js';
import type { 반영종류 } from './prdView.js';

export const prd줄아이디 = (reqId: string) => `prd-item-${reqId}`;

export function 요구줄({
  x,
  여기 = false,
  반영,
  추적,
  거치는,
  보류,
  케이스보나,
  폈나,
  on펴기,
  쓰나,
  고치나,
  on고치기,
  on고치기닫기,
  기능들,
  on저장,
  on확정,
}: {
  x: PrdItem;
  여기?: boolean;
  반영: 반영종류 | undefined;
  추적: 추적;
  거치는: 거치는줄[];
  보류: 줄보류 | null;
  케이스보나: boolean;
  폈나: boolean;
  on펴기: () => void;
  쓰나: boolean;
  고치나: boolean;
  on고치기: () => void;
  on고치기닫기: () => void;
  기능들: string[];
  on저장: (새것: PrdItemDraft | null, 실패: (글: string) => void) => Promise<boolean>;
  on확정: () => Promise<boolean>;
}) {
  const t = use말();
  const 나이글 = use나이글();
  const 종류글 = use반영종류글();
  const [busy, setBusy] = useState(false);
  const 나이 = 나이글(x.checkSince);

  return (
    <div className={여기 ? 'prd-item prd-here' : 'prd-item'} id={prd줄아이디(x.reqId)}>
      <div className="prd-line">
        <button className="prd-row" aria-expanded={폈나} onClick={on펴기}>
          <span className="prd-id">{x.reqId}</span>
          <span className="prd-text">{x.text}</span>
          <span className="prd-tags">
            {/* 확정은 기본 상태라 꼬리표를 달지 않는다 — 줄마다 붙으면 확인 필요가 묻힌다 (점검 8.12) */}
            {x.status === 'NEEDS_CHECK' ? <span className="case-tag prd-check">{나이 === null ? t('확인 필요') : t('확인 필요 · {나이}', { 나이 })}</span> : null}
            {반영 === undefined ? null : <span className="case-tag prd-changed">{t('{종류} · 반영 안 됨', { 종류: 종류글[반영] })}</span>}
            {x.byPerson === true ? <span className="prd-plain">{t('사람이 고침')}</span> : null}
          </span>
          <span className="prd-caret" aria-hidden="true">
            ▸
          </span>
        </button>
        <추적칸 reqId={x.reqId} 추적={추적} 보류={보류} 케이스보나={케이스보나} />
      </div>
      {!폈나 ? null : 고치나 ? (
        <div className="prd-detail">
          <PrdItemForm
            열쇠={x.reqId}
            처음={{ feature: x.feature, text: x.text, basis: x.basis, status: x.status }}
            기능들={기능들}
            on저장={on저장}
            on취소={on고치기닫기}
            on지우기={(실패) => on저장(null, 실패)}
          />
        </div>
      ) : (
        <div className="prd-detail">
          <테스트구획 추적={추적} />
          <거치는API 줄들={거치는} />
          <section>
            <h3>{t('출처')}</h3>
            <근거목록 basis={x.basis} />
          </section>
          <section>
            <h3>{t('설계 미리보기')}</h3>
            <설계미리보기 text={x.text} />
          </section>
          {쓰나 ? (
            <div className="prd-acts">
              <button className="btn ghost small" onClick={on고치기}>
                {t('고치기')}
              </button>
              {x.status !== 'NEEDS_CHECK' ? null : (
                <button
                  className="btn ghost small"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void on확정().then(() => setBusy(false));
                  }}
                >
                  {t('이 요구만 확정')}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
