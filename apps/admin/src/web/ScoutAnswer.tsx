// Scout 질문 하나 — 내 질문 말풍선 · 대기 · 진행 줄(답이 나오면 접힌다) · 목록 답 · 끝 상태 (도메인/챗봇 §8.18)

import { useMemo, useState } from 'react';

import { use말 } from './i18n.js';
import { 끝났나, 답풀기, 단계글, 배지색, type 글조각, type 단계, type 덩이, type 질문 } from './scoutView.js';

const 목록상한 = 10;

function 체크() {
  return (
    <svg className="scout-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function 글들({ 조각들 }: { 조각들: 글조각[] }) {
  return (
    <>
      {조각들.map((c, i) =>
        c.주소 !== undefined ? (
          // Issue Bunker 이슈만 다른 제품이라 새 탭으로 연다
          <a key={i} href={c.주소} {...(c.주소.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' })}>
            {c.글}
          </a>
        ) : c.굵게 === true ? (
          <strong key={i}>{c.글}</strong>
        ) : c.코드 === true ? (
          <code key={i}>{c.글}</code>
        ) : (
          <span key={i}>{c.글}</span>
        ),
      )}
    </>
  );
}

function 목록({ 줄들 }: { 줄들: Extract<덩이, { 꼴: 'list' }>['rows'] }) {
  const t = use말();
  const [다봄, set다봄] = useState(false);
  const 보일것 = 다봄 ? 줄들 : 줄들.slice(0, 목록상한);
  return (
    <>
      <ul className="scout-list">
        {보일것.map((줄, i) => (
          <li key={i}>
            {줄.배지 === null ? null : <span className={`scout-badge ${배지색(줄.배지)}`}>{줄.배지}</span>}
            <글들 조각들={줄.글} />
          </li>
        ))}
      </ul>
      {다봄 || 줄들.length <= 목록상한 ? null : (
        <button type="button" className="scout-more" onClick={() => set다봄(true)}>
          {t('나머지 {수}건 보기', { 수: 줄들.length - 목록상한 })}
        </button>
      )}
    </>
  );
}

function 진행줄({ 단계들 }: { 단계들: 단계[] }) {
  const t = use말();
  return (
    <ul className="scout-steps" aria-live="polite">
      {단계들.map((s, i) => (
        <li key={i} className={s.done ? 'done' : undefined}>
          {s.done ? 체크() : <span className="scout-pulse" aria-hidden="true" />}
          {단계글(s, t)}
        </li>
      ))}
    </ul>
  );
}

const 끝글: Partial<Record<질문['status'], string>> = {
  STOPPED: '질문을 중단했습니다',
  TIMEOUT: '답이 2분을 넘어 중단했습니다',
  FAILED: '답을 만들지 못했습니다',
};

export function ScoutAnswer({ q, btsUrl, 앞, 꺼짐, 다시질문 }: { q: 질문; btsUrl: string | null; 앞: number | null; 꺼짐: boolean; 다시질문: (() => void) | null }) {
  const t = use말();
  const [펼침, set펼침] = useState(false);
  const 끝 = 끝글[q.status];
  // 조각이 올 때마다 모든 질문이 다시 그려진다 — 바뀌지 않은 답을 다시 풀지 않는다
  const 덩이들 = useMemo(() => 답풀기(q.answer, btsUrl), [q.answer, btsUrl]);
  const 대기 = q.status === 'QUEUED' && q.steps.length === 0;
  // 작성 서버가 꺼졌으면 앞 수보다 그것을 먼저 알린다 — 앞이 0 인데 차례가 안 와 멈춘 것처럼 보였다 (SCOUT-F1-07)
  const 대기글 = !대기 ? null : 꺼짐 ? t('작성 서버가 꺼져 있어요. 켜지면 바로 답해요') : 앞 !== null && 앞 > 0 ? t('앞에 {수}건 대기 중', { 수: 앞 }) : null;
  return (
    <>
      <div className="scout-me">{q.text}</div>
      <div className="scout-ai">
        {/* 앞 수를 모르거나 0 이면 줄 없이 맥박만 — 차례가 온 질문을 「앞에 0건」 으로 세우지 않는다 */}
        {대기글 !== null ? (
          <ul className="scout-steps" aria-live="polite">
            <li className="wait">
              <span className="scout-pulse gray" aria-hidden="true" />
              {대기글}
            </li>
          </ul>
        ) : null}
        {q.answer === '' ? (
          q.steps.length > 0 ? (
            <진행줄 단계들={q.steps} />
          ) : !끝났나(q.status) && 대기글 === null ? (
            <span className="scout-pulse" aria-hidden="true" />
          ) : null
        ) : q.steps.length === 0 ? null : (
          <>
            <button type="button" className="scout-fold" aria-expanded={펼침} onClick={() => set펼침(!펼침)}>
              {체크()}
              {t('확인한 것 {수}건', { 수: q.steps.length })}
              <span aria-hidden="true">{펼침 ? '⌃' : '›'}</span>
            </button>
            {펼침 ? <진행줄 단계들={q.steps} /> : null}
          </>
        )}
        {덩이들.map((덩이, i) =>
          덩이.꼴 === 'para' ? (
            <p key={i}>
              <글들 조각들={덩이.줄} />
            </p>
          ) : (
            <목록 key={i} 줄들={덩이.rows} />
          ),
        )}
        {끝 === undefined ? null : (
          // 사람이 누른 중단은 오류가 아니라 회색 상자다. 시간 초과 · 실패만 오류 색이다 (DESIGN.md 원칙 1)
          <div className={q.status === 'STOPPED' ? 'scout-ended stopped' : 'scout-ended'} role="status">
            <span>{t(끝)}</span>
            {다시질문 === null ? null : (
              <button type="button" className="btn small" onClick={다시질문}>
                {t('다시 질문')}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
