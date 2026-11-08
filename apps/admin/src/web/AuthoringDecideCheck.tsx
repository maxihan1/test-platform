// 결정 목록 「요구사항 확인」 탭의 확인 필요 항목 — 확정 · 수정과 기획서끼리 다른 문구 고르기, 둘이 같이 쓰는 문장 칸 (도메인/작성 §3.6 「★ 결정 목록」 항목 표)
// 적던 글(편집표)은 고른 값과 따로 둔다 — [저장]을 눌러야 고른 값이 되고 적용에 들어간다(2026-11-04 사용자 「저장 버튼이 있어야 진행할 때 바뀐 걸로 알지」)

import { 상한 } from '../prd/rules.js';
import { 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import type { 결정항목 } from './decideApi.js';
import { 넘치나, type 고른표 } from './decideView.js';
import { use말 } from './i18n.js';
import { use나이글 } from './prdWords.js';
import { PRD항목주소 } from './route.js';

type 확인항목 = Extract<결정항목, { kind: 'CHECK' }>;
/** 항목 열쇠마다 적던 글. 없으면 칸이 닫혀 있다 */
export type 편집표 = ReadonlyMap<string, string>;
export type 편집하기 = (key: string, 글: string | null) => void;

/** 요구 문장 칸 — 이름 · (있으면) 기존 문장 · 글자 수 · [취소] [저장] */
function 문장칸({
  이름,
  기존,
  글,
  안내,
  on글,
  on저장,
  on취소,
}: {
  이름: string;
  기존?: string;
  글: string;
  안내?: string;
  on글: (글: string) => void;
  on저장: () => void;
  on취소?: () => void;
}) {
  const t = use말();
  const 넘침 = 넘치나(글);
  return (
    <div className="decide-edit">
      <label className="decide-text">
        <span className="decide-text-name">{이름}</span>
        {기존 === undefined ? null : (
          <span className="decide-old">
            <span className="hint">{t('기존')}</span> {기존}
          </span>
        )}
        <textarea rows={2} value={글} placeholder={안내} onChange={(e) => on글(e.target.value)} />
      </label>
      <div className="decide-edit-foot">
        <small className={넘침 ? 'decide-count over' : 'decide-count hint'}>
          {글.length} / {상한.요구문장}
        </small>
        {on취소 === undefined ? null : (
          <button className="btn ghost small" type="button" onClick={on취소}>
            {t('취소')}
          </button>
        )}
        <button className="btn small" type="button" disabled={글.trim() === '' || 넘침} onClick={on저장}>
          {t('저장')}
        </button>
      </div>
    </div>
  );
}

/** 저장한 문장 한 줄과 [다시 수정] · (있으면) [선택 취소] — 고른 것을 다시 「안 고름」으로 돌리는 길이다 */
function 저장한문장({ 글, on다시, on풀기 }: { 글: string; on다시: () => void; on풀기?: () => void }) {
  const t = use말();
  return (
    <div className="decide-saved">
      <span>→ {글}</span>
      <button className="btn ghost small" type="button" onClick={on다시}>
        {t('다시 수정')}
      </button>
      {on풀기 === undefined ? null : (
        <button className="btn ghost small" type="button" onClick={on풀기}>
          {t('선택 취소')}
        </button>
      )}
    </div>
  );
}

/** 화면 기준 · 그 밖의 확인 필요 — 같은 질문을 여러 요구에 한 번 묻고 줄마다 [확정] · [수정] */
export function 의도확인({
  줄들,
  화면기준,
  고른표,
  on고름,
  편집,
  on편집,
}: {
  줄들: 확인항목[];
  화면기준: boolean;
  고른표: 고른표;
  on고름: 고름하기;
  편집: 편집표;
  on편집: 편집하기;
}) {
  const t = use말();
  const 나이글 = use나이글();
  // 일괄 확정은 아직 아무것도 안 한 줄만 — 저장한 수정이나 쓰던 글을 덮으면 사람이 고친 문장이 말없이 사라진다
  const 고를수있는 = 줄들.filter((x) => x.picks.includes('SAME') && !고른표.has(x.key) && !편집.has(x.key));
  const 확정 = (key: string) => {
    on편집(key, null);
    on고름(key, { pick: 'SAME' });
  };
  return (
    <div className="decide-item">
      <div className="decide-qline">
        <span className="decide-q">
          {화면기준
            ? t('기획서에 없어서 화면을 보고 적은 요구사항 {수}건입니다. 이대로 확정할까요?', { 수: 줄들.length })
            : t('확인이 필요한 요구사항 {수}건입니다. 이대로 확정할까요?', { 수: 줄들.length })}
        </span>
        {고를수있는.length < 2 ? null : (
          <button className="btn ghost small" type="button" onClick={() => 고를수있는.forEach((x) => 확정(x.key))}>
            {t('일괄 확정')}
          </button>
        )}
      </div>
      {줄들.map((x) => {
        const 고른 = 고른표.get(x.key);
        const 적던 = 편집.get(x.key);
        const 저장함 = 고른?.pick === 'EDIT' ? (고른.text ?? '') : null;
        const 나이 = 나이글(x.checkSince);
        return (
          <div key={x.key} className="decide-sub">
            <div className="decide-box">
              <span className="hint">{t('요구사항')}</span>
              <span>
                <a className="prd-id" href={PRD항목주소(x.reqId)}>
                  {x.reqId}
                </a>{' '}
                {x.text}
                {나이 === null ? null : <span className="hint"> · {나이}</span>}
              </span>
            </div>
            {x.picks.length === 0 ? null : (
              <span className="chip-group decide-choices" role="group">
                {!x.picks.includes('SAME') ? null : (
                  <button className="chip" type="button" aria-pressed={고른?.pick === 'SAME'} onClick={() => (고른?.pick === 'SAME' ? on고름(x.key, null) : 확정(x.key))}>
                    {t('확정')}
                  </button>
                )}
                {/* 칸을 열기만 해서는 고른 것이 안 바뀐다 — [저장]해야 확정이 수정으로 바뀌고, [취소]하면 앞의 고름이 그대로다 */}
                {!x.picks.includes('EDIT') ? null : (
                  <button
                    className="chip"
                    type="button"
                    aria-pressed={적던 !== undefined || 저장함 !== null}
                    onClick={() => {
                      if (적던 !== undefined) return on편집(x.key, null);
                      if (저장함 !== null) return on고름(x.key, null);
                      on편집(x.key, x.text);
                    }}
                  >
                    {t('수정')}
                  </button>
                )}
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

/** 기획서끼리 다르게 적은 요구 — 맞는 원문 하나를 체크하거나 아래 칸에 적어 저장한다. 처음엔 아무것도 고르지 않는다 */
export function 문구고르기({ x, 고른표, on고름, 편집, on편집 }: { x: 확인항목; 고른표: 고른표; on고름: 고름하기; 편집: 편집표; on편집: 편집하기 }) {
  const t = use말();
  const 나이글 = use나이글();
  const 나이 = 나이글(x.checkSince);
  const 고른 = 고른표.get(x.key);
  const 자료수 = new Set(x.options.map((o) => o.asset)).size;
  const 고르나 = x.picks.length > 0;
  const 적던 = 편집.get(x.key);
  const 저장함 = 고른?.pick === 'OWN' ? (고른.text ?? '') : null;
  return (
    <fieldset className="decide-item decide-docs">
      <legend className="decide-q">{고르나 ? t('기획서 {수}개가 서로 다르게 적었습니다. 맞는 쪽을 체크해 주세요', { 수: 자료수 }) : t('기획서 {수}개가 서로 다르게 적었습니다', { 수: 자료수 })}</legend>
      <small className="hint">
        <span className="prd-id">{x.reqId}</span> {x.feature}
        {나이 === null ? null : ` · ${나이}`}
      </small>
      {/* 고를 권한이 없으면 체크 칸 없이 원문만 — 꺼진 칸은 누를 수 있어 보인다(화면공통 §8 「등급이 낮아서 못 하는 것은 보이지 않는다」) */}
      {x.options.map((o, i) =>
        고르나 ? (
          // 맞는 답은 하나라 다른 쪽을 체크하면 앞엣것이 풀린다 — 모양만 체크 칸이고 고르는 것은 하나다(2026-11-04 사용자)
          <label key={`${String(i)}-${o.asset}`} className="decide-box decide-radio">
            <input
              type="checkbox"
              checked={고른?.pick === 'PICK' && 고른.option === i}
              onChange={(e) => {
                on편집(x.key, null);
                on고름(x.key, e.target.checked ? { pick: 'PICK', option: i } : null);
              }}
            />
            <span>「{o.quote}」</span>
            <span className="hint">{o.asset}</span>
          </label>
        ) : (
          <div key={`${String(i)}-${o.asset}`} className="decide-box">
            <span>「{o.quote}」</span>
            <span className="hint">{o.asset}</span>
          </div>
        ),
      )}
      {!고르나 ? null : 저장함 !== null && 적던 === undefined ? (
        <저장한문장 글={저장함} on다시={() => on편집(x.key, 저장함)} on풀기={() => on고름(x.key, null)} />
      ) : (
        <문장칸
          이름={t('둘 다 아니면 직접 입력')}
          안내={t('맞는 요구사항을 적어 주세요')}
          글={적던 ?? ''}
          on취소={저장함 === null ? undefined : () => on편집(x.key, null)}
          on글={(글) => {
            if (고른?.pick === 'PICK') on고름(x.key, null);
            on편집(x.key, 글 === '' ? null : 글);
          }}
          on저장={() => {
            on고름(x.key, { pick: 'OWN', text: 적던 ?? '' });
            on편집(x.key, null);
          }}
        />
      )}
      <막힘줄 까닭={x.blockedBy} open={[]} />
    </fieldset>
  );
}
