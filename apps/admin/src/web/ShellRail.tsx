// 사이드바 왼쪽 줄 — 지금 어느 애플리케이션을 보는지가 화면 틀에 늘 보이게 하고, 머물면 펼쳐 이름을 보인다 (SPEC 공통/5-화면공통 §8 「껍데기」 왼쪽 줄 · 펼치기 · 2026-10-29 시안 B · 2026-11-05)

import { useEffect, useRef, useState } from "react";

import type { ServiceRow, User } from "./api.js";
import { use말, use언어, type 언어 } from "./i18n.js";
import { 아이콘 } from "./icons.js";
import { 종류, 종류이름 } from "./kind.js";
import { 고른서비스를적는다, 프로젝트서비스들 } from "./layout.js";
import { 로고움직임다시 } from "./logoMotion.js";
import { 집 } from "./route.js";
import { 내메뉴 } from "./ShellMe.js";
import { 종류차례로 } from "./ShellPlace.js";

import "./rail.css";

/** 사이드바 메뉴로 가는 마우스는 줄을 지나간다 — 스치기만 해도 펼치면 가려는 메뉴를 줄이 덮는다 */
export const 펼치기까지 = 300;

/**
 * 마우스가 머물거나 키보드가 들어오면 펼친다. 줄 안 마우스 누르기로 생긴 포커스는 펼치지 않는다 — 머무는 시간이 맡는다.
 * 브라우저 기본 이벤트로 듣는다 — 알림 단추는 Notice 가 이 줄 안에 옮겨 그린 것이라 React 이벤트는 줄로 안 올라온다
 */
function use펼침(줄: React.RefObject<HTMLElement | null>): boolean {
  const [펼침, set펼침] = useState(false);
  useEffect(() => {
    const 칸 = 줄.current;
    if (칸 === null) return;
    let 타이머: ReturnType<typeof setTimeout> | undefined;
    let 마우스안 = false;
    const 들어옴 = () => {
      마우스안 = true;
      clearTimeout(타이머);
      타이머 = setTimeout(() => set펼침(true), 펼치기까지);
    };
    // 마우스로 칸을 누르면 포커스가 줄 안에 남는다 — 포커스를 보고 남겨 두면 마우스가 나가도 덮은 채로 남는다
    const 나감 = () => {
      마우스안 = false;
      clearTimeout(타이머);
      set펼침(false);
    };
    const 포커스옴 = () => {
      if (!마우스안) set펼침(true);
    };
    const 포커스감 = (e: FocusEvent) => {
      if (!마우스안 && !칸.contains(e.relatedTarget as Node | null)) set펼침(false);
    };
    칸.addEventListener("mouseenter", 들어옴);
    칸.addEventListener("mouseleave", 나감);
    칸.addEventListener("focusin", 포커스옴);
    칸.addEventListener("focusout", 포커스감);
    return () => {
      clearTimeout(타이머);
      칸.removeEventListener("mouseenter", 들어옴);
      칸.removeEventListener("mouseleave", 나감);
      칸.removeEventListener("focusin", 포커스옴);
      칸.removeEventListener("focusout", 포커스감);
    };
  }, [줄]);
  return 펼침;
}

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
  const 줄 = useRef<HTMLDivElement>(null);
  const 펼침 = use펼침(줄);
  return (
    // 펼쳐도 자리는 60px 그대로이고 사이드바 위를 덮는다 — 본문이 움찔거리면 지나가기만 해도 화면이 흔들린다 (rail.css `.rail.open`)
    <div ref={줄} className={펼침 ? "rail open" : "rail"}>
      <a className="rail-logo" href={집(user, service?.prefix ?? null)} aria-label={t("Test Commander 홈")} title="Test Commander" onMouseEnter={() => 로고움직임다시()}>
        <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="8" fill="var(--accent)" />
          <path className="rail-check" pathLength={1} d="M8 14.5l4 4 8-9" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
          <span className="rail-blk">
            <아이콘 이름="settings" />
            {/* 신청이 와도 알림이 없었다 (점검 14.5). 접어도 이 줄은 남아 수가 남는다 */}
            {가입대기 > 0 ? <span className="rail-badge" aria-hidden="true">{가입대기}</span> : null}
          </span>
          <span className="rail-name" aria-hidden="true">
            <b>{t("설정")}</b>
          </span>
        </a>
      ) : null}
      <내메뉴 user={user} 프로젝트={service?.projectName ?? null} 언어={언어} on언어={on언어} onLogout={onLogout} />
    </div>
  );
}

/** 펼친 줄에서만 보이는 이름 칸. 읽어 주는 이름은 단추가 이미 가져서 화면 읽기에서는 숨긴다 */
function 칸이름({ 이름, 종류말 }: { 이름: string; 종류말?: string }) {
  return (
    <span className="rail-name" aria-hidden="true">
      <b>{이름}</b>
      {종류말 === undefined ? null : <small>{종류말}</small>}
    </span>
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
      {/* 펼치면 「<프로젝트>의 애플리케이션」, 접혀 있으면 가는 선이다. 프로젝트는 여기서 바꾸지 않는다 — 바꾸는 곳은 위치 카드 한 곳이다 */}
      {service === null ? null : (
        <span className="rail-cap" aria-hidden="true">
          <span>{t("{프로젝트}의 애플리케이션", { 프로젝트: service.projectName })}</span>
        </span>
      )}
      {/* 위치 판 · 휴대폰과 같은 차례다 — 같은 사람이 자리마다 다른 차례를 보지 않게 */}
      {종류차례로(service === null ? [] : 프로젝트서비스들(service.projectId, user.services))
        .map((it) => {
          const 종류말 = 종류이름(it.kind, 언어);
          const 이름 = `${it.name} · ${종류말}`;
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
              <span className="rail-blk">
                <아이콘 이름={종류(it.kind).아이콘} />
                <span className="rail-code">{it.prefix}</span>
              </span>
              <칸이름 이름={it.name} 종류말={종류말} />
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
          <span className="rail-blk">+</span>
          <칸이름 이름={t("애플리케이션 추가")} />
        </a>
      ) : null}
    </nav>
  );
}

