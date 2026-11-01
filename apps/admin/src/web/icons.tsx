// 메뉴 아이콘 — 패키지 없이 SVG 를 직접 둔다 (DESIGN.md 원칙 5). 글자를 대신하지 않고 곁에 선다

export type 아이콘이름 = 'dashboard' | 'cases' | 'prd' | 'api' | 'authoring' | 'scenarios' | 'runs' | 'perf' | 'graph' | 'settings' | 'run' | 'bell' | 'person' | 'desktop' | 'web' | 'phone' | 'game' | 'sun' | 'moon' | 'search' | 'chev' | 'project' | 'menu';

// 24 격자 · 선 1.8 · 둥근 끝. 색은 글자를 따른다(currentColor) — 지금 자리면 글자와 같이 밝아진다
const 그림: Record<아이콘이름, React.ReactNode> = {
  // 네 칸 격자 — 서비스를 가로질러 한눈에 보는 현황
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  // 문서 위 체크 — 테스트 스크립트
  cases: (
    <>
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  // 줄 앞에 번호 점이 찍힌 문서 — 요구를 규칙 하나씩 적은 기획서
  prd: (
    <>
      <path d="M5 3h14v18H5z" />
      <path d="M11 8h5M11 12h5M11 16h5" />
      <path d="M8 8h.01M8 12h.01M8 16h.01" />
    </>
  ),
  // 펜 — 기획서에서 테스트를 쓴다
  // 중괄호 한 쌍 — 화면 없이 주고받는 API 문서
  api: (
    <>
      <path d="M9 4H8a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h1" />
      <path d="M15 4h1a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-1" />
    </>
  ),
  authoring: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  // 이어진 두 점 — 여러 케이스를 잇는 흐름
  scenarios: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" />
    </>
  ),
  // 되감는 시계 — 돌린 기록
  runs: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  // 바늘 계기판 — 부하와 속도를 잰다
  perf: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-6" />
    </>
  ),
  // 막대 — Grafana 의 운영 지표
  graph: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16v-6" />
    </>
  ),
  // 조절 손잡이 — 설정
  settings: (
    <>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  // 재생 — 목록 줄의 실행 버튼. 메뉴가 아니라 글자 없이 서므로 버튼이 aria-label 로 이름을 단다
  run: <path d="M8 5v14l11-7z" />,
  // 종 — 본문 위 「알림」 버튼. 글자 「알림」이 곁에 선다
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  // 사람 — 휴대폰 위 줄의 사람 버튼. 버튼이 aria-label 로 이름을 단다
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  // 모니터 — 휴대폰의 PC 전용 화면 안내. 제목 글이 곁에 선다
  desktop: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  // 지구 — 애플리케이션 줄의 종류 「웹」 표시. 웹만 빈칸이면 「아이콘이 없으면 웹」을 외워야 한다 (2026-10-29 사용자)
  web: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  // 폰 — 애플리케이션 줄의 종류 「Android 앱」 표시
  phone: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  // 게임패드 — 십자 키와 단추 둘. 폰 모양이면 Android 앱과 애플리케이션 줄에서 안 갈린다
  game: (
    <>
      <rect x="2" y="7" width="20" height="11" rx="5" />
      <path d="M7 10.5v4M5 12.5h4" />
      <circle cx="15.5" cy="11.5" r="0.8" />
      <circle cx="18" cy="13.8" r="0.8" />
    </>
  ),
  // 해 · 달 — 사이드바 바닥 밝게 · 어둡게 단추. 지금 아닌 쪽을 보인다 (화면공통 §8 「껍데기」)
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  // 돋보기 — 사이드바 찾기 칸 (화면공통 §8 「껍데기」 찾기 칸)
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  // 꺾쇠 ▸ — 접힌 메뉴 묶음. 펼치면 90도 돈다 (화면공통 §8 「자리 목록」)
  chev: <path d="M9 6l6 6-6 6" />,
  // 겹친 판 — 프로젝트(애플리케이션 여럿을 묶은 층). 사이드바를 접으면 맨 위 프로젝트 고르개가 이 모양으로 남는다
  project: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  // 세 줄 — 휴대폰 아래 탭 「전체」. 누르면 메뉴판이 올라온다
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

/** 꾸밈이라 화면 읽기에서 숨긴다 — 이름은 곁의 글자가 말한다. 접힌 사이드바에서도 글자는 0 크기로 남아 읽힌다 */
export function 아이콘({ 이름 }: { 이름: 아이콘이름 }) {
  return (
    <svg
      className="side-ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {그림[이름]}
    </svg>
  );
}
