// 휴대폰 껍데기 — 위 줄(애플리케이션 고르개 · 알림 종 · 내 동그라미) · 본문 · 아래 탭 다섯 · 전체 메뉴판 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」)
// 2026-10-30 부터 휴대폰에서도 모든 메뉴가 열린다 — 앞 판은 결과 확인 밖의 화면을 「PC 에서 여세요」 안내로 막았다

import { useEffect, useRef, useState } from 'react';

import type { ServiceRow, User } from './api.js';
import { decideApi } from './decideApi.js';
import { FarmToken } from './FarmToken.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 종류, 종류이름, 종류차례, 종류키 } from './kind.js';
import { 고른서비스를적는다, 프로젝트서비스들, 자리목록, type 빈띠, type 자리 } from './layout.js';
import { Notice } from './Notice.js';
import { 표에라벨을단다 } from './phone.js';
import { 내메뉴항목 } from './ShellMe.js';
import { 언어고르개, 프로젝트고르개 } from './ShellPickers.js';
import { 아래판 } from './Sheet.js';
import { 밝기단추 } from './theme.js';

interface Props {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
  current: string;
  /** 배정 · 권한이 없어 본문 대신 띄울 안내. PC 껍데기와 같은 판단이다 (layout.ts `빈띠사유`) */
  사유: 빈띠 | null;
  children: React.ReactNode;
}

type 판 = 'menu' | 'apps' | 'me';

const 지금이면 = (맞나: boolean) => (맞나 ? { 'aria-current': 'page' as const } : {});
const 아래인가 = (current: string, 해시: string) => current === 해시 || current.startsWith(`${해시}/`);

export function PhoneShell({ user, service, onService, 언어, on언어, onLogout, current, 사유, children }: Props) {
  const t = use말();
  // 알림 종은 위 줄에 선다. 줄 · 서랍과 열림 상태를 같이 쓰도록 Notice 가 이 자리에 버튼을 그린다
  const [알림자리, set알림자리] = useState<HTMLElement | null>(null);
  const [열린판, set열린판] = useState<판 | null>(null);
  const [팜토큰창, set팜토큰창] = useState(false);
  const 본문 = useRef<HTMLDivElement>(null);
  const 닫기 = () => set열린판(null);

  // 자리를 옮기면 판을 닫는다 — 판 안 고리를 누르면 판이 닫히고 그리로 간다
  useEffect(() => set열린판(null), [current]);

  // 표는 카드 줄이다 — 칸 이름을 줄마다 붙인다. 화면이 표를 다시 그릴 때마다 다시 단다 (화면공통 §8 「휴대폰 화면」 「표는 카드 줄이다」)
  useEffect(() => {
    const 그릇 = 본문.current;
    if (그릇 === null) return;
    표에라벨을단다(그릇);
    const 지켜봄 = new MutationObserver(() => 표에라벨을단다(그릇));
    지켜봄.observe(그릇, { childList: true, subtree: true });
    return () => 지켜봄.disconnect();
  }, []);

  const 자리들 = 자리목록(user, service?.prefix ?? null, 언어);
  const 찾기 = (해시: string) => 자리들.find((it) => it.해시 === 해시);
  const 대시보드 = 찾기('#/dashboard');
  // API 애플리케이션은 테스트 스크립트가 하위 없이 `#/cases/fn` 이다 (layout.ts)
  const 테스트 = 자리들.find((it) => it.아이콘 === 'cases');
  const 실행기록 = 찾기('#/runs');
  const 작성 = 찾기('#/authoring');
  const 설정 = 찾기('#/settings');
  const 결정수 = use결정수(작성 === undefined ? null : (service?.prefix ?? null), current);
  // 하위 고르개는 실행 기록 목록에서만 — 실행 결과 · 항목 상세(`#/runs`)는 종류를 모른다
  const 하위 = 실행기록?.하위?.some((it) => it.해시 === current) === true ? 실행기록.하위 : undefined;

  return (
    <div className="ph">
      <header className="ph-top">
        {service === null ? (
          <span className="ph-app-none">{t('애플리케이션 없음')}</span>
        ) : (
          <button type="button" className="ph-app" aria-haspopup="dialog" aria-label={t('애플리케이션 선택')} onClick={() => set열린판('apps')}>
            <아이콘 이름={종류(service.kind).아이콘} />
            <span className="ph-app-text">
              <b>{service.name}</b>
              <small>
                {종류이름(service.kind, 언어)} · {service.prefix}
              </small>
            </span>
            <span className="ph-app-chev" aria-hidden="true">
              ▾
            </span>
          </button>
        )}
        <span ref={set알림자리} className="ph-bell" />
        <button type="button" className="ph-me" aria-haspopup="dialog" aria-label={`${t('내 메뉴')} · ${user.displayName}`} onClick={() => set열린판('me')}>
          <span aria-hidden="true">{Array.from(user.displayName)[0] ?? ''}</span>
        </button>
      </header>

      <div className="main" ref={본문}>
        {service === null ? null : (
          <Notice
            줄숨김={current === '#/dashboard'}
            서비스바꿈={(접두사) => {
              고른서비스를적는다(접두사);
              onService(접두사);
            }}
            버튼자리={알림자리}
          />
        )}
        {실행기록 === undefined || 하위 === undefined ? null : (
          <nav className="ph-sub" aria-label={실행기록.이름}>
            {하위.map((it) => (
              <a key={it.해시} href={it.해시} aria-label={it.라벨} {...지금이면(current === it.해시)}>
                {it.이름}
              </a>
            ))}
          </nav>
        )}
        {사유 === null ? (
          children
        ) : (
          <div className="screen">
            <div className="empty">
              {사유.무엇}
              {사유.다음 === '' ? null : <small>{사유.다음}</small>}
            </div>
          </div>
        )}
      </div>

      {/* 자리가 없는 탭은 없다 — 등급이 낮아 못 하는 것은 보이지 않는다. `전체` 는 늘 있다 */}
      <nav className="ph-tabs" aria-label={t('휴대폰 메뉴')}>
        {대시보드 === undefined ? null : (
          <a href={대시보드.해시} {...지금이면(current === '#/dashboard')}>
            <아이콘 이름="dashboard" />
            {대시보드.이름}
          </a>
        )}
        {테스트 === undefined ? null : (
          <a href={테스트.해시} {...지금이면(아래인가(current, '#/cases'))}>
            <아이콘 이름="cases" />
            {t('테스트')}
          </a>
        )}
        {실행기록 === undefined ? null : (
          <a href={실행기록.해시} {...지금이면(아래인가(current, '#/runs'))}>
            <아이콘 이름="runs" />
            {실행기록.이름}
          </a>
        )}
        {작성 === undefined ? null : (
          <a href={작성.해시} {...지금이면(아래인가(current, '#/authoring'))}>
            <아이콘 이름="authoring" />
            {t('작성')}
            {결정수 > 0 ? (
              <span className="ph-badge" aria-label={t('결정 필요 {수}건', { 수: 결정수 })}>
                {결정수 > 99 ? '99+' : 결정수}
              </span>
            ) : null}
          </a>
        )}
        <button type="button" aria-haspopup="dialog" aria-expanded={열린판 === 'menu'} onClick={() => set열린판('menu')}>
          <아이콘 이름="menu" />
          {t('전체')}
        </button>
      </nav>

      {열린판 === 'apps' && service !== null ? (
        <아래판 제목={t('애플리케이션 선택')} onClose={닫기}>
          <h3 className="sheet-h">{t('애플리케이션 바꾸기 · {프로젝트}', { 프로젝트: service.projectName })}</h3>
          <앱격자 user={user} service={service} onService={onService} 닫기={닫기} />
        </아래판>
      ) : null}

      {열린판 === 'menu' ? (
        <아래판 제목={t('전체 메뉴')} onClose={닫기}>
          {service === null ? null : (
            <>
              <h3 className="sheet-h">{t('애플리케이션')}</h3>
              <앱격자 user={user} service={service} onService={onService} 닫기={닫기} />
              <h3 className="sheet-h">{t('{이름} 메뉴', { 이름: service.name })}</h3>
            </>
          )}
          <메뉴목록 자리들={자리들.filter((it) => it !== 설정)} current={current} 닫기={닫기} />
          <h3 className="sheet-h">{t('계정')}</h3>
          <div className="sheet-acct">
            {service === null ? null : (
              <div className="sheet-row">
                <아이콘 이름="project" />
                <프로젝트고르개 user={user} service={service} onService={onService} />
              </div>
            )}
            {설정 === undefined ? null : (
              <a className="sheet-row" href={설정.해시} onClick={닫기} {...지금이면(아래인가(current, '#/settings'))}>
                <아이콘 이름="settings" />
                {설정.이름}
              </a>
            )}
            <div className="sheet-row">
              <밝기단추 글자 />
            </div>
            <div className="sheet-row side-lang">
              <언어고르개 언어={언어} on언어={on언어} />
            </div>
          </div>
        </아래판>
      ) : null}

      {열린판 === 'me' ? (
        <아래판 제목={t('내 메뉴')} onClose={닫기}>
          <div className="sheet-me">
            <내메뉴항목
              user={user}
              프로젝트={service?.projectName ?? null}
              언어={언어}
              on언어={on언어}
              onLogout={onLogout}
              닫기={닫기}
              팜토큰열기={() => set팜토큰창(true)}
            />
          </div>
        </아래판>
      ) : null}
      {팜토큰창 ? <FarmToken onClose={() => set팜토큰창(false)} /> : null}
    </div>
  );
}

/** 고른 프로젝트의 애플리케이션 칸. PC 왼쪽 줄과 같은 차례다 — 같은 사람이 PC 와 휴대폰에서 다른 차례를 보지 않게 */
function 앱격자({ user, service, onService, 닫기 }: { user: User; service: ServiceRow; onService: (prefix: string) => void; 닫기: () => void }) {
  const 언어 = use언어();
  return (
    <div className="sheet-apps">
      {프로젝트서비스들(service.projectId, user.services)
        .sort((a, b) => 종류차례.indexOf(종류키(a.kind)) - 종류차례.indexOf(종류키(b.kind)))
        .map((it) => (
          <button
            key={it.prefix}
            type="button"
            aria-label={`${it.name} · ${종류이름(it.kind, 언어)}`}
            {...지금이면(it.prefix === service.prefix)}
            onClick={() => {
              고른서비스를적는다(it.prefix);
              onService(it.prefix);
              닫기();
            }}
          >
            <아이콘 이름={종류(it.kind).아이콘} />
            <span>{it.name}</span>
            <b>{it.prefix}</b>
          </button>
        ))}
    </div>
  );
}

/** 자리 목록 전부. 묶음은 이름 아래에 하위를 두 칸 격자로 다 편다 — 휴대폰은 펼칠 자리가 없다 */
function 메뉴목록({ 자리들, current, 닫기 }: { 자리들: 자리[]; current: string; 닫기: () => void }) {
  return (
    <nav className="sheet-menu">
      {자리들.map((it) =>
        it.바깥 === true ? (
          <a key={it.해시} className="sheet-row" href={it.해시} target="_blank" rel="noreferrer" onClick={닫기}>
            <아이콘 이름={it.아이콘} />
            {it.이름}
            <span className="sheet-ext">↗</span>
          </a>
        ) : it.하위 === undefined ? (
          <a key={it.해시} className="sheet-row" href={it.해시} onClick={닫기} {...지금이면(current === it.해시)}>
            <아이콘 이름={it.아이콘} />
            {it.이름}
          </a>
        ) : (
          <div key={it.해시} role="group" aria-label={it.이름}>
            <span className="sheet-row sheet-group">
              <아이콘 이름={it.아이콘} />
              {it.이름}
            </span>
            <div className="sheet-subs">
              {it.하위.map((하) => (
                <a key={하.해시} href={하.해시} aria-label={하.라벨} onClick={닫기} {...지금이면(current === 하.해시)}>
                  {하.이름}
                </a>
              ))}
            </div>
          </div>
        ),
      )}
    </nav>
  );
}

/**
 * `작성` 탭 배지 — 테스트 작성 「결정 필요」와 같은 통로의 `count` (화면공통 §8 「휴대폰 화면」).
 * 자리를 옮길 때마다 다시 읽는다 — 결정을 끝내고 나오면 숫자가 줄어야 한다. 읽기가 실패하면 0 이다. 배지 하나 때문에 오류를 띄우지 않는다 (use가입대기수 와 같다)
 */
function use결정수(prefix: string | null, current: string): number {
  const [수, set수] = useState(0);
  useEffect(() => {
    if (prefix === null) {
      set수(0);
      return;
    }
    let 낡음 = false;
    decideApi
      .list(prefix)
      .then((r) => {
        if (!낡음) set수(r.count);
      })
      .catch(() => {
        if (!낡음) set수(0);
      });
    return () => {
      낡음 = true;
    };
  }, [prefix, current]);
  return 수;
}
