// 사이드바 왼쪽 애플리케이션 줄과 사이드바 머리 — 지금 어느 애플리케이션을 보는지가 화면 틀에 늘 보이게 한다 (SPEC 공통/5-화면공통 §8 「껍데기」 · 2026-10-29 시안 B)

import type { ServiceRow, User } from "./api.js";
import { use말, use언어 } from "./i18n.js";
import { 아이콘 } from "./icons.js";
import { 종류, 종류이름, 종류차례, 종류키 } from "./kind.js";
import { 고른서비스를적는다, 프로젝트서비스들 } from "./layout.js";

import "./rail.css";

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
    <nav className="rail" aria-label={t("애플리케이션")}>
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
      <b>{service.name}</b>
      <small>
        {종류이름(service.kind, 언어)} · {service.prefix}
      </small>
    </div>
  );
}
