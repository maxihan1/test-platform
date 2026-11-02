// 알림 서랍 — 오른쪽에서 나오는 가로막지 않는 패널. 볼 수 있는 서비스 전체의 최근 7일 끝난 실행 · 작성을 보인다 (SPEC 공통/5-화면공통 §8 「알림」)

import { useEffect, useRef, useState } from 'react';

import type { NoticeRecent } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 거르개, 끝난줄만들기, 서랍목록, 상대시각, 안읽은수, 읽음열쇠 } from './noticeView.js';
import { use휴대폰 } from './phone.js';
import { 손잡이, use끌어닫기 } from './Sheet.js';

interface Props {
  recent: NoticeRecent[];
  읽음: ReadonlySet<string>;
  지금: number;
  onClose: () => void;
  on읽음: (열쇠들: string[]) => void;
  /** 작성 · PRD 고리는 사이드바 서비스로 읽는다 — 누르기 전에 그 알림의 서비스로 바꾼다 */
  서비스바꿈: (접두사: string) => void;
}

export function NoticeDrawer({ recent, 읽음, 지금, onClose, on읽음, 서비스바꿈 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [고른거르개, set거르개] = useState<거르개>('all');
  const 닫기 = useRef<HTMLButtonElement>(null);
  // 휴대폰에서는 아래에서 올라오는 전체 화면 판이라 다른 서랍처럼 손잡이로 끌어 닫는다 (DESIGN.md 「휴대폰의 창」)
  const 휴대폰 = use휴대폰();
  const 끌기 = use끌어닫기(onClose);

  // 모달이 아니라 포커스를 가두지 않는다. 다만 열면 닫는 버튼으로 들어가야 키보드만 쓰는 사람이 서랍을 찾는다
  useEffect(() => {
    닫기.current?.focus();
  }, []);

  useEffect(() => {
    const 누름 = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', 누름);
    return () => document.removeEventListener('keydown', 누름);
  }, [onClose]);

  const 안읽음 = 안읽은수(recent, 읽음);
  const 목록 = 서랍목록(recent, 읽음, 고른거르개);
  const 칩들: [거르개, string][] = [
    ['all', t('전체')],
    ['run', t('실행')],
    ['authoring', t('작성')],
    ['unread', t('안 읽음 {수}', { 수: 안읽음 })],
  ];

  return (
    <aside className="nt-drawer" id="nt-drawer" aria-label={t('알림')} style={휴대폰 ? 끌기.판 : undefined}>
      {휴대폰 ? <손잡이 끌기={끌기} /> : null}
      <div className="nt-drawer-head">
        <h2>{t('알림')}</h2>
        <button className="btn ghost" onClick={() => on읽음(recent.map(읽음열쇠))} disabled={안읽음 === 0}>
          {t('모두 읽음으로')}
        </button>
        <button ref={닫기} className="nt-x" aria-label={t('닫기')} onClick={onClose}>
          ×
        </button>
      </div>

      <div className="nt-chips">
        {칩들.map(([값, 글]) => (
          <button key={값} className={값 === 고른거르개 ? 'nt-chip on' : 'nt-chip'} aria-pressed={값 === 고른거르개} onClick={() => set거르개(값)}>
            {글}
          </button>
        ))}
      </div>

      {목록.length === 0 ? (
        <p className="nt-empty">{recent.length === 0 ? t('최근 7일 동안 끝난 실행과 작성이 없습니다') : t('조건에 맞는 알림이 없습니다')}</p>
      ) : (
        <ul className="nt-list">
          {목록.map((n) => {
            const 줄 = 끝난줄만들기(n, 언어);
            const 안읽었나 = !읽음.has(줄.열쇠);
            return (
              <li key={줄.열쇠} className={안읽었나 ? 'nt-item unread' : 'nt-item'}>
                <a
                  className="nt-item-link"
                  href={줄.열기}
                  onClick={() => {
                    if (줄.종류 === 'authoring') 서비스바꿈(줄.접두사);
                    on읽음([줄.열쇠]);
                    onClose();
                  }}
                >
                  <span className="nt-dot" aria-hidden="true" />
                  <span className="nt-item-body">
                    <span className="nt-item-title">{줄.머리}</span>
                    <span className="nt-item-sub">{[...줄.집계, 줄.서비스].join(' · ')}</span>
                  </span>
                  <time className="nt-item-time" dateTime={줄.끝난때}>
                    {상대시각(줄.끝난때, 지금, 언어)}
                  </time>
                </a>
                {줄.확인필요 === 0 ? null : (
                  <div className="nt-item-prd">
                    <span className="case-tag">{t('PRD 확인 필요 {수}건', { 수: 줄.확인필요 })}</span>
                    <a
                      href="#/authoring?todo=1"
                      onClick={() => {
                        서비스바꿈(줄.접두사);
                        on읽음([줄.열쇠]);
                        onClose();
                      }}
                    >
                      {t('결정 필요에서 확인')}
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="nt-foot">{t('볼 수 있는 애플리케이션 전체 · 최근 7일')}</p>
    </aside>
  );
}
