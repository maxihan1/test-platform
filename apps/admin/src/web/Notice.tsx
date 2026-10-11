// 본문 맨 위 한 줄 — 왼쪽에 도는 실행 · 작성과 갓 끝난 소식, 오른쪽 끝에 늘 「알림」 버튼 (SPEC 공통/5-화면공통 §8 「알림」)

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type NoticeResponse } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { NoticeDrawer } from './NoticeDrawer.js';
import { 읽음들, 읽음바뀜, 읽음으로적는다, 읽음정리 } from './noticeRead.js';
import { 끝난글, 보일줄들, 안읽은수, 읽음열쇠, type 끝난줄, type 도는줄, type 줄 as 줄타입 } from './noticeView.js';

/**
 * 도는 것이 있으면 3초, 없으면 20초마다 묻는다. 서비스 고르개와 상관없이 볼 수 있는 서비스 전체를 받는다.
 * 실행 칸을 볼 수 있는 서비스가 하나도 없으면 서버가 403 을 준다 — 오류를 띄우지 않고 `막힘` 으로 알려 다시 묻지도 않는다
 */
function use알림받기(): { 답: NoticeResponse | null; 막힘: boolean } {
  const [답, set답] = useState<NoticeResponse | null>(null);
  const [막힘, set막힘] = useState(false);
  const 도는중 = 답 !== null && 답.running.length > 0;

  useEffect(() => {
    if (막힘) return;
    let 끝 = false;
    const 묻는다 = () => {
      void api
        .notifications()
        .then((온것) => {
          if (!끝) set답(온것);
        })
        .catch((err: unknown) => {
          if (!끝 && err instanceof ApiError && err.status === 403) set막힘(true);
          // 그 밖의 실패는 알림이 곁들이라 마지막으로 받은 것을 그대로 두고 다음 주기에 다시 묻는다
        });
    };
    묻는다();
    const timer = setInterval(묻는다, 도는중 ? 3000 : 20000);
    return () => {
      끝 = true;
      clearInterval(timer);
    };
  }, [도는중, 막힘]);

  return { 답, 막힘 };
}

function 막대({ 줄 }: { 줄: 도는줄 }) {
  if (줄.막대 === null) return null;
  const { 통과, 실패, 미실행, 남음 } = 줄.막대;
  // 색은 막대(도형)다 — 숫자는 앞 글에 있어 색만으로 전하지 않는다 (RunProgressModal 의 막대와 같은 토큰)
  return (
    <span className="nt-mini" aria-hidden="true">
      <i style={{ flex: 통과, background: 'var(--pass)' }} />
      <i style={{ flex: 실패, background: 'var(--fail)' }} />
      <i style={{ flex: 미실행, background: 'var(--na)' }} />
      <i style={{ flex: 남음, background: 'var(--chart-track)' }} />
    </span>
  );
}

function 도는줄그림({ 줄 }: { 줄: 도는줄 }) {
  const t = use말();
  return (
    <div className="nt-line">
      {/* 실제로 도는 동안만 맥박이 뛴다 — 되풀이 움직임은 이것 하나다 (DESIGN.md 원칙 4) */}
      <span className="pulse" aria-hidden="true" />
      <span className="nt-text">{줄.앞글}</span>
      <막대 줄={줄} />
      {줄.뒷글 === null ? null : <span className="nt-sub">{줄.뒷글}</span>}
      <small className="nt-svc">{줄.서비스}</small>
      <a className="nt-go" href={줄.열기}>
        {t('열기')}
      </a>
    </div>
  );
}

const 모양글자 = { pass: '✓', fail: '✕', halt: '■' } as const;

function 끝난줄그림({ 줄, on읽음 }: { 줄: 끝난줄; on읽음: (열쇠들: string[]) => void }) {
  const t = use말();
  return (
    <div className="nt-line">
      {/* 판정 색은 글자 곁의 아이콘에만 쓴다 — 집계가 글로 같이 있어 색만으로 전하지 않는다 (DESIGN.md 원칙 1 · 5) */}
      <span className={['nt-ico', 줄.모양].join(' ')} aria-hidden="true">
        {모양글자[줄.모양]}
      </span>
      <span className="nt-text">{끝난글(줄)}</span>
      {줄.확인필요 === 0 ? null : (
        <span className="nt-sub">
          {t('PRD 확인 필요 {수}건', { 수: 줄.확인필요 })}{' '}
          <a href="#/prd" onClick={() => on읽음([줄.열쇠])}>
            {t('PRD 관리')}
          </a>
        </span>
      )}
      <small className="nt-svc">{줄.서비스}</small>
      <a className="nt-go" href={줄.열기} onClick={() => on읽음([줄.열쇠])}>
        {줄.열기라벨}
      </a>
      <button className="nt-x" aria-label={t('알림 닫기')} onClick={() => on읽음([줄.열쇠])}>
        ×
      </button>
    </div>
  );
}

function 한줄({ 줄 }: { 줄: 줄타입 }) {
  return 줄.도는중 ? <도는줄그림 줄={줄} /> : <끝난줄그림 줄={줄} on읽음={읽음으로적는다} />;
}

/** `줄숨김` — 대시보드처럼 여러 서비스를 함께 보는 자리는 줄을 숨기고 버튼만 둔다 */
export function Notice({ 줄숨김 }: { 줄숨김: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const { 답, 막힘 } = use알림받기();
  const [읽음, set읽음] = useState(읽음들);
  const [열림, set열림] = useState(false);
  const 버튼 = useRef<HTMLButtonElement>(null);

  // 같은 탭의 실행 결과 화면이 읽음으로 적어도(`runState.ts`), 다른 탭에서 적어도 바로 따라온다
  useEffect(() => {
    const 다시읽는다 = () => set읽음(읽음들());
    window.addEventListener(읽음바뀜, 다시읽는다);
    window.addEventListener('storage', 다시읽는다);
    return () => {
      window.removeEventListener(읽음바뀜, 다시읽는다);
      window.removeEventListener('storage', 다시읽는다);
    };
  }, []);

  // 서버 목록(7일)에 없는 열쇠는 지운다 — 읽음 목록이 끝없이 커지지 않게
  useEffect(() => {
    if (답 === null) return;
    읽음정리(new Set(답.recent.map(읽음열쇠)));
    set읽음(읽음들());
  }, [답]);

  if (막힘) return null;

  const 지금 = Date.now();
  const { 줄들, 넘친수 } = 답 === null || 줄숨김 ? { 줄들: [], 넘친수: 0 } : 보일줄들(답, 읽음, 지금, 언어);
  const 안읽음 = 답 === null ? 0 : 안읽은수(답.recent, 읽음);

  const 닫는다 = () => {
    set열림(false);
    버튼.current?.focus();
  };

  return (
    <>
      <div className="nt-top">
        {줄들.length === 0 ? null : (
          <div className="nt-lines">
            {줄들.map((줄) => (
              <한줄 key={줄.열쇠} 줄={줄} />
            ))}
            {넘친수 === 0 ? null : (
              <div className="nt-line">
                <button className="nt-more" onClick={() => set열림(true)}>
                  {t('외 {수}건 — 알림 열기', { 수: 넘친수 })}
                </button>
              </div>
            )}
          </div>
        )}
        <button ref={버튼} className="nt-btn" aria-expanded={열림} aria-controls="nt-drawer" onClick={() => set열림(!열림)}>
          <아이콘 이름="bell" />
          {t('알림')}
          {/* 숫자가 늘 때 한 번 커졌다 돌아온다 — key 가 바뀌면 다시 그려져 움직임이 한 번 돈다 (DESIGN.md 원칙 4) */}
          {안읽음 === 0 ? null : (
            <span key={안읽음} className="nt-badge" aria-label={t('안 읽은 알림 {수}건', { 수: 안읽음 })}>
              {안읽음 > 99 ? '99+' : 안읽음}
            </span>
          )}
        </button>
      </div>
      {!열림 || 답 === null ? null : <NoticeDrawer recent={답.recent} 읽음={읽음} 지금={지금} onClose={닫는다} on읽음={읽음으로적는다} />}
    </>
  );
}
