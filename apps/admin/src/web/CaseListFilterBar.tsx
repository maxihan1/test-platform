// 케이스 목록 표 위 한 줄 — 결과 탭 · 고른 조건 칩 · 「필터」 단추와 그 판 (도메인/카탈로그 §8.1 「검색 조건」 · DESIGN.md 「필터 판」)
// 2026-10-30 WEB-F7-07 — 늘 펼쳐 둔 조건 칩 줄이 표 위를 두세 줄 먹어 첫 화면에 케이스가 서너 건만 보였다. 조건은 판에 접고 고른 것만 칩으로 남긴다

import { useEffect, useId, useRef, useState } from 'react';

import type { CasePage, ItemStatus, Platform, 앱종류, 케이스축 } from './api.js';
import { use기법말 } from './CaseDetail.js';
import { 걸린칩 } from './CaseListContext.js';
import { 기법고름들, type use검색조건 } from './CaseListFilter.js';
import { 결과라벨 } from './CaseListParts.js';
import { use말 } from './i18n.js';
import { 종류 } from './kind.js';
import { use휴대폰 } from './phone.js';
import { PLATFORM_LABEL } from './ui.js';

const 결과칩: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
// 「Android 앱」은 앱 케이스가 있는 서비스에만 — 웹만 있는 서비스에서는 늘 빈 목록을 내는 칩이다 (도메인/카탈로그 §8.1)
// 이미 android 를 고른 채(주소) 들어왔으면 앱 케이스가 없어도 세운다 — 고른 것을 감추면 왜 비었는지 모른다
const 디바이스칩 = (앱있음: boolean, 고른: Platform | 'ALL'): (Platform | 'ALL')[] =>
  앱있음 || 고른 === 'android' ? ['ALL', 'desktop', 'mobile', 'android'] : ['ALL', 'desktop', 'mobile'];
// 종류는 기능 목록에만 — UI 는 넷째 종류라 UI 목록 전부다 (도메인/카탈로그 §8.1 「맥락」)
const 종류칩: (Exclude<케이스축, 'UI'> | 'ALL')[] = ['ALL', '정상', '경계', '예외'];

type 검색 = ReturnType<typeof use검색조건>;

/** 판의 한 줄. 칸이 비면 판에는 안 서고 걸린 칩만 남는다 — 설정에서 지운 API 서버 이름이 주소에 남은 때다 */
export interface 필터조건 {
  이름: string;
  설명: string;
  칸들: { 글: string; 수?: number; 눌림: boolean; 누르기: () => void }[];
  /** 기본값이 아니면 표 위 칩에 적는 글. 기본값이면 null */
  걸림: string | null;
  풀기: () => void;
}

export function use필터조건들(
  검색: 검색,
  { kind, 앱있음, 앱종류, 서버목록 }: { kind: 'UI' | 'FN'; 앱있음: boolean; 앱종류?: 앱종류; 서버목록: { name: string; count: number }[] },
): 필터조건[] {
  const t = use말();
  const 기법말 = use기법말();
  const 기법글 = (값: (typeof 기법고름들)[number]) => (값 === 'ALL' ? t('전체') : 값 === 'none' ? t('기법 없음') : 기법말(값));
  const 디바이스글 = (값: Platform | 'ALL') => (값 === 'ALL' ? t('전체') : t(PLATFORM_LABEL[값]));
  const 조건들: 필터조건[] = [
    {
      // 비활성 케이스는 기본으로 감춘다. 코드에서 사라진 케이스를 지우지 않고 남겨 두므로 시간이 지날수록 목록이 과거로 채워진다 (SPEC §8.1)
      이름: t('표시'),
      설명: t('비활성 케이스는 「활성만」에서 숨기고 실행에서도 뺍니다'),
      칸들: [
        { 글: t('활성만'), 눌림: 검색.활성만, 누르기: () => 검색.on활성만(true) },
        { 글: t('전체'), 눌림: !검색.활성만, 누르기: () => 검색.on활성만(false) },
      ],
      걸림: 검색.활성만 ? null : `${t('표시')} ${t('전체')}`,
      풀기: () => 검색.on활성만(true),
    },
  ];
  if (kind === 'FN') {
    조건들.push(
      {
        이름: t('종류'),
        설명: t('케이스를 만든 관점입니다 — 정상 동작 · 경계값 · 잘못된 입력'),
        칸들: 종류칩.map((값) => ({ 글: t(값 === 'ALL' ? '전체' : 값), 눌림: 검색.축 === 값, 누르기: () => 검색.on축(값) })),
        걸림: 검색.축 === 'ALL' ? null : `${t('종류')} ${t(검색.축)}`,
        풀기: () => 검색.on축('ALL'),
      },
      {
        // 판 안이라 칩으로 늘어놓는다 — 도구 줄에 있을 때는 줄이 길어져 고르개였다 (도메인/카탈로그 §8.1 「설계 기법」)
        이름: t('설계 기법'),
        설명: t('케이스를 설계할 때 쓴 방법입니다'),
        칸들: 기법고름들.map((값) => ({ 글: 기법글(값), 눌림: 검색.기법 === 값, 누르기: () => 검색.on기법(값) })),
        걸림: 검색.기법 === 'ALL' ? null : `${t('설계 기법')} ${기법글(검색.기법)}`,
        풀기: () => 검색.on기법('ALL'),
      },
    );
  }
  // Android 앱 · 게임 애플리케이션은 고를 디바이스가 하나라 줄이 없다 (도메인/러너 §5.2 종류 표)
  if (종류(앱종류).디바이스칩) {
    조건들.push({
      이름: t('디바이스'),
      설명: t('그 디바이스에서 도는 케이스만 남깁니다'),
      칸들: 디바이스칩(앱있음, 검색.디바이스).map((값) => ({ 글: 디바이스글(값), 눌림: 검색.디바이스 === 값, 누르기: () => 검색.on디바이스(값) })),
      걸림: 검색.디바이스 === 'ALL' ? null : `${t('디바이스')} ${디바이스글(검색.디바이스)}`,
      풀기: () => 검색.on디바이스('ALL'),
    });
  }
  조건들.push(
    {
      이름: t('스모크'),
      설명: t('새 빌드가 오면 먼저 도는 핵심 경로 케이스입니다'),
      칸들: [
        { 글: t('전체'), 눌림: !검색.스모크, 누르기: () => 검색.on스모크(false) },
        { 글: t('스모크만'), 눌림: 검색.스모크, 누르기: () => 검색.on스모크(true) },
      ],
      걸림: 검색.스모크 ? t('스모크만') : null,
      풀기: () => 검색.on스모크(false),
    },
    {
      // 이름이 하나도 없으면 줄을 안 세운다. 주소에 남은 이름이 사라졌으면 빈 목록이 뜨고 칩의 ✕ 로 푼다 (도메인/카탈로그 §8.1 「API 서버」)
      이름: t('API 서버'),
      설명: t('케이스를 실행했을 때 부른 서버입니다'),
      칸들:
        서버목록.length === 0
          ? []
          : [
              { 글: t('전체'), 눌림: 검색.서버 === null, 누르기: () => 검색.on서버(null) },
              ...서버목록.map((x) => ({ 글: x.name, 수: x.count, 눌림: 검색.서버 === x.name, 누르기: () => 검색.on서버(검색.서버 === x.name ? null : x.name) })),
            ],
      걸림: 검색.서버 === null ? null : t('API 서버 {이름}', { 이름: 검색.서버 }),
      풀기: () => 검색.on서버(null),
    },
  );
  return 조건들;
}

/** 마지막 결과 — 결과 탭. 수는 쪽이 아니라 서버가 last 를 뺀 조건으로 센 전부다. 실행 read 가 없으면 null 이고 탭도 안 그린다 (도메인/카탈로그 §7) */
export function 결과탭들({ 결과, 건수, on결과 }: { 결과: ItemStatus | 'ALL'; 건수: CasePage['lastCounts']; on결과: (값: ItemStatus | 'ALL') => void }) {
  const t = use말();
  if (건수 == null) return null;
  const 수 = { ALL: 건수.total, PASS: 건수.pass, FAIL: 건수.fail, NA: 건수.na };
  return (
    <span className="result-tabs" role="group" aria-label={t('마지막 결과')}>
      {결과칩.map((값) => (
        <button type="button" className={값 === 'FAIL' && 건수.fail > 0 ? 'result-tab tab-fail' : 'result-tab'} key={값} aria-pressed={결과 === 값} onClick={() => on결과(값)}>
          {t(결과라벨[값])} <span className="chip-n">{수[값]}</span>
        </button>
      ))}
    </span>
  );
}

/** 고른 조건 칩 — 기본값이 아닌 조건마다 하나. ✕ 로 그 조건만 푼다 */
export function 고른조건칩들({ 조건들 }: { 조건들: 필터조건[] }) {
  return (
    <>
      {조건들.map((x) => (x.걸림 === null ? null : <걸린칩 key={x.이름} 글={x.걸림} on풀기={x.풀기} />))}
    </>
  );
}

/**
 * 「필터」 단추와 그 아래 판. 고르면 바로 적용된다 — 판에 적용 단추가 없다.
 * 바깥 누르기 · Esc 로 닫히고 포커스는 단추로 돌아온다. 휴대폰에서는 아래 판이고 맨 아래가 「N건 보기」다 (DESIGN.md 「필터 판」)
 */
export function 필터판({ 조건들, 건수 }: { 조건들: 필터조건[]; 건수: number | null }) {
  const t = use말();
  const 휴대폰 = use휴대폰();
  const [열림, set열림] = useState(false);
  // 판은 화면에 고정해 단추 아래에 띄운다 — 목록 판(.screen)이 넘침을 숨겨 그 안에 두면 낮은 창에서 판 아래가 잘렸다
  const [자리, set자리] = useState<{ top: number; right: number } | null>(null);
  const 그릇 = useRef<HTMLSpanElement>(null);
  const 단추 = useRef<HTMLButtonElement>(null);
  const 머리id = useId();
  const 걸린수 = 조건들.filter((x) => x.걸림 !== null).length;

  function 열기() {
    const r = 단추.current?.getBoundingClientRect();
    set자리(r === undefined ? null : { top: r.bottom + 6, right: window.innerWidth - r.right });
    set열림(true);
  }
  function 닫기() {
    set열림(false);
    단추.current?.focus();
  }

  useEffect(() => {
    if (!열림) return;
    그릇.current?.querySelector<HTMLButtonElement>('.filter-pop button')?.focus();
    // 바깥을 눌러 닫을 때는 포커스를 단추로 끌어오지 않는다 — 누른 자리(결과 탭 · 칩의 ✕)에 남아야 한다
    const 바깥 = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || 그릇.current?.contains(e.target) !== true) set열림(false);
    };
    document.addEventListener('pointerdown', 바깥);
    return () => document.removeEventListener('pointerdown', 바깥);
  }, [열림]);

  return (
    <span
      className="filter-menu"
      ref={그릇}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && 열림) {
          e.stopPropagation();
          닫기();
        }
      }}
      // 탭으로 판 밖에 나가면 닫는다 — 열린 판이 포커스가 간 줄을 덮는다. relatedTarget 이 없는(빈 곳을 누른) 경우는 위 pointerdown 이 맡는다
      onBlur={(e) => {
        if (e.relatedTarget !== null && !e.currentTarget.contains(e.relatedTarget)) set열림(false);
      }}
    >
      <button ref={단추} type="button" className="btn ghost filter-btn" aria-haspopup="dialog" aria-expanded={열림} onClick={() => (열림 ? 닫기() : 열기())}>
        {t('필터')}
        {걸린수 === 0 ? null : <> <span className="filter-n">{걸린수}</span></>}
      </button>
      {!열림 ? null : (
        // tabIndex -1 — 판의 빈 곳을 눌러도 포커스가 판에 남아 Esc 가 듣는다
        <div
          className="filter-pop"
          role="dialog"
          aria-labelledby={머리id}
          tabIndex={-1}
          style={휴대폰 || 자리 === null ? undefined : { top: 자리.top, right: 자리.right, maxHeight: `calc(100vh - ${자리.top + 16}px)` }}
        >
          <div className="filter-pop-head">
            <b id={머리id}>{t('필터')}</b>
            <span>{t('고른 조건에 맞는 케이스만 목록에 남습니다')}</span>
          </div>
          <div className="filter-pop-body">
            {조건들.filter((x) => x.칸들.length > 0).map((x) => (
              <조건줄 key={x.이름} 조건={x} />
            ))}
          </div>
          <div className="filter-pop-foot">
            <button type="button" className="btn ghost" disabled={걸린수 === 0} onClick={() => 조건들.forEach((x) => x.걸림 !== null && x.풀기())}>
              {t('조건 초기화')}
            </button>
            {휴대폰 ? (
              <button type="button" className="btn" onClick={닫기}>
                {t('{건수}건 보기', { 건수: 건수 ?? 0 })}
              </button>
            ) : (
              <button type="button" className="btn ghost" onClick={닫기}>
                {t('닫기')}
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

// 하나만 고르는 조건이라 칩 고르기다 — 체크 네모는 여럿 고르는 조건에만 쓴다 (DESIGN.md 「필터 판」)
function 조건줄({ 조건 }: { 조건: 필터조건 }) {
  const id = useId();
  return (
    <div className="filter-field" role="group" aria-labelledby={id}>
      <span className="filter-label" id={id}>
        {조건.이름}
      </span>
      <span className="chip-group">
        {/* 열쇠는 차례다 — API 서버 이름이 「전체」면 글자가 겹친다 */}
        {조건.칸들.map((칸, i) => (
          <button type="button" className="chip" key={i} aria-pressed={칸.눌림} onClick={칸.누르기}>
            {칸.글}
            {칸.수 === undefined ? null : <> <span className="chip-n">{칸.수}</span></>}
          </button>
        ))}
      </span>
      <small className="filter-help">{조건.설명}</small>
    </div>
  );
}
