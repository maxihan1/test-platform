// E2E 실행 창(시험 · 정식)이 같이 쓰는 조각 — 왼쪽 단계 목록과 진행 머리, 오른쪽 장면 칸 자리, 점수 알약 (도메인/실행 §8.16 ⑥)

import { useEffect, useRef, useState, type ReactNode } from 'react';

import './e2eWindow.css';
import { 경과글, 지금번호, type 목록줄 } from './e2eWindowView.js';
import { use말, use언어 } from './i18n.js';
import { 걸린글, 째글 } from './trialView.js';

/** 시작한 뒤 흐른 시간(ms)을 1초마다 새로 읽는다. 시작을 모르면 0 이다 */
export function use경과(시작: number | null): number {
  const [지금, set지금] = useState(() => Date.now());
  useEffect(() => {
    const 틱 = setInterval(() => set지금(Date.now()), 1000);
    return () => clearInterval(틱);
  }, []);
  return 시작 === null ? 0 : Math.max(0, 지금 - 시작);
}

/** 왼쪽 맨 위 `4 / 8 단계` 와 막대, 오른쪽에 경과 */
function 진행머리({ 줄들, 경과ms }: { 줄들: 목록줄[]; 경과ms: number | null }) {
  const t = use말();
  const 끝남 = 줄들.filter((줄) => 줄.상태 === 'done').length;
  return (
    <div className="e2e-prog">
      <div className="e2e-bar" aria-hidden="true">
        <i style={{ width: `${줄들.length === 0 ? 0 : (끝남 / 줄들.length) * 100}%` }} />
      </div>
      <div className="e2e-prog-row">
        <span>
          <b>{지금번호(줄들)}</b> {t('/ {전체} 단계', { 전체: 줄들.length })}
        </span>
        {경과ms === null ? null : <span className="e2e-faint">{t('경과 {시간}', { 시간: 경과글(경과ms) })}</span>}
      </div>
    </div>
  );
}

/**
 * 단계 목록. 번호 · 케이스 번호 꼬리 · 제목, 끝난 단계는 걸린 시간, 지금 단계는 `4초째`, 남은 단계는 흐리게.
 * 이 목록 칸의 scrollTop 만 옮긴다 — scrollIntoView 는 둘레 칸까지 굴린다 (시험 실행 창과 같은 까닭)
 */
function 단계목록({ 줄들 }: { 줄들: 목록줄[] }) {
  const t = use말();
  const 언어 = use언어();
  const 목록 = useRef<HTMLOListElement>(null);
  const 볼줄 = useRef<HTMLLIElement>(null);
  const 지금seq = 줄들.find((줄) => 줄.상태 === 'now')?.seq;

  useEffect(() => {
    const 칸 = 목록.current;
    const li = 볼줄.current;
    if (칸 === null || li === null) return;
    칸.scrollTop = Math.max(0, li.offsetTop + li.offsetHeight - 칸.clientHeight);
  }, [지금seq]);

  return (
    <ol className="trial-now-steps e2e-steps" ref={목록}>
      {줄들.map((줄) => (
        <li key={줄.seq} ref={줄.seq === 지금seq ? 볼줄 : undefined} className={줄.상태} aria-current={줄.상태 === 'now' ? 'step' : undefined}>
          <span className="no">{줄.seq}</span>
          <span>
            <span className="mono e2e-tail">{줄.꼬리}</span> {줄.제목}
          </span>
          <span className="t">
            {줄.기다림 === true
              ? t('기다리는 중')
              : 줄.ms === undefined || 줄.상태 === 'wait'
                ? ''
                : 줄.상태 === 'now'
                  ? 째글(줄.ms, 언어)
                  : 걸린글(줄.ms, 언어)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * 도는 동안의 몸 — 왼쪽 진행 머리 + 단계 목록, 오른쪽 장면 칸이 칸을 채운다.
 * 「크게 보기」는 왼쪽을 접고 장면 칸이 창을 채운다. 휴대폰은 위아래로 쌓고 장면이 목록 위다 (점검표 D12)
 */
/** 경과ms 가 null 이면 머리에 경과를 안 적는다 — 시험 실행 창은 바닥에 한 번 적는다 (점검표 U7) */
export function E2E진행몸({ 줄들, 경과ms, 장면 }: { 줄들: 목록줄[]; 경과ms: number | null; 장면: (크게버튼: ReactNode) => ReactNode }) {
  const t = use말();
  const [크게, set크게] = useState(false);
  const 버튼 = (
    <button type="button" className="btn small ghost e2e-zoom" aria-pressed={크게} onClick={() => set크게((앞) => !앞)}>
      {크게 ? t('작게 보기') : t('크게 보기')}
    </button>
  );
  return (
    <div className={크게 ? 'trial-run e2e-run big' : 'trial-run e2e-run'}>
      <div className="trial-colL">
        <진행머리 줄들={줄들} 경과ms={경과ms} />
        <단계목록 줄들={줄들} />
      </div>
      <div className="trial-colR">{장면(버튼)}</div>
    </div>
  );
}

/** 한 줄 알약 점수 — 0 은 점선 회색이다 (점검표 B18) */
export function 점수알약({ 통과, 실패, 안함 }: { 통과: number; 실패: number; 안함: number }) {
  const t = use말();
  return (
    <>
      <span className={통과 === 0 ? 'pill zero' : 'pill pass'}>{t('통과')} <b>{통과}</b></span>
      <span className={실패 === 0 ? 'pill zero' : 'pill fail'}>{t('실패')} <b>{실패}</b></span>
      <span className={안함 === 0 ? 'pill zero' : 'pill na'}>{t('미실행')} <b>{안함}</b></span>
    </>
  );
}
