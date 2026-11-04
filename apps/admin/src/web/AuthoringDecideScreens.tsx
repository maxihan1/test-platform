// 결정 목록 「테스트 업데이트」 탭의 「테스트가 확인하지 않은 화면」 — 줄마다 체크한 화면만 테스트 추가 · [제외](확인 창) · 제외한 화면 되돌리기 (도메인/작성 §3.6 「★ 결정 목록」 「제외한 화면」)
// [제외] · [되돌리기]는 적용 버튼을 안 기다리고 곧바로 서버에 간다 — 확인 창이 한 번 묻는다(2026-11-04 사용자)

import { useState } from 'react';

import { 로그인역할 } from '../prd/rules.js';
import type { EnvRow } from './api.js';
import { 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import { decideApi, type 결정항목 } from './decideApi.js';
import { 켜졌나, type 고른값 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { Modal } from './Modal.js';
import { message } from './ui.js';

type 화면항목 = Extract<결정항목, { kind: 'SCREENS' }>;

/** 크롤러가 적은 로그인 상태 「로그인:일반 회원」은 「일반 회원 로그인」으로 읽는다. 그 밖(「로그아웃」 등)은 그대로 */
function 상태글(state: string, t: ReturnType<typeof use말>): string {
  const 역할 = 로그인역할(state);
  return 역할 === null ? state : t('{역할} 로그인', { 역할 });
}

export function 화면고르기({
  service,
  x,
  고른,
  on고름,
  open,
  envs,
  on바뀜,
}: {
  service: string;
  x: 화면항목;
  고른: 고른값 | undefined;
  on고름: 고름하기;
  open: readonly number[];
  envs: readonly EnvRow[];
  /** 제외 · 되돌리기 뒤 목록을 다시 읽는다 */
  on바뀜: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [뺄것, set뺄것] = useState<{ url: string; name: string } | null>(null);
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 같은 화면은 한 줄, 로그인 상태는 그 아래 (2026-10-26 시작 질문)
  const 화면별 = new Map<string, { name: string; states: string[] }>();
  for (const s of x.screens ?? []) {
    const 줄 = 화면별.get(s.url) ?? { name: '', states: [] };
    화면별.set(s.url, { name: 줄.name === '' ? s.name : 줄.name, states: [...줄.states, s.state] });
  }
  const 고르나 = x.picks.includes('FIX') && 켜졌나(x);
  const 바꿀수있나 = x.blockedBy !== 'NO_WRITE';
  const 체크 = new Set(고른?.screens ?? []);
  const 서버필요 = x.env === null;
  const 체크바꾸기 = (새: Set<string>) =>
    on고름(x.key, 새.size === 0 ? null : { pick: 'FIX', screens: [...화면별.keys()].filter((u) => 새.has(u)), ...(서버필요 ? { env: 고른?.env ?? 마지막서버(service, envs) } : {}) });

  async function 바꾸기(url: string, skip: boolean) {
    set바쁨(true);
    set오류(null);
    try {
      await decideApi.skipScreen(service, url, skip);
      if (skip && 체크.has(url)) 체크바꾸기(new Set([...체크].filter((u) => u !== url)));
      set뺄것(null);
      on바뀜();
    } catch (err) {
      set오류(message(err, 언어));
    }
    set바쁨(false);
  }

  return (
    <div className="decide-item">
      <div className="decide-qline">
        <span className="decide-q">
          {x.screens === null
            ? t('테스트가 확인하지 않은 화면이 있습니다')
            : 화면별.size === 0
              ? t('테스트가 확인하지 않은 화면이 없습니다')
              : t('테스트가 확인하지 않은 화면 {수}개입니다. 테스트를 만들 화면을 체크해 주세요', { 수: 화면별.size })}
        </span>
        {!고르나 || 화면별.size < 2 ? null : (
          <button className="btn ghost small" type="button" onClick={() => 체크바꾸기(new Set(화면별.keys()))}>
            {t('전체 선택')}
          </button>
        )}
      </div>
      {x.needsApply === true ? <small className="hint">{t('승인 대기를 먼저 끝내 주세요')}</small> : null}
      {[...화면별].map(([url, 줄]) => (
        <div key={url} className="decide-box decide-screen-row">
          {고르나 ? (
            <input
              type="checkbox"
              aria-label={`${줄.name === '' ? url : 줄.name} ${t('테스트 추가')}`}
              checked={체크.has(url)}
              onChange={() => 체크바꾸기(new Set(체크.has(url) ? [...체크].filter((u) => u !== url) : [...체크, url]))}
            />
          ) : (
            <span />
          )}
          <span>
            {줄.name === '' ? null : <>{줄.name} · </>}
            <span className="prd-id">{url}</span>
            <small className="hint decide-states">{줄.states.map((s) => 상태글(s, t)).join(' · ')}</small>
          </span>
          {!바꿀수있나 ? null : (
            <button className="btn ghost small" type="button" onClick={() => set뺄것({ url, name: 줄.name })}>
              {t('제외')}
            </button>
          )}
        </div>
      ))}
      {!서버필요 || 체크.size === 0 ? null : (
        <label className="decide-text">
          {t('대상 서버')}
          <select
            value={고른?.env ?? ''}
            onChange={(e) => {
              고른서버를적는다(service, e.target.value);
              on고름(x.key, { ...고른!, env: e.target.value });
            }}
          >
            <option value="">{t('서버 선택')}</option>
            {envs.map((e) => (
              <option key={e.env} value={e.env}>
                {e.env}
              </option>
            ))}
          </select>
          {(고른?.env ?? '') === '' ? <small className="hint">{t('대상 서버를 고르면 진행에 들어갑니다')}</small> : null}
        </label>
      )}
      {x.skipped.length === 0 ? null : (
        <details className="decide-skipped">
          <summary>{t('제외한 화면 {수}개', { 수: x.skipped.length })}</summary>
          {x.skipped.map((s) => (
            <div key={s.url} className="decide-saved">
              <span>
                {s.name === '' ? null : <>{s.name} · </>}
                <span className="prd-id">{s.url}</span>
              </span>
              {!바꿀수있나 ? null : (
                <button className="btn ghost small" type="button" disabled={바쁨} onClick={() => void 바꾸기(s.url, false)}>
                  {t('되돌리기')}
                </button>
              )}
            </div>
          ))}
        </details>
      )}
      {오류 === null || 뺄것 !== null ? null : <p className="error-text">{오류}</p>}
      <막힘줄 까닭={x.screens === null ? 'AUTHORING_OPEN' : x.blockedBy} open={open} />
      {뺄것 === null ? null : (
        <Modal
          제목={t('화면 제외')}
          onClose={() => set뺄것(null)}
          버튼={
            <>
              <button className="btn ghost" type="button" onClick={() => set뺄것(null)}>
                {t('취소')}
              </button>
              <button className="btn" type="button" disabled={바쁨} onClick={() => void 바꾸기(뺄것.url, true)}>
                {t('제외')}
              </button>
            </>
          }
        >
          <p>{t('{화면} 화면을 제외합니다', { 화면: 뺄것.name === '' ? 뺄것.url : `${뺄것.name} · ${뺄것.url}` })}</p>
          <ul className="decide-list">
            <li>{t('앞으로 테스트 업데이트에 나오지 않습니다')}</li>
            <li>{t('AI 가 이 화면 테스트를 만들지 않습니다')}</li>
            <li>{t('아래 「제외한 화면」에서 되돌릴 수 있습니다')}</li>
          </ul>
          {오류 === null ? null : <p className="error-text">{오류}</p>}
        </Modal>
      )}
    </div>
  );
}
