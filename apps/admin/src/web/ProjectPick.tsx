// 로그인한 직후 프로젝트를 고르는 화면 (SPEC 공통/5-화면공통 §8 「프로젝트 고르기」). 프로젝트가 둘 이상일 때만 뜬다

import { useState } from 'react';

import type { ServiceRow, User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 종류, 종류이름, 종류차례, 종류차례로, 종류키 } from './kind.js';
import { 로고움직임다시 } from './logoMotion.js';
import { 배정프로젝트들, 프로젝트서비스들, 프로젝트첫앱, type 프로젝트 } from './layout.js';

interface Props {
  user: User;
  /** 마지막에 열었던 애플리케이션. 그 프로젝트를 「최근 프로젝트」로 맨 위에 크게 세우고, 거기서 이 애플리케이션으로 다시 연다 */
  마지막: ServiceRow | null;
  onPick: (prefix: string) => void;
  onLogout: () => void;
}

/** 다른 프로젝트가 이보다 많으면 검색 칸을 단다 — 카드가 두 줄을 넘기기 시작하는 수다(PC 한 줄 셋) */
const 검색다는수 = 6;

/** 카드 머리글자 — 프로젝트 이름의 첫 글자다. 영문은 대문자로 세운다 */
const 머리글자 = (이름: string): string => ([...이름][0] ?? '?').toUpperCase();

/** 종류마다 애플리케이션 수 — 칩 차례는 사이드바 애플리케이션 줄과 같은 종류 차례다 */
function 종류별수(앱들: ServiceRow[]): { kind: (typeof 종류차례)[number]; 수: number }[] {
  return 종류차례.map((kind) => ({ kind, 수: 앱들.filter((앱) => 종류키(앱.kind) === kind).length })).filter((줄) => 줄.수 > 0);
}

/** 검색어가 프로젝트 이름이나 그 안의 애플리케이션 이름에 들어 있나 — 대소문자를 가리지 않는다 */
function 검색에맞나(검색어: string): (줄: { 프로젝트: 프로젝트; 앱들: ServiceRow[] }) => boolean {
  const 찾을것 = 검색어.trim().toLowerCase();
  return ({ 프로젝트, 앱들 }) => 찾을것 === '' || [프로젝트.name, ...앱들.map((앱) => 앱.name)].some((이름) => 이름.toLowerCase().includes(찾을것));
}

export function ProjectPick({ user, 마지막, onPick, onLogout }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [검색어, set검색어] = useState('');
  const 프로젝트들 = 배정프로젝트들(user.services).map((프로젝트) => ({ 프로젝트, 앱들: 종류차례로(프로젝트서비스들(프로젝트.id, user.services)) }));
  // 한 번도 안 열어 본 브라우저는 최근 프로젝트가 없다 — 그때는 큰 카드 없이 모두 아래 카드로 선다
  const 최근 = 마지막 === null ? undefined : 프로젝트들.find((줄) => 줄.프로젝트.id === 마지막.projectId);
  const 나머지 = 프로젝트들.filter((줄) => 줄 !== 최근);
  const 보일것 = 나머지.filter(검색에맞나(검색어));

  return (
    <div className="pp">
      <header className="pp-top">
        {/* 본 화면 사이드바와 같은 로고 — 체크 마크가 그어지고 「Commander」가 밀려 나온다 (rail.css 의 움직임을 같이 쓴다) */}
        <span className="side-logo pp-logo" onMouseEnter={() => 로고움직임다시()}>
          <svg width="30" height="30" viewBox="0 0 28 28" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="var(--accent)" />
            <path className="rail-check" pathLength={1} d="M8 14.5l4 4 8-9" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Test <b>Commander</b>
          </span>
        </span>
        <span className="pp-gap" />
        <span className="pp-user">
          <아이콘 이름="person" />
          <span className="pp-user-name">{user.displayName}</span>
        </span>
        <button type="button" className="btn ghost" onClick={onLogout}>
          {t('로그아웃')}
        </button>
      </header>
      <main className="pp-main">
        <div className="pp-head">
          <h1 className="pp-h">{t('프로젝트를 선택하세요')}</h1>
          <p className="pp-sub">{t('선택한 프로젝트의 애플리케이션만 보입니다. 사이드바 맨 위에서 언제든 변경할 수 있습니다.')}</p>
        </div>

        {최근 !== undefined && 마지막 !== null ? (
          <section className="pp-recent" aria-label={t('최근 프로젝트')}>
            <div className="pp-recent-h">
              <span className="pp-mono is-recent" aria-hidden="true">
                {머리글자(최근.프로젝트.name)}
              </span>
              <span className="pp-recent-name">
                <span className="pp-chip">{t('최근 프로젝트')}</span>
                <span className="pp-name">{최근.프로젝트.name}</span>
              </span>
              <button type="button" className="pp-go" onClick={() => onPick(마지막.prefix)}>
                {t('{이름} 이어서 열기', { 이름: 마지막.name })}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            {/* PC 는 애플리케이션을 바로 여는 단추로, 휴대폰은 이름 한 줄로 보인다 — 휴대폰은 큰 단추 하나로 충분하다 (projectPick.css) */}
            <div className="pp-recent-apps">
              {최근.앱들.map((앱) => (
                <button key={앱.prefix} type="button" className="pp-app" onClick={() => onPick(앱.prefix)}>
                  <아이콘 이름={종류(앱.kind).아이콘} />
                  {앱.name}
                  <span className="pp-app-kind">{종류이름(앱.kind, 언어, 앱.gamePlatform)}</span>
                </button>
              ))}
            </div>
            <p className="pp-recent-line">{최근.앱들.map((앱) => 앱.name).join(' · ')}</p>
          </section>
        ) : null}

        <section className="pp-others" aria-label={최근 === undefined ? t('프로젝트') : t('다른 프로젝트')}>
          <div className="pp-others-h">
            <h2 className="pp-h2">
              {최근 === undefined ? t('프로젝트') : t('다른 프로젝트')} <span className="pp-count">{보일것.length}</span>
            </h2>
            {나머지.length > 검색다는수 ? (
              <label className="pp-search">
                <아이콘 이름="search" />
                <input type="search" value={검색어} onChange={(e) => set검색어(e.target.value)} placeholder={t('프로젝트 · 애플리케이션 이름 검색')} aria-label={t('프로젝트 · 애플리케이션 이름 검색')} />
              </label>
            ) : null}
          </div>
          {보일것.length === 0 ? <p className="pp-empty">{t('찾은 것이 없습니다')}</p> : null}
          <div className="pp-grid">
            {보일것.map(({ 프로젝트, 앱들 }) => (
              <button key={프로젝트.id} type="button" className="pp-card" onClick={() => onPick(프로젝트첫앱(프로젝트.id, user.services)!.prefix)}>
                <span className="pp-card-h">
                  <span className="pp-mono" aria-hidden="true">
                    {머리글자(프로젝트.name)}
                  </span>
                  <span className="pp-card-title">
                    <span className="pp-card-name">{프로젝트.name}</span>
                    <span className="pp-card-count">{t('애플리케이션 {수}개', { 수: 앱들.length })}</span>
                  </span>
                  <span className="pp-chev" aria-hidden="true">
                    <아이콘 이름="chev" />
                  </span>
                </span>
                <span className="pp-kinds">
                  {종류별수(앱들).map(({ kind, 수 }) => (
                    <span key={kind} className="pp-kind">
                      <아이콘 이름={종류(kind).아이콘} />
                      {종류이름(kind, 언어)} {수}
                    </span>
                  ))}
                </span>
                <span className="pp-apps">{앱들.map((앱) => 앱.name).join(' · ')}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
