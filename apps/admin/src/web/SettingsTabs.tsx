// 설정 화면의 탭 틀 — 애플리케이션 설정과 프로젝트 설정이 같이 쓴다. 탭 줄 · 화살표 이동 · 탭 칸과 「필요한 것」 상자

import type { KeyboardEvent, ReactNode } from 'react';

import { use말 } from './i18n.js';
import type { 탭상태값, 탭필요 } from './settingsView.js';

export interface 설정탭 {
  /** 화면에 안 나가는 식별자 */
  값: string;
  이름: string;
  상태?: 탭상태값;
  /** 저장 안 한 변경이 있다 — 이름 옆에 점을 단다 */
  바뀜?: boolean;
  /** 있으면 주소로 가는 탭이다(프로젝트 설정). 없으면 단추다 */
  href?: string;
}

const 톤클래스 = { ok: 'is-ok', warn: 'is-warn', dim: 'is-dim' } as const;

/**
 * @param 아이디 탭 · 탭 칸의 id 머리. 한 화면에 탭 틀이 하나뿐이라 접두사만 다르면 된다
 * @param 이동 탭을 고르는 길. 화살표 키가 부른다 — 주소 탭은 주소를 바꾼다
 */
export function SettingsTabs({
  이름,
  아이디,
  탭들,
  고른,
  이동,
  children,
}: {
  이름: string;
  아이디: string;
  탭들: 설정탭[];
  고른: string;
  이동: (값: string) => void;
  children: ReactNode;
}) {
  const t = use말();
  const 지금 = 탭들.some((it) => it.값 === 고른) ? 고른 : 탭들[0]?.값;

  function 키누름(e: KeyboardEvent, 자리: number) {
    const 방향 = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (방향 === 0) return;
    e.preventDefault();
    const 다음 = 탭들[(자리 + 방향 + 탭들.length) % 탭들.length];
    if (다음 === undefined) return;
    이동(다음.값);
    document.getElementById(`${아이디}-tab-${다음.값}`)?.focus();
  }

  return (
    <>
      <div role="tablist" aria-label={이름} className="set-tabs">
        {탭들.map((it, i) => {
          const 속성 = {
            role: 'tab',
            id: `${아이디}-tab-${it.값}`,
            className: 'set-tab',
            'aria-selected': it.값 === 지금,
            'aria-controls': `${아이디}-panel`,
            tabIndex: it.값 === 지금 ? 0 : -1,
            onKeyDown: (e: KeyboardEvent) => 키누름(e, i),
          };
          const 속 = (
            <>
              <span className="set-tab-name">
                {it.이름}
                {it.바뀜 === true ? (
                  <span className="set-tab-dot" role="img" aria-label={t('저장 안 한 변경 있음')}>
                    ·
                  </span>
                ) : null}
              </span>
              {it.상태 === undefined ? null : <span className={`set-tab-state ${톤클래스[it.상태.톤]}`}>{it.상태.글}</span>}
            </>
          );
          return it.href === undefined ? (
            <button key={it.값} type="button" {...속성} onClick={() => 이동(it.값)}>
              {속}
            </button>
          ) : (
            <a key={it.값} href={it.href} {...속성}>
              {속}
            </a>
          );
        })}
      </div>
      <div role="tabpanel" id={`${아이디}-panel`} aria-labelledby={지금 === undefined ? undefined : `${아이디}-tab-${지금}`} className="set-tabpanel">
        {children}
      </div>
    </>
  );
}

/** 탭 맨 위 회색 상자 — 이 탭 일이 되려면 무엇이 있어야 하나. 지금 입력한 값 기준이다 */
export function 필요한것상자({ 제목, 항목들 }: { 제목: string; 항목들: 탭필요[] }) {
  return (
    <div className="set-need">
      <div className="set-need-h">{제목}</div>
      <ul>
        {항목들.map((it) => (
          <li key={it.이름} className={it.됨 ? 'is-ok' : it.필수 ? 'is-warn' : 'is-dim'}>
            <span aria-hidden="true">{it.됨 ? '✓' : '○'}</span> {it.이름} <span className="set-need-why">({it.설명})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
