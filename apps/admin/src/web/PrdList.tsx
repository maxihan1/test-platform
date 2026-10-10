// 「PRD 관리」 아래쪽의 전체 요구 — 기능 묶음으로 접고, 줄을 펴면 근거 · 설계 미리보기 · 고치기 (도메인/작성 §3.6 「★ 표준 기획서」)
// 설계 미리보기는 저장하지 않고 작성 에이전트와 같은 판정 함수로 그때 계산한다 — 두 벌이면 미리보기와 실제 작성이 갈린다

import type { PrdItem } from '@platform/kit';
import { Fragment, useMemo, useState } from 'react';

import { 설계하기 } from '../../../../scripts/authoring-design.js';
import { use기법말 } from './CaseDetail.js';
import { use말 } from './i18n.js';
import type { 판짓기 } from './Prd.js';
import { prdApi, type PrdItemDraft, type PrdNow } from './prdApi.js';
import { PrdItemForm, 빈요구 } from './PrdItemForm.js';
import { use나이글, use반영종류글 } from './PrdTodo.js';
import { 고친판, 뒤집은, 묶음들, 반영안됨줄, type 반영종류 } from './prdView.js';

export function PrdList({
  service,
  now,
  쓰나,
  짓기,
  더하기,
  on더하기닫기,
}: {
  service: string;
  now: PrdNow;
  쓰나: boolean;
  짓기: 판짓기;
  더하기: boolean;
  on더하기닫기: () => void;
}) {
  const t = use말();
  const [q, setQ] = useState('');
  const [연묶음, set연묶음] = useState<Set<string>>(new Set());
  const [편줄, set편줄] = useState<Set<string>>(new Set());
  const [고치는, set고치는] = useState<string | null>(null);

  const 찾는말 = q.trim().toLowerCase();
  const 찾은것 = 찾는말 === '' ? now.items : now.items.filter((x) => `${x.reqId} ${x.feature} ${x.text}`.toLowerCase().includes(찾는말));
  const 묶음 = 묶음들(찾은것);
  const 기능들 = [...new Set(now.items.map((x) => x.feature))];
  const 반영표 = new Map(반영안됨줄(now).map((x) => [x.reqId, x.kind]));
  // 찾는 동안은 맞은 묶음을 다 편다 — 접힌 묶음 속에 맞은 줄이 숨으면 「없다」로 읽힌다
  const 열렸나 = (feature: string) => 찾는말 !== '' || 연묶음.has(feature);
  const 모두폈나 = 묶음.length > 0 && 묶음.every((g) => 열렸나(g.feature));

  const 저장 = (reqId: string | null, 새것: PrdItemDraft | null) =>
    짓기((base) => prdApi.save(service, base, 고친판(now.items, reqId, 새것)));

  return (
    <section className="screen prd-all" aria-labelledby="prd-all-title">
      <div className="toolbar">
        <h2 id="prd-all-title" className="prd-all-title">
          {t('전체 요구')}
        </h2>
        <input
          type="text"
          className="prd-find"
          aria-label={t('요구 문장 · 번호 검색')}
          placeholder={t('요구 문장 · 번호 검색')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn ghost small"
          disabled={찾는말 !== '' || 묶음.length === 0}
          onClick={() => set연묶음(모두폈나 ? new Set() : new Set(묶음.map((g) => g.feature)))}
        >
          {모두폈나 ? t('모두 접기') : t('모두 펴기')}
        </button>
      </div>
      {더하기 ? (
        <div className="prd-new">
          <h3>{t('새 요구')}</h3>
          <PrdItemForm
            처음={빈요구()}
            기능들={기능들}
            on저장={async (x) => {
              const 됐나 = await 저장(null, x);
              if (됐나) on더하기닫기();
              return 됐나;
            }}
            on취소={on더하기닫기}
          />
        </div>
      ) : null}
      {묶음.length === 0 ? (
        <div className="empty">{찾는말 === '' ? t('아직 요구가 없습니다') : t('찾는 요구가 없습니다')}</div>
      ) : (
        묶음.map((g) => {
          const 확인수 = g.items.filter((x) => x.status === 'NEEDS_CHECK').length;
          const 반영수 = g.items.filter((x) => 반영표.has(x.reqId)).length;
          return (
            <div className="prd-group" key={g.feature}>
              <button className="prd-ghead" aria-expanded={열렸나(g.feature)} onClick={() => set연묶음(뒤집은(연묶음, g.feature))}>
                <span className="prd-caret" aria-hidden="true">
                  ▸
                </span>
                <b>{g.feature}</b>
                <span className="prd-gcount">
                  {t('{건수}건', { 건수: g.items.length })}
                  {확인수 === 0 ? null : <> · {t('확인 필요 {건수}건', { 건수: 확인수 })}</>}
                  {반영수 === 0 ? null : <> · {t('반영 안 됨 {건수}건', { 건수: 반영수 })}</>}
                </span>
              </button>
              {!열렸나(g.feature)
                ? null
                : g.items.map((x) => (
                    <요구줄
                      key={x.reqId}
                      x={x}
                      반영={반영표.get(x.reqId)}
                      폈나={편줄.has(x.reqId)}
                      on펴기={() => {
                        // 고치던 줄을 접으면 취소와 같다 — 다시 펼 때 옛 칸이 버려진 글로 열리지 않게
                        if (편줄.has(x.reqId) && 고치는 === x.reqId) set고치는(null);
                        set편줄(뒤집은(편줄, x.reqId));
                      }}
                      쓰나={쓰나}
                      고치나={고치는 === x.reqId}
                      on고치기={() => set고치는(x.reqId)}
                      on고치기닫기={() => set고치는(null)}
                      기능들={기능들}
                      on저장={async (새것) => {
                        const 됐나 = await 저장(x.reqId, 새것);
                        if (됐나) set고치는(null);
                        return 됐나;
                      }}
                      on확정={() => 짓기((base) => prdApi.confirm(service, base, [x.reqId]))}
                    />
                  ))}
            </div>
          );
        })
      )}
    </section>
  );
}

function 요구줄({
  x,
  반영,
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
  반영: 반영종류 | undefined;
  폈나: boolean;
  on펴기: () => void;
  쓰나: boolean;
  고치나: boolean;
  on고치기: () => void;
  on고치기닫기: () => void;
  기능들: string[];
  on저장: (새것: PrdItemDraft | null) => Promise<boolean>;
  on확정: () => Promise<boolean>;
}) {
  const t = use말();
  const 나이글 = use나이글();
  const 종류글 = use반영종류글();
  const [busy, setBusy] = useState(false);
  const 나이 = 나이글(x.checkSince);

  return (
    <div className="prd-item">
      <button className="prd-row" aria-expanded={폈나} onClick={on펴기}>
        <span className="prd-id">{x.reqId}</span>
        <span className="prd-text">{x.text}</span>
        <span className="prd-tags">
          {x.status === 'NEEDS_CHECK' ? (
            <span className="case-tag prd-check">{나이 === null ? t('확인 필요') : t('확인 필요 · {나이}', { 나이 })}</span>
          ) : (
            <span className="prd-plain">{t('확정§상태')}</span>
          )}
          {반영 === undefined ? null : <span className="case-tag prd-changed">{t('{종류} · 반영 안 됨', { 종류: 종류글[반영] })}</span>}
          {x.byPerson === true ? <span className="prd-plain">{t('사람이 고침')}</span> : null}
        </span>
        <span className="prd-caret" aria-hidden="true">
          ▸
        </span>
      </button>
      {!폈나 ? null : 고치나 ? (
        <div className="prd-detail">
          <PrdItemForm
            처음={{ feature: x.feature, text: x.text, basis: x.basis, status: x.status }}
            기능들={기능들}
            on저장={on저장}
            on취소={on고치기닫기}
            on지우기={() => on저장(null)}
          />
        </div>
      ) : (
        <div className="prd-detail">
          <section>
            <h3>{t('근거')}</h3>
            <dl className="prd-basis">
              {x.basis.map((b, i) => (
                <Fragment key={i}>
                  <dt>
                    {b.from}
                    {b.ref === undefined ? null : <> · <span className="prd-id">{b.ref}</span></>}
                  </dt>
                  <dd>「{b.quote}」</dd>
                </Fragment>
              ))}
            </dl>
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

function 설계미리보기({ text }: { text: string }) {
  const t = use말();
  const 기법말 = use기법말();
  const 설계 = useMemo(() => 설계하기(text), [text]);
  if (설계.경계.length === 0 && 설계.예외.length === 0) return <p className="prd-none">{t('요구 문장에서 잡힌 경계 · 예외가 없습니다')}</p>;
  return (
    <ul className="prd-design">
      {설계.경계.map((b, i) => (
        <li key={`b${i}`}>
          <span className="prd-tech">{기법말('경계값 분석')}</span>
          <span>「{b.근거}」</span>
          {b.값.map((값) => (
            <span className="prd-val" key={값}>
              {값}
            </span>
          ))}
        </li>
      ))}
      {설계.예외.map((e, i) => (
        <li key={`e${i}`}>
          <span className="prd-tech">{기법말(e.기법)}</span>
          <span>「{e.근거}」</span>
        </li>
      ))}
    </ul>
  );
}
