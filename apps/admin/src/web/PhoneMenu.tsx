// 휴대폰 「전체」 메뉴판 안 조각 — 지금 프로젝트의 애플리케이션 칸 격자와 자리 목록 전부 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」 「전체 메뉴판」). PhoneShell 이 300줄을 넘어 떼어 냈다

import { Fragment } from 'react';

import type { ServiceRow, User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 종류, 종류이름, 종류차례로 } from './kind.js';
import { 고른서비스를적는다, 프로젝트서비스들, type 자리 } from './layout.js';

export const 지금이면 = (맞나: boolean) => (맞나 ? { 'aria-current': 'page' as const } : {});

/** 고른 프로젝트의 애플리케이션 칸. PC 왼쪽 줄과 같은 차례다 — 같은 사람이 PC 와 휴대폰에서 다른 차례를 보지 않게 */
export function 앱격자({ user, service, onService, 닫기 }: { user: User; service: ServiceRow; onService: (prefix: string) => void; 닫기: () => void }) {
  const 언어 = use언어();
  return (
    <div className="sheet-apps">
      {종류차례로(프로젝트서비스들(service.projectId, user.services)).map((it) => (
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
export function 메뉴목록({ 자리들, current, 닫기 }: { 자리들: 자리[]; current: string; 닫기: () => void }) {
  const t = use말();
  return (
    <nav className="sheet-menu">
      {자리들.map((it, i) => (
        <Fragment key={it.해시}>
          {/* PC 사이드바와 같은 QA 단계 구분선 제목 (화면공통 §8 「자리 목록」 「단계 구분선」) */}
          {it.단계 !== undefined && it.단계 !== 자리들[i - 1]?.단계 ? <div className="sheet-stage">{it.단계}</div> : null}
          {it.바깥 === true ? (
            <a className="sheet-row" href={it.해시} target="_blank" rel="noreferrer" onClick={닫기}>
              <아이콘 이름={it.아이콘} />
              {it.이름}
              <span className="sheet-ext">↗</span>
            </a>
          ) : it.하위 === undefined ? (
            <a className="sheet-row" href={it.해시} onClick={닫기} {...지금이면(current === it.해시)}>
              <아이콘 이름={it.아이콘} />
              {it.이름}
            </a>
          ) : (
            <div role="group" aria-label={it.이름}>
              <span className="sheet-row sheet-group">
                <아이콘 이름={it.아이콘} />
                {it.이름}
              </span>
              <div className="sheet-subs">
                {it.하위.map((하) => (
                  <a key={하.해시} href={하.해시} aria-label={하.라벨} onClick={닫기} {...지금이면(current === 하.해시)}>
                    {하.이름}
                    {하.신규 === true ? <span className="side-new">{t('신규')}</span> : null}
                  </a>
                ))}
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
