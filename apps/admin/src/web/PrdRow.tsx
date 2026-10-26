// 「PRD 관리」 전체 요구의 한 줄 — 머리(번호 · 문장 · 꼬리표 · 추적 칸)와 펼친 칸(근거 · 설계 미리보기 · 고치기) (도메인/작성 §3.6 「★ 표준 기획서」)
// PrdList 가 300줄을 넘어 떼어 냈다 (2026-10-19 ⑫-2)

import type { PrdItem } from '@platform/kit';

import type { 줄보류 } from '../prd/heldText.js';
import type { 추적 } from '../prd/trace.js';
import { use말 } from './i18n.js';
import type { PrdItemDraft, 성능칸 } from './prdApi.js';
import { 거치는API, type 거치는줄 } from './PrdApis.js';
import { 근거목록 } from './PrdBasis.js';
import { PrdItemForm } from './PrdItemForm.js';
import { 설계미리보기, 추적칸, 테스트구획 } from './PrdTrace.js';
import { use나이글 } from './prdWords.js';

export const prd줄아이디 = (reqId: string) => `prd-item-${reqId}`;

export function 요구줄({
  x,
  여기 = false,
  추적,
  안내 = false,
  거치는,
  보류,
  성능,
  케이스보나,
  폈나,
  on펴기,
  쓰나,
  고치나,
  on고치기,
  on고치기닫기,
  기능들,
  on저장,
}: {
  x: PrdItem;
  여기?: boolean;
  추적: 추적;
  /** 문장을 고쳐 저장한 직후 — 테스트를 다시 만드는 곳으로 가는 고리를 단다 */
  안내?: boolean;
  거치는: 거치는줄[];
  보류: 줄보류 | null;
  성능: 성능칸 | undefined;
  케이스보나: boolean;
  폈나: boolean;
  on펴기: () => void;
  쓰나: boolean;
  고치나: boolean;
  on고치기: () => void;
  on고치기닫기: () => void;
  기능들: string[];
  on저장: (새것: PrdItemDraft | null, 실패: (글: string) => void) => Promise<boolean>;
}) {
  const t = use말();
  const 나이글 = use나이글();
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
            {x.byPerson === true ? <span className="prd-plain">{t('사람이 고침')}</span> : null}
          </span>
          <span className="prd-caret" aria-hidden="true">
            ▸
          </span>
        </button>
        <추적칸 reqId={x.reqId} 추적={추적} 보류={보류} 성능={성능} 케이스보나={케이스보나} />
      </div>
      {안내 ? (
        <p className="prd-note">
          <a href="#/authoring?todo=1">{t('테스트 작성 › 결정 필요에서 테스트를 다시 만들 수 있어요 →')}</a>
        </p>
      ) : null}
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
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
