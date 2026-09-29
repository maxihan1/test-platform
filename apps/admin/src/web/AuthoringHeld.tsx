// 작성 상세의 보류 케이스 — 온 폭 표 · 줄 아래 펼쳐 값 넣기 · 다음 단계 진척 (도메인/작성 §3.6 「★ 보류 케이스」 · DESIGN.md 「작성 상태」 시안 A)

import { Fragment, useState } from 'react';

import { api, ApiError, type AuthoringHeld as 보류줄, type AuthoringHeldField, type AuthoringHeldValue } from './api.js';
import { 일 } from './authoringTodoParts.js';
import { use말, use언어, type 언어, t as 번역 } from './i18n.js';
import { message, when } from './ui.js';

// 보류 통로에서만 만나는 서버 코드. 모르면 공통 번역(message)으로 넘긴다 — AuthoringNew 의 작성오류와 같은 모양
const 보류오류: Record<string, string> = {
  HELD_OPEN: '보류 케이스가 남아 있어 아직 반영할 수 없습니다. 새로 고쳐 보세요',
  HELD_UNKNOWN: '보류 케이스를 읽지 못했습니다. 같은 자료로 다시 작성하세요.',
  MERGE_ACTIVE: '반영이 대기 중이거나 도는 중이라 지금은 값을 바꿀 수 없습니다',
  BAD_HELD: '넣은 값이 이 케이스의 칸과 맞지 않습니다',
};

export function 보류오류문장(err: unknown, 언어: 언어): string {
  const 말 = err instanceof ApiError ? 보류오류[err.code] : undefined;
  if (말 === undefined) return message(err, 언어);
  const 옮긴말 = 번역(말, 언어);
  return err instanceof ApiError && err.message !== '' ? `${옮긴말} — ${err.message}` : 옮긴말;
}

type 상태 = 'open' | 'filled' | 'removed';

/** 서버 `held.ts` 의 끝났나 와 같은 규칙 — 칸이 모두 차야 채운 것, 칸이 없으면 제거해야 끝난다 */
function 상태(h: 보류줄): 상태 {
  if (h.input?.removed === true) return 'removed';
  const 다찼나 = h.fields.length > 0 && h.fields.every((f) => h.input?.[f.side]?.[f.key] !== undefined);
  return 다찼나 ? 'filled' : 'open';
}

export function 보류셈(held: 보류줄[]): { 전체: number; 채움: number; 제거: number } {
  const 상태들 = held.map(상태);
  return { 전체: held.length, 채움: 상태들.filter((s) => s === 'filled').length, 제거: 상태들.filter((s) => s === 'removed').length };
}

/** 반영 때 대상 서버를 물어야 하나 — 제거만 했으면 돌릴 케이스가 없다 */
export function 값을채웠나(held: 보류줄[]): boolean {
  return held.some((h) => h.input !== null && h.input.removed !== true);
}

/** 다음 단계 카드의 진척 한 칸 */
export function 보류진척({ 표, held }: { 표: string; held: 보류줄[] }) {
  const t = use말();
  const { 전체, 채움, 제거 } = 보류셈(held);
  return (
    <일 표={표} 제목={t('보류 케이스 {전체}건 중 {처리}건 처리', { 전체, 처리: 채움 + 제거 })} 설명={t('값 채움 {채움} · 제거 {제거}', { 채움, 제거 })}>
      <div className="status-bar held-bar" aria-hidden="true">
        <i style={{ width: `${String(Math.round(((채움 + 제거) / 전체) * 100))}%` }} />
      </div>
      {/* 링크(#held)는 해시 라우터 주소(#/authoring/7)를 덮어 「없는 주소」로 간다 — 주소는 두고 내려가기만 한다 */}
      <button className="btn ghost" type="button" onClick={() => document.getElementById('held')?.scrollIntoView()}>
        {t('보류 케이스로 가기')}
      </button>
    </일>
  );
}

// 머리(「판정 불가 — 」·「보류 — 」)는 칩이 이미 말한다
const 머리뗀 = (사유: string): string => 사유.replace(/^[^—]*—\s*/u, '');

type 초안 = Record<string, string>;
const 칸이름 = (f: AuthoringHeldField): string => `${f.side}.${f.key}`;

/** 칸 글자를 서버가 받는 값으로. 빈 칸은 undefined, 숫자가 아니면 null */
function 값으로(f: AuthoringHeldField, 글: string): AuthoringHeldValue | undefined | null {
  if (글.trim() === '') return undefined;
  if (f.type === 'number') return Number.isFinite(Number(글)) ? Number(글) : null;
  if (f.type === 'boolean') return 글 === 'true';
  return 글;
}

function 입력칸({ f, 값, 바꿈, 벗어남 }: { f: AuthoringHeldField; 값: string; 바꿈: (v: string) => void; 벗어남: (v: string) => void }) {
  const t = use말();
  const id = `held-${칸이름(f)}`;
  // 고르기는 고르는 순간이 곧 벗어남이다 — blur 를 기다리면 고르고 딴 데를 누르기 전까지 저장이 안 된다
  const 고르기 = (보기: { v: string; 글: string }[]) => (
    <select id={id} value={값} onChange={(e) => { 바꿈(e.target.value); 벗어남(e.target.value); }}>
      <option value="">—</option>
      {보기.map((o) => (
        <option key={o.v} value={o.v}>
          {o.글}
        </option>
      ))}
    </select>
  );
  return (
    <div className="held-field">
      <span className="held-side">{f.side === 'params' ? t('넣을 값') : t('기대 결과')}</span>
      <label htmlFor={id}>{f.description}</label>
      {f.type === 'boolean' ? (
        고르기([{ v: 'true', 글: t('예') }, { v: 'false', 글: t('아니오') }])
      ) : f.type === 'enum' ? (
        고르기((f.options ?? []).map((o) => ({ v: o, 글: o })))
      ) : (
        <input
          id={id}
          value={값}
          inputMode={f.type === 'number' ? 'decimal' : undefined}
          placeholder={f.type === 'number' ? t('숫자') : t('글자')}
          onChange={(e) => 바꿈(e.target.value)}
          onBlur={(e) => 벗어남(e.target.value)}
        />
      )}
    </div>
  );
}

interface Props {
  service: string;
  /** 보류를 가진 실행(최신 끝난 작성 실행) 번호 — 서버가 그 행에만 입력을 받는다 */
  요청번호: number;
  held: 보류줄[];
  /** 작성 쓰기 권한. **화면이 버튼을 안 그리는 것은 편의다** — 서버 gate 가 다시 막는다 */
  편집: boolean;
  reload: () => void;
}

export function AuthoringHeld({ service, 요청번호, held, 편집, reload }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [열린, set열린] = useState<string | null>(null);
  const [초안들, set초안들] = useState<초안>({});
  const [알림, set알림] = useState<{ tcId: string; 글: string; 오류: boolean } | null>(null);

  if (held.length === 0) return null;

  function 보낸다(tcId: string, 일감: () => Promise<unknown>, 성공글: string | null) {
    set알림(null);
    void 일감()
      .then(() => {
        if (성공글 !== null) set알림({ tcId, 글: 성공글, 오류: false });
        reload();
      })
      .catch((err: unknown) => set알림({ tcId, 글: 보류오류문장(err, 언어), 오류: true }));
  }

  function 편다(h: 보류줄, 누른것?: HTMLElement) {
    if (열린 === h.tcId) return set열린(null);
    // 좁은 화면에서 표가 오른쪽으로 밀린 채 펼치면 입력 칸이 화면 밖(왼쪽)에 그려진다 — 표를 왼쪽 끝으로 되돌린다
    const 표자리 = 누른것?.closest('.authoring-diffs-wrap');
    if (표자리) 표자리.scrollLeft = 0;
    set열린(h.tcId);
    set알림(null);
    set초안들(Object.fromEntries(h.fields.map((f) => [칸이름(f), String(h.input?.[f.side]?.[f.key] ?? '')])));
  }

  // 한 칸을 벗어나면 그 케이스의 입력 전체를 보낸다 — 서버가 tcId 단위로 통째로 바꾼다
  function 저장(h: 보류줄, 바뀐칸: string, 새글: string) {
    const 지금 = { ...초안들, [바뀐칸]: 새글 };
    const 몸: { params?: Record<string, AuthoringHeldValue>; expected?: Record<string, AuthoringHeldValue> } = {};
    for (const f of h.fields) {
      const v = 값으로(f, 지금[칸이름(f)] ?? '');
      if (v === null) return set알림({ tcId: h.tcId, 글: t('숫자를 넣으세요'), 오류: true });
      if (v !== undefined) 몸[f.side] = { ...몸[f.side], [f.key]: v };
    }
    if (몸.params === undefined && 몸.expected === undefined) {
      if (h.input !== null) 보낸다(h.tcId, () => api.deleteAuthoringHeld(service, 요청번호, h.tcId), null);
      return;
    }
    보낸다(h.tcId, () => api.putAuthoringHeld(service, 요청번호, h.tcId, 몸), t('저장했습니다'));
  }

  const 상태글: Record<상태, string> = { open: t('값 필요'), filled: t('값 채움'), removed: t('제거함') };

  return (
    <section id="held" className="authoring-panel authoring-held" aria-labelledby="held-title">
      <h3 id="held-title">
        {t('보류 케이스')} <span className="hint">{t('{수}건 · 값을 넣거나 제거하세요', { 수: held.length })}</span>
      </h3>
      <p className="hint">
        {t('판정 불가는 기획서에 판정 기준이 없던 것, 보류는 전제를 만들 수 없던 것입니다. 넣은 값은 테스트의 기본값이 되고, 실행할 때 바꿀 수 있습니다.')}
      </p>
      <div className="authoring-diffs-wrap">
        <table className="dhist" aria-label={t('보류 케이스')}>
          <thead>
            <tr>
              <th>{t('케이스')}</th>
              <th>{t('무엇을 확인하나')}</th>
              <th>{t('왜 보류됐나')}</th>
              <th>{t('상태')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {held.map((h) => {
              const s = 상태(h);
              const 펼침 = 열린 === h.tcId && s !== 'removed';
              return (
                <Fragment key={h.tcId}>
                  <tr className={펼침 ? 'open' : undefined}>
                    <td>
                      <span className="mono">{h.tcId}</span>
                      <br />
                      <span className={h.kind === 'UNDECIDABLE' ? 'held-chip und' : 'held-chip'}>
                        {h.kind === 'UNDECIDABLE' ? t('판정 불가') : t('보류')}
                      </span>
                    </td>
                    <td className={s === 'removed' ? 'held-rm' : undefined}>
                      {h.name === undefined ? (
                        <span className="mono">{h.file}</span>
                      ) : (
                        <>
                          {h.name}
                          <br />
                          <span className="mono held-path">{h.file}</span>
                        </>
                      )}
                    </td>
                    <td>{머리뗀(h.reason)}</td>
                    <td className="held-state">
                      <span className={s === 'removed' ? 'held-rm' : undefined}>{상태글[s]}</span>
                      {h.input === null ? null : (
                        <span className="hint">
                          <br />
                          {h.input.by} · {when(h.input.at, 언어)}
                        </span>
                      )}
                      {알림?.tcId === h.tcId && !펼침 ? <p className={알림.오류 ? 'error-text' : 'hint'}>{알림.글}</p> : null}
                    </td>
                    <td className="held-btns">
                      {!편집 ? null : s === 'removed' ? (
                        <button className="btn ghost" type="button" onClick={() => 보낸다(h.tcId, () => api.deleteAuthoringHeld(service, 요청번호, h.tcId), null)}>
                          {t('되돌리기')}
                        </button>
                      ) : (
                        <>
                          {h.fields.length === 0 ? null : (
                            <button className="btn ghost" type="button" aria-expanded={펼침} onClick={(e) => 편다(h, e.currentTarget)}>
                              {펼침 ? t('접기') : t('값 넣기')}
                            </button>
                          )}
                          <button
                            className="btn ghost"
                            type="button"
                            onClick={() => 보낸다(h.tcId, () => api.putAuthoringHeld(service, 요청번호, h.tcId, { removed: true }), null)}
                          >
                            {t('제거')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {펼침 ? (
                    <tr className="open">
                      <td colSpan={5}>
                        <div className="held-open">
                          <div className="held-fields">
                            {h.fields.map((f) => (
                              <입력칸
                                key={칸이름(f)}
                                f={f}
                                값={초안들[칸이름(f)] ?? ''}
                                바꿈={(v) => set초안들((앞) => ({ ...앞, [칸이름(f)]: v }))}
                                벗어남={(v) => 저장(h, 칸이름(f), v)}
                              />
                            ))}
                          </div>
                          <p className={알림?.tcId === h.tcId && 알림.오류 ? 'error-text' : 'hint'}>
                            {알림?.tcId === h.tcId ? 알림.글 : t('칸을 벗어나면 바로 저장됩니다')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
