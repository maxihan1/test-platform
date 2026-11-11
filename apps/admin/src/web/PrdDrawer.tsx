// 「PRD 관리」 요구 하나의 오른쪽 서랍 — 테스트 · 출처 · 설계 미리보기와 고치기 칸. 줄을 펴던 자리를 서랍이 맡는다 (도메인/작성 §3.6 「★ 표준 기획서」 · 2026-11-11 목록 시안 B)

import type { PrdItem } from '@platform/kit';

import type { 줄보류 } from '../prd/heldText.js';
import type { 추적 } from '../prd/trace.js';
import { Drawer } from './Drawer.js';
import { use말 } from './i18n.js';
import type { PrdItemDraft, 성능칸 } from './prdApi.js';
import { 거치는API, type 거치는줄 } from './PrdApis.js';
import { 근거목록 } from './PrdBasis.js';
import { PrdItemForm } from './PrdItemForm.js';
import { 결과꼬리, prd줄아이디 } from './PrdRow.js';
import { 설계미리보기, 추적칸, 테스트구획 } from './PrdTrace.js';

export function 요구서랍({
  x,
  추적,
  보류,
  성능,
  케이스보나,
  거치는,
  안내,
  쓰나,
  고치나,
  기능들,
  on고치기,
  on고치기닫기,
  on저장,
  on닫기,
}: {
  x: PrdItem;
  추적: 추적;
  보류: 줄보류 | null;
  성능: 성능칸 | undefined;
  케이스보나: boolean;
  거치는: 거치는줄[];
  /** 문장을 고쳐 저장한 직후 — 테스트를 다시 만드는 곳으로 가는 고리를 단다 */
  안내: boolean;
  쓰나: boolean;
  고치나: boolean;
  기능들: string[];
  on고치기: () => void;
  on고치기닫기: () => void;
  on저장: (새것: PrdItemDraft | null, 실패: (글: string) => void) => Promise<boolean>;
  on닫기: () => void;
}) {
  const t = use말();
  const 꼬리 = 결과꼬리(t, 추적, 보류);
  const 제목 = `${prd줄아이디(x.reqId)}-title`;

  return (
    <Drawer className="prd-drawer" aria-labelledby={제목} onClose={on닫기}>
      <div className="prd-drawer-head">
        <span className="prd-id" id={제목}>
          {x.reqId}
        </span>
        {꼬리 === null ? null : <span className={꼬리.꼴}>{꼬리.글}</span>}
        <button type="button" className="btn ghost icon prd-drawer-x" aria-label={t('상세 닫기')} onClick={on닫기}>
          ✕
        </button>
      </div>
      <div className="prd-drawer-body">
        {고치나 ? null : <p className="prd-big">{x.text}</p>}
        {안내 ? (
          <p className="prd-note">
            <a href="#/authoring?todo=1">{t('테스트 작성 › 결정 필요에서 테스트를 다시 만들 수 있어요 →')}</a>
          </p>
        ) : null}
        {고치나 ? (
          <PrdItemForm
            key={x.reqId}
            열쇠={x.reqId}
            처음={{ feature: x.feature, text: x.text, basis: x.basis, status: x.status }}
            기능들={기능들}
            on저장={on저장}
            on취소={on고치기닫기}
            on지우기={(실패) => on저장(null, 실패)}
          />
        ) : (
          <>
            <추적칸 reqId={x.reqId} 추적={추적} 보류={보류} 성능={성능} 케이스보나={케이스보나} />
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
          </>
        )}
      </div>
      {쓰나 && !고치나 ? (
        <div className="prd-drawer-foot">
          <button type="button" className="btn ghost small" onClick={on고치기}>
            {t('수정')}
          </button>
        </div>
      ) : null}
    </Drawer>
  );
}
