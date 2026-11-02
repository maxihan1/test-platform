// 결정 목록의 항목 하나하나 — 질문 한 문장 · 볼 것 · 고르기 버튼. 묶음과 진행 버튼은 AuthoringDecide.tsx 가 그린다 (도메인/작성 §3.6 「★ 결정 목록」 항목 표)

import { Fragment } from 'react';

import { 상한 } from '../prd/rules.js';
import { 무슨테스트, 올릴테스트수 } from './authoringSummary.js';
import type { 결정항목, 고르기, 막힘 } from './decideApi.js';
import { 넘치나, type 고른값, type 고른표 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { use나이글 } from './prdWords.js';
import { PRD항목주소, 실행기록주소 } from './route.js';
import { when } from './ui.js';

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;
type 확인항목 = 항목of<'CHECK'>;
export type 고름하기 = (key: string, 값: 고른값 | null) => void;

/** 요청 번호 고리들 — 「#12 · #15」 */
function 요청고리({ 번호들 }: { 번호들: readonly number[] }) {
  return (
    <>
      {번호들.map((번호, i) => (
        <Fragment key={번호}>
          {i === 0 ? null : ' · '}
          <a href={`#/authoring/${String(번호)}`}>#{번호}</a>
        </Fragment>
      ))}
    </>
  );
}

/** 버튼이 없는 까닭 — 누구에게 부탁할 일인지 알게 한 줄 남긴다(화면공통 §8 「등급이 낮아서 못 하는 것은 보이지 않는다」의 예외 줄) */
export function 막힘줄({ 까닭, open }: { 까닭: 막힘 | null; open: readonly number[] }) {
  const t = use말();
  if (까닭 === 'AUTHORING_OPEN') {
    return (
      <small className="hint">
        <요청고리 번호들={open} /> {t('이 반영된 뒤에 셉니다')}
      </small>
    );
  }
  const 글: Record<Exclude<막힘, 'AUTHORING_OPEN'>, string> = {
    ADMIN_ONLY: t('반영은 관리자가 합니다'),
    NO_WRITE: t('작성 쓰기 권한이 있는 사람이 고릅니다'),
    NO_RUN_WRITE: t('버그 판정은 실행 쓰기 권한이 있는 사람이 합니다'),
  };
  return 까닭 === null ? null : <small className="hint">{글[까닭]}</small>;
}

/** 고르기 버튼 줄. 이 사람이 못 고르는 값은 버튼이 없다. 「나중에」는 늘 있다 — 고르지 않은 일이 목록에 남는다는 뜻이다 */
export function 고르개({
  x,
  고른,
  on고름,
  글들,
  꺼짐 = false,
  나중꺼짐 = false,
  처음값 = {},
}: {
  x: 결정항목;
  고른: 고른값 | undefined;
  on고름: 고름하기;
  글들: [고르기, string][];
  꺼짐?: boolean;
  나중꺼짐?: boolean;
  처음값?: Partial<고른값>;
}) {
  const t = use말();
  if (x.picks.length === 0) return null;
  return (
    <span className="chip-group decide-choices" role="group">
      {글들
        .filter(([p]) => x.picks.includes(p))
        .map(([p, 글]) => (
          <button key={p} className="chip" type="button" aria-pressed={고른?.pick === p} disabled={꺼짐} onClick={() => on고름(x.key, { ...처음값, ...고른, pick: p })}>
            {글}
          </button>
        ))}
      <button className="chip" type="button" aria-pressed={고른?.pick === 'LATER'} disabled={나중꺼짐} onClick={() => on고름(x.key, { pick: 'LATER' })}>
        {t('나중에')}
      </button>
    </span>
  );
}

export function 반영대기({ x, 고른, on고름 }: { x: 항목of<'APPLY'>; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  const 언어 = use언어();
  const 수 = 올릴테스트수(x.summary);
  return (
    <div className="decide-item">
      <span className="decide-q">{수 === null ? t('테스트를 케이스 목록에 올릴까요?') : t('테스트 {수}건을 케이스 목록에 올릴까요?', { 수 })}</span>
      <small className="hint">
        <요청고리 번호들={[x.rootId]} /> · {무슨테스트(x.summary, 언어)} · {t('요청한 사람')} {x.requestedByName}
        {x.finishedAt === null ? null : ` · ${when(x.finishedAt, 언어)}`}
        {x.prUrl === null ? null : (
          <>
            {' · '}
            <a href={x.prUrl} target="_blank" rel="noreferrer">
              {t('테스트 검토하기')}
            </a>
          </>
        )}
      </small>
      <고르개 x={x} 고른={고른} on고름={on고름} 글들={[['APPLY', t('올린다 (반영)')]]} />
      <막힘줄 까닭={x.blockedBy} open={[]} />
    </div>
  );
}

export function 상세할일({ x }: { x: 항목of<'FIX'> }) {
  const t = use말();
  const 질문 = {
    APPLY_FAILED: t('#{번호} 반영이 실패했습니다', { 번호: x.rootId }),
    HELD: t('#{번호} 케이스 {수}건에 값이 필요합니다', { 번호: x.rootId, 수: x.count }),
    CONFLICT: t('#{번호} 케이스 {수}건이 다른 요청과 겹칩니다', { 번호: x.rootId, 수: x.count }),
  }[x.why];
  return (
    <div className="decide-item">
      <span className="decide-q">{질문}</span>
      {x.waiting.length === 0 ? null : (
        <small className="hint">
          {t('뒤에서')} <요청고리 번호들={x.waiting} /> {t('이 기다립니다 — 고치거나 폐기하면 이어서 돕니다')}
        </small>
      )}
      <a className="btn ghost small decide-go" href={`#/authoring/${String(x.rootId)}`}>
        {t('상세에서 처리')}
      </a>
    </div>
  );
}

export function 실패판정({ x, 고른, on고름 }: { x: 항목of<'FAIL'>; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  return (
    <div className="decide-item">
      <span className="decide-q">{t('테스트가 실패했습니다. 화면과 기획서 중 어느 쪽이 맞나요?')}</span>
      <div className="decide-box">
        <span className="hint">{t('기획서')}</span>
        <span>
          {x.reqs.map((r) => (
            <span key={r.reqId} className="decide-req">
              <span className="prd-id">{r.reqId}</span> {r.text}
            </span>
          ))}
        </span>
        {x.verify === null ? null : (
          <>
            <span className="hint">{t('확인')}</span>
            <span>{x.verify}</span>
          </>
        )}
        {x.reason === null ? null : (
          <>
            <span className="hint">{t('실패 까닭')}</span>
            <span>{x.reason}</span>
          </>
        )}
        <span className="hint">{t('테스트')}</span>
        <span>
          <span className="prd-id">{x.tcId}</span> · RUN {x.runId} · <a href={실행기록주소(x.tcId, x.runId, true)}>{t('실패 화면 보기')}</a>
        </span>
      </div>
      <고르개
        x={x}
        고른={고른}
        on고름={on고름}
        글들={[
          ['SCREEN', t('화면이 맞음 · 기획서 고치기')],
          ['BUG', t('기획서가 맞음 · 버그')],
        ]}
      />
      {x.picks.length > 0 && x.blockedBy !== 'NO_RUN_WRITE' ? null : <막힘줄 까닭={x.blockedBy} open={[]} />}
    </div>
  );
}

/** 화면 기준 · 그 밖의 확인 필요 — 같은 질문을 여러 요구에 한 번 묻고 줄마다 고른다 */
export function 의도확인({ 줄들, 화면기준, 고른표, on고름 }: { 줄들: 확인항목[]; 화면기준: boolean; 고른표: 고른표; on고름: 고름하기 }) {
  const t = use말();
  const 나이글 = use나이글();
  const 고를수있는 = 줄들.filter((x) => x.picks.includes('SAME'));
  return (
    <div className="decide-item">
      <div className="decide-qline">
        <span className="decide-q">
          {화면기준
            ? t('기획서에 없어서 화면을 보고 적은 요구 {수}건입니다. 의도한 동작과 같나요?', { 수: 줄들.length })
            : t('확인이 필요한 요구 {수}건입니다. 의도한 동작과 같나요?', { 수: 줄들.length })}
        </span>
        {고를수있는.length < 2 ? null : (
          <button className="btn ghost small" type="button" onClick={() => 고를수있는.forEach((x) => on고름(x.key, { pick: 'SAME' }))}>
            {t('{수}건 모두 「의도와 같음」', { 수: 고를수있는.length })}
          </button>
        )}
      </div>
      {줄들.map((x) => {
        const 고른 = 고른표.get(x.key);
        const 나이 = 나이글(x.checkSince);
        return (
          <div key={x.key} className="decide-sub">
            <div className="decide-box">
              <span className="hint">{t('요구')}</span>
              <span>
                <a className="prd-id" href={PRD항목주소(x.reqId)}>
                  {x.reqId}
                </a>{' '}
                {x.text}
                {나이 === null ? null : <span className="hint"> · {나이}</span>}
              </span>
            </div>
            <고르개
              x={x}
              고른={고른}
              on고름={on고름}
              처음값={{ text: x.text }}
              글들={[
                ['SAME', t('의도와 같음')],
                ['EDIT', t('다름 · 기획서 고치기')],
              ]}
            />
            {고른?.pick !== 'EDIT' ? null : (
              <label className="decide-text">
                {t('원래 의도한 동작')}
                <textarea rows={2} value={고른.text ?? ''} onChange={(e) => on고름(x.key, { pick: 'EDIT', text: e.target.value })} />
                {넘치나(고른.text ?? '') ? <small className="hint">{t('요구 문장은 {수}자까지입니다', { 수: 상한.요구문장 })}</small> : null}
              </label>
            )}
            <막힘줄 까닭={x.blockedBy} open={[]} />
          </div>
        );
      })}
    </div>
  );
}

/** 기획서끼리 다르게 적은 요구 — 출처마다 원문을 하나 고르거나 직접 적는다. 처음엔 아무것도 고르지 않는다 */
export function 문구고르기({ x, 고른, on고름 }: { x: 항목of<'CHECK'>; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  const 나이글 = use나이글();
  const 나이 = 나이글(x.checkSince);
  const 이름 = `decide-${x.key}`;
  const 자료수 = new Set(x.options.map((o) => o.asset)).size;
  const 고르나 = x.picks.length > 0;
  return (
    <fieldset className="decide-item decide-docs">
      <legend className="decide-q">{t('기획서 {수}개가 서로 다르게 적었습니다. 어느 쪽이 맞나요?', { 수: 자료수 })}</legend>
      <small className="hint">
        <span className="prd-id">{x.reqId}</span> {x.feature}
        {나이 === null ? null : ` · ${나이}`}
      </small>
      {/* 고를 권한이 없으면 고르개 없이 원문만 — 꺼진 고르개는 누를 수 있어 보인다(화면공통 §8 「등급이 낮아서 못 하는 것은 보이지 않는다」) */}
      {x.options.map((o, i) =>
        고르나 ? (
          <label key={`${String(i)}-${o.asset}`} className="decide-box decide-radio">
            <input type="radio" name={이름} checked={고른?.pick === 'PICK' && 고른.option === i} onChange={() => on고름(x.key, { pick: 'PICK', option: i })} />
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
      {!고르나 ? null : (
        <label className="decide-box decide-radio">
          <input type="radio" name={이름} checked={고른?.pick === 'OWN'} onChange={() => on고름(x.key, { pick: 'OWN', text: 고른?.text ?? x.text })} />
          <span>{t('둘 다 틀림 · 직접 입력')}</span>
          <span />
        </label>
      )}
      {고른?.pick !== 'OWN' ? null : (
        <label className="decide-text">
          {t('요구 문장')}
          <textarea rows={2} value={고른.text ?? ''} onChange={(e) => on고름(x.key, { pick: 'OWN', text: e.target.value })} />
          {넘치나(고른.text ?? '') ? <small className="hint">{t('요구 문장은 {수}자까지입니다', { 수: 상한.요구문장 })}</small> : null}
        </label>
      )}
      {고르나 && 고른 !== undefined ? (
        <button className="btn ghost small" type="button" onClick={() => on고름(x.key, null)}>
          {t('고른 것 지우기')}
        </button>
      ) : null}
      <막힘줄 까닭={x.blockedBy} open={[]} />
    </fieldset>
  );
}
