// 설정 > 서비스 화면의 구획 틀 · 비밀값 칸 · 프로젝트 칸 · 접두사 칸 (SettingsService.tsx 가 300줄에 닿지 않게 뗐다)

import type { ReactNode } from 'react';

import { use말, use언어 } from './i18n.js';
import { 웹훅칸 } from './settingsView.js';

/** 설정 구획 하나 — 제목과 「어디에 쓰이나」 한 줄. 무슨 설정인지 칸 이름만으로는 안 읽혔다 (2026-10-07 사용자) */
export function 구획({ 제목, 쓰임, 경고 = false, children }: { 제목: string; 쓰임: string; 경고?: boolean; children: ReactNode }) {
  return (
    <section className={경고 ? 'set-card warn' : 'set-card'}>
      <div className="set-card-h">
        <h3>{제목}</h3>
        <p>{쓰임}</p>
      </div>
      {children}
    </section>
  );
}

/** 비밀값 칸 — 웹훅과 피그마 토큰이 같이 쓴다. 값을 되돌려 안 보여서 고치는 길이 「변경」이다 (§8.8) */
export function 비밀칸(p: {
  id: string; 이름: string; 설정됨: boolean; placeholder: string; 비울때: string;
  값: string | null; 바꾼다: (값: string | null) => void; children?: ReactNode;
}) {
  const t = use말();
  const 칸 = 웹훅칸(p.설정됨, use언어());
  return (
    <div className="field">
      <label htmlFor={p.id}>{p.이름}</label>
      <div>
        {p.값 === null ? (
          <div className="set-hook">
            <span>{칸.글}</span>
            {/* 값이 없을 때는 `+` 기호 하나, 있을 때는 글자 「변경」과 `−` — 있는데 `+` 를 또 보이면 헷갈린다. 기호만 보이는 버튼의 이름은 aria-label 이 맡는다 */}
            <button
              className={p.설정됨 ? 'btn ghost' : 'btn ghost icon'}
              aria-label={p.설정됨 ? t('{이름} 변경', { 이름: p.이름 }) : t('{이름} 추가', { 이름: p.이름 })}
              title={p.설정됨 ? undefined : t('{이름} 추가', { 이름: p.이름 })}
              onClick={() => p.바꾼다('')}
            >
              {칸.버튼}
            </button>
            {p.설정됨 ? (
              // 지우는 길도 빈 칸을 저장하는 것이다 — 서버가 「빈 글자 = 지움」으로 받는다. 저장 전에 「변경 취소」로 물릴 수 있다
              <button className="btn ghost icon" aria-label={t('{이름} 삭제', { 이름: p.이름 })} title={t('{이름} 삭제', { 이름: p.이름 })} onClick={() => p.바꾼다('')}>
                −
              </button>
            ) : null}
          </div>
        ) : (
          <div className="set-hook">
            <input id={p.id} type="password" value={p.값} placeholder={p.placeholder}
              onChange={(e) => p.바꾼다(e.target.value)} />
            {/* 되돌아갈 길이 없으면, 마음을 바꿔 그냥 저장했을 때 빈 글자가 가서 값이 지워진다 */}
            <button className="btn ghost" aria-label={t('{이름} 변경 취소', { 이름: p.이름 })} onClick={() => p.바꾼다(null)}>
              {t('변경 취소')}
            </button>
          </div>
        )}
        <div className="hint">
          {p.값 === '' ? p.비울때 : t('저장한 값은 보안상 다시 표시하지 않습니다')}
        </div>
        {p.children}
      </div>
    </div>
  );
}

/** 애플리케이션이 속한 프로젝트 — 이름만 보인다. 옮기는 일은 프로젝트 화면이 맡는다(옮기면 그 프로젝트의 권한을 따르게 되어 한 자리에서만 하게 한다) */
export function 프로젝트칸({ 지금 }: { 지금: { id: number; name: string } }) {
  const t = use말();
  return (
    <div className="field">
      <span className="field-label">{t('프로젝트§칸')}</span>
      <div>
        <a href={`#/settings/project-${지금.id}`}>{지금.name}</a>
        <div className="hint">{t('다른 프로젝트로 옮기려면 프로젝트 화면에서 합니다')}</div>
      </div>
    </div>
  );
}

/** 접두사 — 만들 때 마법사에서만 적는다. 케이스 번호에 박혀 나중에 바꾸면 기존 케이스가 어느 애플리케이션 것도 아니게 된다 (SPEC §8.8) */
export function 접두사칸({ 값 }: { 값: string }) {
  const t = use말();
  return (
    <div className="field">
      <label htmlFor="sf-prefix">{t('접두사')}</label>
      <div>
        <input id="sf-prefix" type="text" value={값} disabled />
        <div className="hint">{t('만든 뒤에는 바꿀 수 없습니다. 케이스 번호에 이미 쓰고 있습니다')}</div>
      </div>
    </div>
  );
}
