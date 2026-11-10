// Scout — 레이더 버튼과 채팅창. PC 는 버튼 자리에서 열리는 400 × 640 창, 휴대폰은 전체 화면이다 (도메인/챗봇 §8.18)
// 버튼은 끌어서 옮기고, 창은 버튼에서 커지고 줄어든다. 휴대폰 창은 뒤로 가기 · 머리 줄 아래로 쓸기로도 닫힌다

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { use말, use언어 } from './i18n.js';
import { ScoutAnswer } from './ScoutAnswer.js';
import { ScoutComposer } from './ScoutComposer.js';
import { useHud끌기 } from './scoutHud.js';
import { 끝났나 } from './scoutView.js';
import { useScout } from './useScout.js';
import { use음성 } from './useVoice.js';

const 예시들 = ['오늘 실행 결과 요약', '최근 등록된 이슈', '회귀 실패만 보기', '어제 성능 테스트 결과'];
// 닫는 움직임 길이(--t3). 그동안 창을 남겨 두고 끝나면 내린다
const 닫는시간 = 300;
// 휴대폰 머리 줄을 이만큼 넘게 끌어내리면 닫는다
const 쓸기문턱 = 80;
const 뒤로칸인가 = () => (window.history.state as { scout?: unknown } | null)?.scout === true;

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
  const [닫는중, set닫는중] = useState(false);
  const s = useScout(projectId, 열림);
  const [글, set글] = useState('');
  const 본문 = useRef<HTMLDivElement>(null);
  const 칸 = useRef<HTMLTextAreaElement>(null);
  const 버튼 = useRef<HTMLButtonElement>(null);
  const 닫기타이머 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [알림, set알림] = useState(false);
  const hud = useHud끌기(휴대폰, 열림);
  const 음성 = use음성(use언어(), set글);
  // 휴대폰 머리 줄을 끌어내린 거리. 놓아서 닫으면 그 자리에서 이어 내려간다
  const [쓸기, set쓸기] = useState<{ 시작: number; dy: number } | null>(null);
  const [쓸어닫음, set쓸어닫음] = useState(0);

  // 답이 쓰이는 대로, 그리고 다시 열 때 맨 아래를 보인다
  useEffect(() => {
    if (본문.current !== null) 본문.current.scrollTop = 본문.current.scrollHeight;
  }, [s.질문들, 열림]);

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
    if (닫기타이머.current !== null) clearTimeout(닫기타이머.current);
    set닫는중(false);
    set쓸어닫음(0);
    set열림(true);
    s.도착봄();
    set알림(false);
  };

  /** 창을 내린다. 움직임이 끝날 때까지 창을 남겨 둔다. 화면을 옮겨 닫힐 때는 버튼으로 포커스를 끌어오지 않는다 */
  const 내리기 = (포커스 = true) => {
    음성.끝();
    set열림(false);
    set닫는중(true);
    if (닫기타이머.current !== null) clearTimeout(닫기타이머.current);
    닫기타이머.current = setTimeout(() => set닫는중(false), 닫는시간);
    if (포커스) 버튼.current?.focus();
  };

  // 휴대폰에서 연 창은 뒤로 가기 기록의 한 칸이다 — ⌄ · 쓸기로 닫으면 그 칸을 걷어 뒤로 가기가 한 번 헛돌지 않게 한다
  const 닫기 = () => (휴대폰 && 뒤로칸인가() ? window.history.back() : 내리기());

  // 휴대폰은 열 때 뒤로 가기 기록을 하나 쌓는다 (화면공통 §8 「하나를 여는 일은 뒤로 가기 기록을 쌓는다」).
  // 주소가 그대로라 화면은 다시 그려지지 않는다. 창 안 링크로 화면을 옮기면 창을 내린다 — 전체 화면 창이 새 화면을 덮으면 옮긴 보람이 없다
  useEffect(() => {
    if (!열림 || !휴대폰) return;
    window.history.pushState({ ...(window.history.state as object | null), scout: true }, '');
    const 뒤로 = () => {
      if (!뒤로칸인가()) 내리기();
    };
    const 옮김 = () => 내리기(false);
    window.addEventListener('popstate', 뒤로);
    window.addEventListener('hashchange', 옮김);
    return () => {
      window.removeEventListener('popstate', 뒤로);
      window.removeEventListener('hashchange', 옮김);
    };
  }, [열림, 휴대폰]);

  useEffect(
    () => () => {
      if (닫기타이머.current !== null) clearTimeout(닫기타이머.current);
    },
    [],
  );

  // 처음 읽기가 오기 전에는 보내지 않는다 — 서버의 대화를 모른 채 넣으면 도는 질문과 부딪친다(BUSY)
  const 보낼수 = s.질문들 !== null && !s.도는중;
  const 보내기 = (보낼글: string) => {
    const 다듬은 = 보낼글.trim();
    if (다듬은 === '' || !보낼수) return;
    음성.끝();
    set글('');
    // 못 넣었으면 쓴 글을 되돌린다 — 2,000자를 다시 치게 하지 않는다
    void s.묻기(다듬은).then((넣음) => {
      if (!넣음) set글((지금) => (지금 === '' ? 보낼글 : 지금));
    });
  };

  const 버튼이름 = 열림 ? t('Scout 닫기') : s.도착 ? t('Scout 열기 · 답 도착') : s.도는중 ? t('Scout 열기 · 답 만드는 중') : t('Scout 열기');
  const 질문들 = s.질문들 ?? [];
  const 마지막 = 질문들.at(-1);
  // 버튼 · 안내 · PC 창이 같은 자리 값을 쓴다. 옮긴 적이 없으면 CSS 의 처음 자리(오른쪽 아래)다 (scoutHud.css)
  const 자리 = hud.자리;
  const 틀모양 = (자리 === null ? {} : { '--hud-y': `${자리.y}px` }) as CSSProperties;
  const 끄는곳 = hud.끄는곳;
  const 내린거리 = 쓸기?.dy ?? 쓸어닫음;

  return (
    <div className={`scout${자리 === null ? '' : ' moved'}${자리?.쪽 === 'left' ? ' left' : ''}`} style={틀모양}>
      {알림 ? (
        <div className="scout-tip" role="status">
          {t('답이 도착했어요')}
        </div>
      ) : null}
      <button
        ref={버튼}
        type="button"
        className={`scout-hud${열림 ? ' open' : ''}${끄는곳 === null ? '' : ' dragging'}`}
        style={끄는곳 === null ? undefined : { left: 끄는곳.x, top: 끄는곳.y, right: 'auto', bottom: 'auto' }}
        aria-label={버튼이름}
        aria-expanded={열림}
        {...hud.손잡이}
        onClick={() => {
          if (hud.끈뒤클릭()) return;
          if (열림) 닫기();
          else 열기();
        }}
      >
        {/* 답을 만드는 동안 창이 닫혀 있으면 고리가 맥박친다 — 열려 있으면 창의 진행 줄이 알린다 */}
        {s.도는중 && !열림 ? <span className="scout-ring" aria-hidden="true" /> : null}
        {레이더()}
        <span className="scout-name" aria-hidden="true">
          Scout
        </span>
        {s.도착 ? <span className="scout-dot" aria-hidden="true" /> : null}
      </button>
      {!열림 && !닫는중 ? null : (
        <section
          className={`scout-win${열림 ? '' : ' closing'}${쓸기 === null ? '' : ' swiping'}`}
          role="dialog"
          aria-label="Scout"
          aria-hidden={!열림}
          inert={!열림}
          style={휴대폰 && 내린거리 > 0 ? ({ '--drag': `${내린거리}px` } as CSSProperties) : undefined}
        >
          <header
            className="scout-head"
            onPointerDown={(e) => {
              // 단추를 누른 것은 쓸기가 아니다
              if (!휴대폰 || !열림 || (e.target as Element).closest('button') !== null) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              set쓸기({ 시작: e.clientY, dy: 0 });
            }}
            onPointerMove={(e) => {
              if (쓸기 !== null) set쓸기({ 시작: 쓸기.시작, dy: Math.max(0, e.clientY - 쓸기.시작) });
            }}
            onPointerUp={() => {
              if (쓸기 === null) return;
              set쓸기(null);
              // 덜 끌었으면 제자리로 돌아간다. 넘겼으면 끈 자리에서 이어 내려간다
              if (쓸기.dy > 쓸기문턱) {
                set쓸어닫음(쓸기.dy);
                닫기();
              }
            }}
            onPointerCancel={() => set쓸기(null)}
          >
            {/* 휴대폰 머리에는 레이더 표시가 없다 — 폭이 좁아 이름 · 초기화 · 닫기만 둔다 (시안 휴대폰 ②) */}
            {휴대폰 ? null : <span className="scout-mark">{레이더()}</span>}
            <div className="scout-title">
              <strong>Scout</strong>
              <small>{projectName}</small>
            </div>
            <button type="button" className="btn ghost small" onClick={() => void s.초기화()}>
              {t('대화 초기화')}
            </button>
            <button type="button" className="scout-x" aria-label={t('닫기')} onClick={닫기}>
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
          <ScoutComposer
            칸={칸}
            글={글}
            set글={set글}
            보내기={보내기}
            보낼수={보낼수}
            도는중={s.도는중}
            중단={() => void s.중단()}
            음성={음성}
          />
          <p className="scout-scope">{t('{프로젝트} 프로젝트의 데이터로만 답해요', { 프로젝트: projectName })}</p>
        </section>
      )}
    </div>
  );
}
