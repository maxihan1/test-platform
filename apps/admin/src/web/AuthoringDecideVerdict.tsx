// 결정 목록 「요구사항 확인」 탭의 판정 요청 카드 — 기획서가 정하지 않은 요구에 작성 · 실행이 본 현재 동작을 붙여 어느 쪽이 맞나 묻는다 (도메인/작성 §3.6 「★ 결정 목록」 「판정 요청 카드」)
// 현재 동작은 판단 재료일 뿐이다 — 「현재 동작으로 수정」도 칸을 [저장]해야 고른 것이 된다. 사람이 고른 문장이 기대값의 근거가 된다

import { 문장칸, 저장한문장, type 편집표, type 편집하기 } from './AuthoringDecideCheck.js';
import { 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import type { 결정항목 } from './decideApi.js';
import type { 고른표 } from './decideView.js';
import { use말 } from './i18n.js';
import { use나이글 } from './prdWords.js';
import { PRD항목주소 } from './route.js';

type 확인항목 = Extract<결정항목, { kind: 'CHECK' }>;

export function 판정카드({ 줄들, 고른표, on고름, 편집, on편집 }: { 줄들: 확인항목[]; 고른표: 고른표; on고름: 고름하기; 편집: 편집표; on편집: 편집하기 }) {
  const t = use말();
  const 나이글 = use나이글();
  return (
    <div className="decide-item">
      <span className="decide-q">{t('기획서가 정하지 않은 요구사항 {수}건입니다. 현재 동작과 기획서 중 어느 쪽이 맞나요?', { 수: 줄들.length })}</span>
      {줄들.map((x) => {
        const 본것 = x.observed;
        if (본것 === null) return null;
        const 고른 = 고른표.get(x.key);
        const 적던 = 편집.get(x.key);
        const 저장함 = 고른?.pick === 'EDIT' ? (고른.text ?? '') : null;
        const 나이 = 나이글(x.checkSince);
        const 어디 = 본것.where === 'EXPLORE' ? t('탐색 플레이') : `RUN ${String(본것.where)}`;
        const 꼬리 = [어디, ...(본것.build === null ? [] : [t('빌드 {번호}', { 번호: 본것.build })]), t('{수}번 확인', { 수: 본것.count })].join(' · ');
        return (
          <div key={x.key} className="decide-sub">
            <div className="decide-box">
              <span className="hint">{t('기획서')}</span>
              <span>
                <a className="prd-id" href={PRD항목주소(x.reqId)}>
                  {x.reqId}
                </a>{' '}
                {x.text}
                {나이 === null ? null : <span className="hint"> · {나이}</span>}
              </span>
              <span className="hint">{t('현재 동작')}</span>
              <span>
                {본것.text}
                <span className="hint"> · {꼬리}</span>
              </span>
            </div>
            {x.picks.length === 0 ? null : (
              <span className="chip-group decide-choices" role="group">
                {/* 칸을 열기만 해서는 고른 것이 안 바뀐다 — [저장]해야 수정이 된다(위 의도확인과 같은 손) */}
                <button
                  className="chip"
                  type="button"
                  aria-pressed={적던 !== undefined || 저장함 !== null}
                  onClick={() => {
                    if (적던 !== undefined) return on편집(x.key, null);
                    if (저장함 !== null) return on고름(x.key, null);
                    on편집(x.key, 본것.proposal);
                  }}
                >
                  {t('현재 동작으로 수정')}
                </button>
                <button
                  className="chip"
                  type="button"
                  aria-pressed={고른?.pick === 'SAME'}
                  onClick={() => {
                    on편집(x.key, null);
                    on고름(x.key, 고른?.pick === 'SAME' ? null : { pick: 'SAME' });
                  }}
                >
                  {t('기획서대로 확정')}
                </button>
              </span>
            )}
            {적던 !== undefined ? (
              <문장칸
                이름={t('수정할 요구사항')}
                기존={x.text}
                글={적던}
                on글={(글) => on편집(x.key, 글)}
                on취소={() => on편집(x.key, null)}
                on저장={() => {
                  on고름(x.key, { pick: 'EDIT', text: 적던 });
                  on편집(x.key, null);
                }}
              />
            ) : 저장함 === null ? null : (
              <저장한문장 글={저장함} on다시={() => on편집(x.key, 저장함)} />
            )}
            <막힘줄 까닭={x.blockedBy} open={[]} />
          </div>
        );
      })}
    </div>
  );
}
