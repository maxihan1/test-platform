// 사이드바 왼쪽 줄과 사이드바 머리 — 지금 어느 애플리케이션을 보는지가 화면 틀에 늘 보이게 한다 (SPEC 공통/5-화면공통 §8 「껍데기」 · 2026-10-29 시안 B · 2026-10-30 위쪽 바를 걷었다)

import type { ServiceRow, User } from "./api.js";
import { use말, use언어, type 언어 } from "./i18n.js";
import { 아이콘 } from "./icons.js";
import { 종류, 종류이름, 종류차례, 종류키 } from "./kind.js";
import { 고른서비스를적는다, 프로젝트서비스들 } from "./layout.js";
import { 집 } from "./route.js";
import { 내메뉴 } from "./ShellMe.js";

import "./rail.css";

/**
 * 위에서부터 로고 · 애플리케이션 칸 · `+` · (빈 자리) · 알림 · 설정 · 내 동그라미.
 * 알림 · 설정 · 내 메뉴는 앞 판의 맨 위 헤더에서 왔다 — 사이드바를 접어도 이 줄은 그대로라 늘 닿는다
 */
export function 왼쪽줄({
  user,
  service,
  onService,
  새로만들기,
  설정,
  가입대기,
  current,
  알림자리,
  언어,
  on언어,
  onLogout,
}: {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  새로만들기: boolean;
  /** 설정 자리가 있나. 운영 계정에게만 있다 (화면공통 §8 「자리 목록」 「설정」 줄) */
  설정: boolean;
  가입대기: number;
  current: string;
  /** 알림 버튼이 들어올 자리. `Notice` 가 줄과 서랍은 본문에 두고 버튼만 이 자리로 옮겨 그린다 */
  알림자리: (자리: HTMLElement | null) => void;
  언어: 언어;
  on언어: (고른: 언어) => void;
  onLogout: () => void;
}) {
  const t = use말();
  return (
    <div className="rail">
      <a className="rail-logo" href={집(user, service?.prefix ?? null)} aria-label={t("QA Hub 홈")} title="QA Hub">
        <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="var(--accent)" />
          <path className="rail-check" d="M8 14.5l4 4 8-9" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      <애플리케이션줄 user={user} service={service} onService={onService} 새로만들기={새로만들기} />
      <span className="rail-gap" />
      <span ref={알림자리} className="rail-slot" />
      {설정 ? (
        <a
          className="rail-tool"
          href="#/settings"
          title={t("설정")}
          aria-label={가입대기 > 0 ? [t("설정"), t("가입 신청 {수}건", { 수: 가입대기 })].join(" · ") : t("설정")}
          {...(current === "#/settings" || current.startsWith("#/settings/") ? { "aria-current": "page" as const } : {})}
        >
          <아이콘 이름="settings" />
          {/* 신청이 와도 알림이 없었다 (점검 14.5). 접어도 이 줄은 남아 수가 남는다 */}
          {가입대기 > 0 ? <span className="rail-badge" aria-hidden="true">{가입대기}</span> : null}
        </a>
      ) : null}
      <내메뉴 user={user} 프로젝트={service?.projectName ?? null} 언어={언어} on언어={on언어} onLogout={onLogout} />
    </div>
  );
}

/**
 * 고른 프로젝트 안의 애플리케이션을 늘 세워 둔다 — 고르개를 펼쳐야만 보이면 지금 것이 어느 것인지 견줄 수가 없었다 (2026-10-29 사용자 「구분이 안 돼서 헷갈린다」).
 * 색은 쓰지 않는다 — 종류 아이콘과 접두사로 가른다 (화면공통 §8 「서비스 색을 화면에서 쓰지 않는다」).
 * 고른 애플리케이션이 없어도 칸은 선다 — 격자가 줄 몫의 폭을 늘 잡고, 운영 계정은 「+」로 첫 애플리케이션을 만든다
 */
export function 애플리케이션줄({
  user,
  service,
  onService,
  새로만들기,
}: {
  user: User;
  service: ServiceRow | null;
  onService: (prefix: string) => void;
  새로만들기: boolean;
}) {
  const t = use말();
  const 언어 = use언어();
  return (
    <nav className="rail-apps" aria-label={t("애플리케이션")}>
      {/* 휴대폰 고르개의 종류별 묶음과 같은 차례다 — 같은 사람이 PC 와 휴대폰에서 다른 차례를 보지 않게 */}
      {(service === null
        ? []
        : 프로젝트서비스들(service.projectId, user.services)
      )
        .sort(
          (a, b) =>
            종류차례.indexOf(종류키(a.kind)) - 종류차례.indexOf(종류키(b.kind)),
        )
        .map((it) => {
          const 이름 = `${it.name} · ${종류이름(it.kind, 언어)}`;
          return (
            <button
              key={it.prefix}
              type="button"
              className="rail-app"
              title={이름}
              aria-label={이름}
              {...(it.prefix === service?.prefix
                ? { "aria-current": "page" as const }
                : {})}
              onClick={() => {
                고른서비스를적는다(it.prefix);
                onService(it.prefix);
              }}
            >
              <아이콘 이름={종류(it.kind).아이콘} />
              <span className="rail-code">{it.prefix}</span>
            </button>
          );
        })}
      {새로만들기 ? (
        // 설정 왼쪽 메뉴의 「+ 애플리케이션 추가」와 같은 일이라 같은 말이다
        <a
          className="rail-add"
          href="#/settings/new"
          title={t("애플리케이션 추가")}
          aria-label={t("애플리케이션 추가")}
        >
          +
        </a>
      ) : null}
    </nav>
  );
}

/** 자리 목록 위 — 아래 메뉴가 「이 애플리케이션의 메뉴」로 읽힌다 */
export function 사이드바머리({ service }: { service: ServiceRow }) {
  const 언어 = use언어();
  return (
    <div className="side-app">
      <span className="side-app-ic">
        <아이콘 이름={종류(service.kind).아이콘} />
      </span>
      <span className="side-app-text">
        <b>{service.name}</b>
        <small>
          {종류이름(service.kind, 언어)} · {service.prefix}
        </small>
      </span>
    </div>
  );
}
