// 직전 실행에는 있었으나 이번에 실행되지 않은 케이스 목록 — 요약 띠 직전 대비 줄 (도메인/실행 §8.3 · 점검 2.20)
// 견준 응답에는 개수만 있어서, 눌렀을 때 직전 실행을 읽어 이번 실행과 (케이스, 디바이스)로 맞대 본다

import { useState } from 'react';

import { api, type RunItemSummary } from './api.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL, useAsync } from './ui.js';

const 보일수 = 30;

export function 빠진목록({ 앞: 앞번호, 이번, 건수 }: { 앞: number; 이번: RunItemSummary[]; 건수: number }) {
  const t = use말();
  const [열림, set열림] = useState(false);
  // 눌렀을 때만 읽는다 — 요약 띠는 거의 늘 이 목록을 안 본다
  const 직전 = useAsync(() => (열림 ? api.run(앞번호) : Promise.resolve(null)), [열림, 앞번호]);

  const 이번키 = new Set(이번.map((it) => `${it.tcId}\u0000${it.platform}`));
  const 빠진 = [
    ...new Map(
      (직전.data?.items ?? [])
        .filter((it) => !이번키.has(`${it.tcId}\u0000${it.platform}`))
        .map((it) => [`${it.tcId}\u0000${it.platform}`, it] as const),
    ).values(),
  ];

  return (
    <div className="rs-missing">
      <button type="button" className="rs-note linklike" aria-expanded={열림} onClick={() => set열림(!열림)}>
        {t('직전 실행에 있었으나 이번에 실행되지 않은 케이스 {건수}건', { 건수 })}
        {' · '}
        {열림 ? t('접기') : t('목록 보기')}
      </button>
      {!열림 ? null : 직전.error !== null ? (
        <p className="rs-note na">{직전.error}</p>
      ) : 직전.data === null ? (
        <p className="rs-note">{t('불러오는 중입니다.')}</p>
      ) : (
        <div>
          {빠진.slice(0, 보일수).map((it) => (
            <div className="rr-fixed" key={`${it.tcId}\u0000${it.platform}`}>
              <span className="mono">{it.tcId}</span> {it.tcName} · {PLATFORM_LABEL[it.platform]}
            </div>
          ))}
          {빠진.length <= 보일수 ? null : <p className="rs-note">{t('외 {건수}건', { 건수: 빠진.length - 보일수 })}</p>}
        </div>
      )}
    </div>
  );
}
