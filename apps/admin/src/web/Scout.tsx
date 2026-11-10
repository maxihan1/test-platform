// Scout — 레이더 버튼과 채팅창. PC 는 버튼 자리에서 열리는 400 × 640 창, 휴대폰은 전체 화면이다 (도메인/챗봇 §8.18)
// 버튼의 끌기 · 다섯 상태 움직임 · 열고 닫는 움직임 · 뒤로 가기 · 🎤 는 SCOUT-F1-06 이 더한다

import { useEffect, useRef, useState } from 'react';

import { use말 } from './i18n.js';
import { ScoutAnswer } from './ScoutAnswer.js';
import { 끝났나 } from './scoutView.js';
import { useScout } from './useScout.js';

const 글최대 = 2000;
const 예시들 = ['오늘 실행 결과 요약', '최근 등록된 이슈', '회귀 실패만 보기', '어제 성능 테스트 결과'];

function 레이더() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 12l6-6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function Scout({ projectId, projectName, 휴대폰 }: { projectId: number; projectName: string; 휴대폰: boolean }) {
  const t = use말();
  const [열림, set열림] = useState(false);
  const s = useScout(projectId, 열림);
  const [글, set글] = useState('');
  const 본문 = useRef<HTMLDivElement>(null);
  const 칸 = useRef<HTMLTextAreaElement>(null);
  const [알림, set알림] = useState(false);

  // 답이 쓰이는 대로 맨 아래를 보인다
  useEffect(() => {
    if (본문.current !== null) 본문.current.scrollTop = 본문.current.scrollHeight;
  }, [s.질문들]);

  useEffect(() => {
    if (열림) 칸.current?.focus();
  }, [열림]);

  // 닫힌 동안 답이 도착하면 버튼 위 안내를 3초 띄운다 (§8.18 ⑤)
  useEffect(() => {
    if (!s.도착) return;
    set알림(true);
    const 타이머 = setTimeout(() => set알림(false), 3000);
    return () => clearTimeout(타이머);
  }, [s.도착]);

  const 열기 = () => {
    set열림(true);
    s.도착봄();
    set알림(false);
  };

  const 보내기 = (보낼글: string) => {
    const 다듬은 = 보낼글.trim();
    if (다듬은 === '' || s.도는중) return;
    set글('');
    void s.묻기(다듬은);
  };

  const 버튼이름 = 열림 ? t('Scout 닫기') : s.도착 ? t('Scout 열기 · 답 도착') : s.도는중 ? t('Scout 열기 · 답 만드는 중') : t('Scout 열기');
  const 질문들 = s.질문들 ?? [];
  const 마지막 = 질문들.at(-1);

  return (
    <>
      {알림 ? (
        <div className="scout-tip" role="status">
          {t('답이 도착했어요')}
        </div>
      ) : null}
      <button type="button" className={`scout-hud${열림 ? ' open' : ''}`} aria-label={버튼이름} aria-expanded={열림} onClick={() => (열림 ? set열림(false) : 열기())}>
        {레이더()}
        {s.도착 ? <span className="scout-dot" aria-hidden="true" /> : null}
      </button>
      {!열림 ? null : (
        <section className="scout-win" role="dialog" aria-label="Scout">
          <header className="scout-head">
            {휴대폰 ? null : <span className="scout-mark">{레이더()}</span>}
            <div className="scout-title">
              <strong>Scout</strong>
              <small>{projectName}</small>
            </div>
            <button type="button" className="btn ghost small" onClick={() => void s.초기화()}>
              {t('대화 초기화')}
            </button>
            <button type="button" className="scout-x" aria-label={t('닫기')} onClick={() => set열림(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={휴대폰 ? 'M6 9l6 6 6-6' : 'M6 6l12 12M18 6L6 18'} />
              </svg>
            </button>
          </header>
          <div className="scout-body" ref={본문}>
            {s.읽기오류 !== null ? (
              <p className="scout-error" role="alert">
                {s.읽기오류}
              </p>
            ) : s.질문들 === null ? null : 질문들.length === 0 ? (
              <div className="scout-hello">
                <h3>{t('{프로젝트} 프로젝트에 대해 물어보세요', { 프로젝트: projectName })}</h3>
                <p>{t('실행 결과 · 이슈 · PRD 를 확인해서 답해요. 아래 예시를 눌러도 돼요.')}</p>
                <div className="scout-chips">
                  {예시들.map((예) => (
                    <button key={예} type="button" className="scout-chip" onClick={() => 보내기(t(예))}>
                      {t(예)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              질문들.map((q) => (
                <ScoutAnswer key={q.id} q={q} btsUrl={s.btsUrl} 앞={s.앞} 다시질문={q === 마지막 && 끝났나(q.status) ? () => 보내기(q.text) : null} />
              ))
            )}
          </div>
          {s.묻기오류 === null ? null : (
            <p className="scout-error" role="alert">
              {s.묻기오류}
            </p>
          )}
          <div className="scout-comp">
            <label className="sr-only" htmlFor="scout-q">
              {t('질문')}
            </label>
            <textarea
              id="scout-q"
              ref={칸}
              rows={Math.min(5, 글.split('\n').length)}
              maxLength={글최대}
              placeholder={t('질문을 입력하세요')}
              value={글}
              onChange={(e) => set글(e.target.value)}
              onKeyDown={(e) => {
                // 한글 조합 중의 Enter 는 글자를 마무리하는 키다 — 보내지 않는다
                if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
                e.preventDefault();
                보내기(글);
              }}
            />
            {s.도는중 ? (
              <button type="button" className="scout-stop" onClick={() => void s.중단()}>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
                </svg>
                {t('중단§Scout')}
              </button>
            ) : (
              <button type="button" className="scout-send" aria-label={t('보내기')} disabled={글.trim() === ''} onClick={() => 보내기(글)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
          <p className="scout-scope">{t('{프로젝트} 프로젝트의 데이터로만 답해요', { 프로젝트: projectName })}</p>
        </section>
      )}
    </>
  );
}
