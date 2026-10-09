// 메뉴 아이콘 — 패키지 없이 SVG 를 직접 둔다 (DESIGN.md 원칙 5). 글자를 대신하지 않고 곁에 선다

export type 아이콘이름 = 'dashboard' | 'cases' | 'authoring' | 'scenarios' | 'runs' | 'graph' | 'settings' | 'run';

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
  // 펜 — 기획서에서 테스트를 쓴다
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
