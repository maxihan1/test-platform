// 「PRD 관리」 요구 하나의 상세 창 — 왼쪽은 출처 · 호출하는 API · 설계 미리보기, 오른쪽은 마지막 결과 · 세부 사항과 고치기 (도메인/작성 §3.6 「★ 표준 기획서」 · DESIGN.md 「상세 창」)
// 2026-11-27 사용자 시안 C 2판 — 이전 버전 오른쪽 서랍(2026-11-11 목록 시안 B)은 폭이 좁아 출처가 길게 늘어졌다

import type { PrdItem } from '@platform/kit';

import type { 줄보류 } from '../prd/heldText.js';
import type { 추적 } from '../prd/trace.js';
import { DetailModal, 상세상자 } from './DetailModal.js';
import { use말 } from './i18n.js';
import type { PrdItemDraft, 성능칸 } from './prdApi.js';
import { 거치는API, type 거치는줄 } from './PrdApis.js';
import { 근거목록 } from './PrdBasis.js';
import { PrdItemForm } from './PrdItemForm.js';
import { 결과꼬리, prd줄아이디 } from './PrdRow.js';
import { 설계미리보기, 추적칸, 테스트구획 } from './PrdTrace.js';
import { PRD항목주소 } from './route.js';

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
  on이전,
  on다음,
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
  /** 목록에 보이는 차례의 앞 · 뒤 요구를 연다. 끝이면 없다 */
  on이전?: (() => void) | undefined;
  on다음?: (() => void) | undefined;
  on닫기: () => void;
}) {
  const t = use말();
  const 꼬리 = 결과꼬리(t, 추적, 보류);

  return (
    <DetailModal
      id={`${prd줄아이디(x.reqId)}-detail`}
      위치={[t('PRD 관리'), x.feature]}
      번호={x.reqId}
      제목={고치나 ? null : x.text}
      주소={PRD항목주소(x.reqId)}
      on이전={on이전}
      on다음={on다음}
      onClose={on닫기}
      왼쪽={
        <>
          {안내 ? (
            <p className="prd-note">
              <a href="#/authoring?todo=1">{t('테스트 작성 › 결정 필요에서 테스트를 다시 만들 수 있습니다 →')}</a>
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
              <section>
                <h3>{t('출처')}</h3>
                <근거목록 basis={x.basis} />
              </section>
              <거치는API 줄들={거치는} />
              <section>
                <h3>{t('설계 미리보기')}</h3>
                <설계미리보기 text={x.text} />
              </section>
            </>
          )}
        </>
      }
      오른쪽={
        <>
          <div className="dm-status">
            <span className="lbl">{t('마지막 결과')}</span>
            {꼬리 === null ? null : <span className={꼬리.꼴}>{꼬리.글}</span>}
            {쓰나 && !고치나 ? (
              <button type="button" className="btn ghost" onClick={on고치기}>
                {t('수정')}
              </button>
            ) : null}
          </div>
          <상세상자 제목={t('세부 사항')}>
            <dl className="dm-rows">
              <dt>{t('기능 묶음')}</dt>
              <dd>{x.feature}</dd>
              <dt>{t('케이스')}</dt>
              <dd>
                <추적칸 reqId={x.reqId} 추적={추적} 보류={보류} 성능={성능} 케이스보나={케이스보나} />
              </dd>
              {추적.기능.length + 추적.UI.length === 0 ? null : (
                <>
                  <dt>{t('테스트')}</dt>
                  <dd>
                    <테스트구획 추적={추적} />
                  </dd>
                </>
              )}
              <dt>{t('상태')}</dt>
              <dd>
                {x.status === 'CONFIRMED' ? t('확정§상태') : t('확인 필요')}
                {x.byPerson === true ? ` · ${t('사람이 수정')}` : null}
              </dd>
            </dl>
          </상세상자>
        </>
      }
    />
  );
}
