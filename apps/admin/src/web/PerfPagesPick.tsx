// 성능 테스트 › 페이지 성능 — 「페이지 선택」 창. AI 가 고른 페이지를 빼거나 경로를 직접 적어 더한다 (도메인/성능 §3.4 결정 2)

import { useState } from 'react';

import { use말 } from './i18n.js';
import { Modal } from './Modal.js';
import type { 측정페이지 } from './perfPageApi.js';

/** 서버가 받는 범위 — 1~10개, 경로는 `/` 로 시작하고 500자까지 */
export const 페이지범위 = { 최소: 1, 최대: 10, 경로최대: 500 };

export function PerfPagesPick({ 목록, 적용, 닫기 }: { 목록: 측정페이지[]; 적용: (목록: 측정페이지[]) => void; 닫기: () => void }) {
  const t = use말();
  const [고르는중, set고르는중] = useState(목록);
  const [경로, set경로] = useState('');
  const [이름, set이름] = useState('');
  const [오류, set오류] = useState<string | null>(null);

  function 더하기() {
    const url = 경로.trim();
    if (!url.startsWith('/')) return set오류(t('경로는 /로 시작해야 합니다'));
    if (url.length > 페이지범위.경로최대) return set오류(t('경로는 {수}자까지 적을 수 있습니다', { 수: 페이지범위.경로최대 }));
    if (고르는중.some((it) => it.url === url)) return set오류(t('이미 있는 경로입니다'));
    if (고르는중.length >= 페이지범위.최대) return set오류(t('페이지는 {수}개까지 고를 수 있습니다', { 수: 페이지범위.최대 }));
    set고르는중([...고르는중, { url, name: 이름.trim() === '' ? url : 이름.trim(), login: false }]);
    set경로('');
    set이름('');
    set오류(null);
  }

  return (
    <Modal
      제목={t('페이지 선택')}
      onClose={닫기}
      버튼={
        <>
          <button type="button" className="btn ghost" onClick={닫기}>
            {t('취소')}
          </button>
          <button type="button" className="btn" disabled={고르는중.length < 페이지범위.최소} onClick={() => 적용(고르는중)}>
            {t('적용')}
          </button>
        </>
      }
    >
      <p className="perf-faint">{t('측정할 페이지를 1개에서 {수}개까지 고릅니다', { 수: 페이지범위.최대 })}</p>
      <ul className="pp-pick-list">
        {고르는중.map((it) => (
          <li key={it.url}>
            <span>
              {it.name} <span className="mono perf-faint">{it.url}</span> {it.login ? <span className="perf-tag">{t('로그인')}</span> : null}
            </span>
            <button type="button" className="btn ghost" aria-label={t('{이름} 빼기', { 이름: it.name })} onClick={() => set고르는중(고르는중.filter((x) => x !== it))}>
              {t('빼기')}
            </button>
          </li>
        ))}
      </ul>
      <div className="perf-fields">
        <label className="perf-field">
          {t('경로')}
          <input value={경로} placeholder="/cart" onChange={(e) => set경로(e.target.value)} />
        </label>
        <label className="perf-field">
          {t('이름')}
          <input value={이름} onChange={(e) => set이름(e.target.value)} />
        </label>
        <button type="button" className="btn ghost" onClick={더하기}>
          {t('추가')}
        </button>
      </div>
      {오류 === null ? null : (
        <p className="perf-err" role="alert">
          {오류}
        </p>
      )}
    </Modal>
  );
}
