// 요약 띠 아래 「실패 요구사항 N건」 칸과 요구 번호 고리, 카드의 「관련 요구사항」 줄 (도메인/리포팅 「실패 요구사항」)

import { useState } from 'react';

import type { 실패요구 } from './api.js';
import { use말 } from './i18n.js';
import type { 판정 } from './role.js';
import { PRD항목주소 } from './route.js';

/** 이보다 많으면 접고 「N건 더 보기」 */
export const 먼저보일줄 = 5;

/** 고리는 그 서비스의 (작성, read) 가 있고 판에 있는 번호(문장이 있음)일 때만 건다. 아니면 글자 — 거절될 주소로 보내지 않는다 */
function 요구번호({ reqId, text, 권한 }: { reqId: string; text: string | null; 권한: 판정 }) {
  return 권한('작성보기') && text !== null ? (
    <a className="fr-id" href={PRD항목주소(reqId)}>
      {reqId}
    </a>
  ) : (
    <span className="fr-id">{reqId}</span>
  );
}

export function RunFailedReqs({ 요구들, 권한 }: { 요구들: 실패요구[]; 권한: 판정 }) {
  const t = use말();
  const [펼침, set펼침] = useState(false);
  if (요구들.length === 0) return null;

  const 보일것 = 펼침 ? 요구들 : 요구들.slice(0, 먼저보일줄);
  // 건수만 실패 글자 색이다. 영어 표에서도 숫자 자리가 어디든 맞도록 글을 만든 뒤 숫자 자리에서 가른다
  const [앞, 뒤] = t('실패 요구사항 {건수}건', { 건수: '\u0000' }).split('\u0000');

  return (
    <section className="fr" aria-labelledby="fr-title">
      <h2 id="fr-title" className="fc-title">
        {앞}
        <span className="fc-count">{요구들.length}</span>
        {뒤} <small className="fr-hint">{t('실패한 케이스가 덮는 요구입니다')}</small>
      </h2>
      <ul className="fr-list">
        {보일것.map((요구) => (
          <li key={요구.reqId} className="fr-row">
            <요구번호 reqId={요구.reqId} text={요구.text} 권한={권한} />
            <span className="fr-text">{요구.text ?? t('PRD 에 없는 번호')}</span>
            <span className="fr-n">{t('실패 케이스 {건수}', { 건수: 요구.tcIds.length })}</span>
          </li>
        ))}
      </ul>
      {요구들.length <= 먼저보일줄 ? null : (
        <button type="button" className="btn small ghost fr-more" onClick={() => set펼침(!펼침)} aria-expanded={펼침}>
          {펼침 ? t('접기') : t('{건수}건 더 보기', { 건수: 요구들.length - 먼저보일줄 })}
        </button>
      )}
    </section>
  );
}

export function 관련요구줄({ reqs, 권한 }: { reqs: { reqId: string; text: string | null }[]; 권한: 판정 }) {
  const t = use말();
  if (reqs.length === 0) return null;
  return (
    <div className="fc-reqs">
      <span className="fc-reqs-label">{t('관련 요구사항')}</span>
      <ul>
        {reqs.map((요구) => (
          <li key={요구.reqId}>
            <요구번호 reqId={요구.reqId} text={요구.text} 권한={권한} /> <span>{요구.text ?? t('PRD 에 없는 번호')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
