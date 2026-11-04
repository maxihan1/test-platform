// 사이드바 맨 위 위치 카드와 위치 판 — 지금 프로젝트 · 애플리케이션 이름을 크게 보이고 눌러서 바꾼다. 휴대폰 위 줄도 같은 판을 쓴다 (SPEC 공통/5-화면공통 §8 「껍데기」 위치 카드 · 위치 판 · 「휴대폰 화면」)

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { ServiceRow, User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 종류, 종류이름, 종류차례, 종류키 } from './kind.js';
import { 고른서비스를적는다, 배정프로젝트들, 프로젝트서비스들 } from './layout.js';

import './place.css';

/** 판 · 왼쪽 줄 · 휴대폰이 같은 차례로 늘어놓는다 — 같은 사람이 자리마다 다른 차례를 보지 않게 (웹 · Android 앱 · 게임 · API) */
export function 종류차례로(목록: readonly ServiceRow[]): ServiceRow[] {
  return [...목록].sort((a, b) => 종류차례.indexOf(종류키(a.kind)) - 종류차례.indexOf(종류키(b.kind)));
}

/**
 * 처음 온 사람이 바꾸는 곳을 못 찾았다(2026-11-05) — 고르개는 회색 작은 글자라 설명처럼 읽혔고, 가장 큰 이름은 눌리지 않았다.
 * 그래서 사람이 원래 누르려던 자리(가장 큰 이름)를 카드 하나로 만들어 진짜로 눌리게 한다
 */
export function 위치카드({ user, service, onService, 새로만들기 }: { user: User; service: ServiceRow | null; onService: (prefix: string) => void; 새로만들기: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [열림, set열림] = useState(false);
  const 상자 = useRef<HTMLDivElement>(null);
  const 단추 = useRef<HTMLButtonElement>(null);

  // 바깥을 누르거나 Esc 면 닫는다 — 안 닫히면 본문 버튼을 가린 채 남는다 (내 메뉴와 같은 처리)
  useEffect(() => {
    if (!열림) return;
    const 닫기 = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        set열림(false);
        단추.current?.focus();
      } else if (!상자.current?.contains(e.target as Node)) {
        set열림(false);
      }
    };
    document.addEventListener('pointerdown', 닫기);
    document.addEventListener('keydown', 닫기);
    return () => {
      document.removeEventListener('pointerdown', 닫기);
      document.removeEventListener('keydown', 닫기);
    };
  }, [열림]);

  // 왼쪽 줄도 비어 있어 이 사실을 말할 곳이 여기뿐이다
  if (service === null) return <span className="place-none">{t('애플리케이션 없음')}</span>;
  return (
    <div className="place" ref={상자}>
      <button
        ref={단추}
        type="button"
        className="place-card"
        aria-haspopup="dialog"
        aria-expanded={열림}
        aria-label={t('{프로젝트} › {이름} · 바꾸기', { 프로젝트: service.projectName, 이름: service.name })}
        onClick={() => set열림(!열림)}
      >
        <span className="place-proj">
          <small>{t('프로젝트§카드')}</small>
          <b>{service.projectName}</b>
        </span>
        <span className="place-app">
          <span className="place-ic">
            <아이콘 이름={종류(service.kind).아이콘} />
          </span>
          <span className="place-app-text">
            <b>{service.name}</b>
            <small>
              {종류이름(service.kind, 언어)} · {service.prefix}
            </small>
          </span>
        </span>
        <span className="place-caret" aria-hidden="true">
          <아이콘 이름="chev" />
        </span>
      </button>
      {열림 ? (
        <위치판
          user={user}
          service={service}
          onService={onService}
          새로만들기={새로만들기}
          기준={단추}
          닫기={() => {
            set열림(false);
            단추.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * 왼쪽 칸은 프로젝트, 오른쪽 칸은 그 프로젝트의 애플리케이션. 휴대폰은 프로젝트 칩 줄 아래 애플리케이션 줄이다.
 * 프로젝트는 들여다보기만 한다 — 앞 고르개는 프로젝트를 고르면 첫 애플리케이션으로 바로 열어, 구경하려던 사람도 그 화면으로 넘어갔다.
 * 옮겨 가는 것은 애플리케이션을 눌렀을 때뿐이다
 */
export function 위치판({
  user,
  service,
  onService,
  새로만들기,
  닫기,
  휴대폰 = false,
  기준,
}: {
  user: User;
  service: ServiceRow;
  onService: (prefix: string) => void;
  새로만들기: boolean;
  닫기: () => void;
  /** 아래 판 안에 들어간다 — 판 틀 · 제목은 아래판이 그린다 */
  휴대폰?: boolean;
  /** PC 판을 띄울 기준(카드) */
  기준?: React.RefObject<HTMLElement | null>;
}) {
  const t = use말();
  const 언어 = use언어();
  const [들여다봄, set들여다봄] = useState(service.projectId);
  const [자리, set자리] = useState<React.CSSProperties>();
  const 판 = useRef<HTMLDivElement>(null);
  const 프로젝트들 = 배정프로젝트들(user.services);
  const 프로젝트 = 프로젝트들.find((it) => it.id === 들여다봄) ?? { id: service.projectId, name: service.projectName };
  const 앱들 = 종류차례로(프로젝트서비스들(프로젝트.id, user.services));

  // 사이드바 칸은 넘치면 스크롤하는 상자라 그 안에 두면 판이 잘린다 — 화면 기준으로 카드 바로 아래에 띄운다
  useLayoutEffect(() => {
    if (기준 === undefined) return;
    const 맞춘다 = () => {
      const 칸 = 기준.current?.getBoundingClientRect();
      if (칸 !== undefined) set자리({ top: 칸.bottom + 5, left: 칸.left });
    };
    맞춘다();
    window.addEventListener('resize', 맞춘다);
    return () => window.removeEventListener('resize', 맞춘다);
  }, [기준]);

  // 키보드로 연 사람이 바로 고르게 지금 애플리케이션에 포커스를 둔다. 휴대폰은 아래판이 판 자체에 둔다
  useEffect(() => {
    if (!휴대폰) 판.current?.querySelector<HTMLElement>('.place-app-row[aria-current="page"]')?.focus();
  }, [휴대폰]);

  const 고른다 = (prefix: string) => {
    고른서비스를적는다(prefix);
    onService(prefix);
    닫기();
  };

  // 휴대폰은 아래판의 묶음 제목 모양을 쓴다
  const 제목태그 = 휴대폰 ? 'h3' : 'div';
  const 제목 = (글: string) => <제목태그 className={휴대폰 ? 'sheet-h' : 'place-h'}>{글}</제목태그>;

  // 고를 것이 하나면 왼쪽 칸을 세우지 않는다
  const 프로젝트칸 =
    프로젝트들.length < 2 ? null : 휴대폰 ? (
      <>
        {제목(t('프로젝트'))}
        <div className="place-chips">
          {프로젝트들.map((it) => (
            <button key={it.id} type="button" className="place-chip" aria-pressed={it.id === 프로젝트.id} onClick={() => set들여다봄(it.id)}>
              {it.name}
            </button>
          ))}
        </div>
      </>
    ) : (
      <div className="place-projs">
        {제목(t('프로젝트'))}
        {프로젝트들.map((it) => {
          const 수 = 프로젝트서비스들(it.id, user.services).length;
          return (
            <button
              key={it.id}
              type="button"
              className="place-proj-row"
              aria-pressed={it.id === 프로젝트.id}
              aria-label={[it.name, t('애플리케이션 {수}개', { 수 })].join(' · ')}
              {...(it.id === service.projectId ? { 'aria-current': 'true' as const } : {})}
              onMouseEnter={() => set들여다봄(it.id)}
              onFocus={() => set들여다봄(it.id)}
              onClick={() => set들여다봄(it.id)}
            >
              <span className={it.id === service.projectId ? 'place-dot' : 'place-dot gap'} aria-hidden="true" />
              <span className="place-pn">{it.name}</span>
              <span className="place-n" aria-hidden="true">
                {수}
              </span>
            </button>
          );
        })}
      </div>
    );

  const 앱칸 = (
    <div className="place-apps">
      {제목(t('{프로젝트}의 애플리케이션', { 프로젝트: 프로젝트.name }))}
      {앱들.map((it) => {
        const 지금 = it.prefix === service.prefix;
        return (
          <button
            key={it.prefix}
            type="button"
            className="place-app-row"
            aria-label={`${it.name} · ${종류이름(it.kind, 언어)}`}
            {...(지금 ? { 'aria-current': 'page' as const } : {})}
            onClick={() => 고른다(it.prefix)}
          >
            <span className="place-ic">
              <아이콘 이름={종류(it.kind).아이콘} />
            </span>
            <span className="place-app-text">
              <b>{it.name}</b>
              <small>
                {종류이름(it.kind, 언어)} · {it.prefix}
              </small>
            </span>
            <span className="place-check" aria-hidden="true">
              {지금 ? '✓' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );

  // 왼쪽 줄 「+」 와 같은 길이라 같은 말이다
  const 더하기 = 새로만들기 ? (
    <a className="place-add" href="#/settings/new" onClick={닫기}>
      + {t('애플리케이션 추가')}
    </a>
  ) : null;

  if (휴대폰) {
    return (
      <div className="place-sheet" ref={판}>
        {프로젝트칸}
        {앱칸}
        {더하기}
      </div>
    );
  }
  return (
    <div className={프로젝트칸 === null ? 'place-pop one' : 'place-pop'} ref={판} role="dialog" aria-label={t('프로젝트 · 애플리케이션 고르기')} style={자리}>
      <div className="place-cols">
        {프로젝트칸}
        {앱칸}
      </div>
      {더하기}
    </div>
  );
}
