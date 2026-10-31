// PRD 초안 자식의 입력 파일 · 지시문 · 출력 읽기 — 순수 함수 (도메인/BTS 「PRD 초안 → 결정 필요」)

import { 가림표, 계정섞였나, 글모두 } from './authoring-reverse.js';

/** 집기 응답의 `draft` 칸 — 서버(bts/draft.ts 초안집기칸)가 만든 그대로다 */
export interface 초안자료 {
  projectId: number;
  services: { prefix: string; name: string; kind: string }[];
  issueKeys: string[];
  buildNo: string;
}

/** 초안 일인가 — 종류가 아니라 `draft` 칸으로 가른다(노트 일과 같은 판단) */
export function 초안일인가(것: { draft?: unknown }): 것 is { draft: 초안자료 } {
  const d = 것.draft as Partial<초안자료> | null | undefined;
  return typeof d === 'object' && d !== null && typeof d.projectId === 'number' && Array.isArray(d.issueKeys) && Array.isArray(d.services);
}

/** 자식 작업 폴더에 둘 파일 이름 */
export const 초안파일 = {
  요청: 'draft-request.json',
  PRD: 'draft-prd.json',
  출력: 'draft-output.json',
} as const;

/** 웹 애플리케이션만 브라우저로 화면을 연다 — 앱 · 게임은 폰, API 는 화면이 없다. 종류를 모르면 옛 서비스라 웹이다 */
export function 화면보나(종류: string | undefined, 주소: string | undefined): boolean {
  return (종류 === undefined || 종류 === 'SCREEN') && typeof 주소 === 'string' && 주소 !== '';
}

/** 요청 파일 — 비밀번호는 싣지 않는다(환경 변수로만 간다) */
export function 요청글(입력: { 자료: 초안자료; 서비스: string; 종류: string | undefined; env: string; 화면: boolean }): string {
  return JSON.stringify(
    {
      projectId: 입력.자료.projectId,
      service: 입력.서비스,
      kind: 입력.종류 ?? 'SCREEN',
      env: 입력.env,
      build: 입력.자료.buildNo,
      issueKeys: 입력.자료.issueKeys,
      projectServices: 입력.자료.services,
      screen: 입력.화면,
    },
    null,
    2,
  );
}

/** 값 안의 글에서 비밀번호를 가린다 — 날 JSON 글자가 아니라 푼 값에서(따옴표 · 역슬래시가 든 비밀번호도 가리게). 목록은 긴 것부터 온다(비밀번호들) */
export function 값가리기<T>(값: T, 비밀들: readonly string[]): T {
  if (비밀들.length === 0) return 값;
  const 가림 = (x: unknown): unknown => {
    if (typeof x === 'string') return 비밀들.reduce((글, 비밀) => 글.split(비밀).join(가림표), x);
    if (Array.isArray(x)) return x.map(가림);
    if (typeof x === 'object' && x !== null) return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, 가림(v)]));
    return x;
  };
  return 가림(값) as T;
}

/**
 * 자식 지시문. 자식은 저장소를 못 읽는다 — 말투 규칙(`.claude/skills/tpx-cases/references/korean-ai-tells.md`)의 핵심을 직접 옮겨 넣었다.
 * 판단 기준의 정본은 도메인/BTS 결정 6 · 「PRD 초안 → 결정 필요」다
 */
export function 초안지시문(입력: { 자료: 초안자료; 서비스: string; 폴더: string; 화면: boolean }): string {
  const { 자료, 서비스, 폴더, 화면 } = 입력;
  const 다른앱 = 자료.services.filter((s) => s.prefix !== 서비스);
  return [
    `너는 QA Hub 의 「PRD 초안」을 쓴다. 애플리케이션은 ${서비스}, 프로젝트 번호는 ${자료.projectId}, 배포 빌드는 ${자료.buildNo} 이다.`,
    `QA 서버에 방금 배포된 BTS 이슈(${자료.issueKeys.join(' · ')})를 보고, 이 애플리케이션의 PRD(표준 기획서)가 요구 단위로 어떻게 바뀌어야 하는지 줄마다 적는다.`,
    '사람이 그 줄을 하나씩 보고 고른다. 고른 줄만 PRD 새 버전이 되고 테스트가 다시 써진다.',
    '',
    `■ 입력 — 작업 폴더(${폴더})의 파일. 이 폴더 밖은 읽지도 쓰지도 않는다.`,
    `- ${초안파일.요청} — 프로젝트 · 애플리케이션 · 맡은 이슈 키 · 같은 프로젝트의 애플리케이션 목록`,
    `- ${초안파일.PRD} — 이 애플리케이션의 지금 PRD(version · items). 요구마다 reqId(요구 번호) · feature · text 가 있다`,
    '- MCP 도구(qa-hub) — bts_search(projectId, issueKey) 로 이슈 글을 읽고, note_read(projectId) 로 프로젝트 노트 목차와 문서를, prd_search · map_search 로 요구와 케이스를 찾는다',
    '',
    '■ 차례',
    `1. note_read 로 노트 목차를 보고 이 기능에 닿는 문서만 읽는다(노트는 맥락이지 기대값 근거가 아니다).`,
    `2. 이슈마다 bts_search 로 글(제목 · 설명 · 댓글)을 읽는다.`,
    `3. ${초안파일.PRD} 에서 그 이슈가 건드리는 요구를 찾는다.`,
    ...(화면
      ? [
          '4. 이슈가 말하는 화면만 브라우저로 열어 본다. 도구는 playwright-cli 하나다(Bash 로 playwright-cli 만 부를 수 있다). 처음엔 `playwright-cli --help` 로 명령을 본다.',
          '   주소는 환경 변수 TARGET_BASE_URL 이다. 로그인이 필요하면 TARGET_LOGIN_ID · TARGET_LOGIN_PASSWORD(역할 계정은 PLATFORM_ACCOUNTS JSON)를 `"$TARGET_LOGIN_PASSWORD"` 처럼 변수째 넘긴다. 값을 글로 옮겨 적지 않는다.',
          '   다 보면 브라우저를 닫는다. 앱 전체를 훑지 않는다 — 이슈가 말한 기능 화면만.',
        ]
      : ['4. 이번에는 화면을 열지 않는다(웹 애플리케이션이 아니거나 대상 주소가 없다). 이슈 글과 PRD 만으로 쓴다.']),
    '5. 출력 파일을 쓴다.',
    '',
    '■ 줄을 정하는 규칙',
    '- op 는 ADD(새 요구) · EDIT(있는 요구가 바뀜) · DEL(있는 요구가 없어짐) 셋이다. EDIT · DEL 은 reqId 에 지금 PRD 의 번호를 적고, ADD 는 reqId 를 안 쓴다.',
    '- text 는 PRD 요구 문장처럼 쓴다 — 「~한다」 「~이다」로 끝나는 한 문장. EDIT 는 바뀐 뒤 문장, DEL 은 지우는 까닭.',
    '- basis 는 근거다. 이슈 키와 그 이슈 글의 해당 문장을 짧게 따온다(예: 「DM-12 설명 — 최소 주문 금액을 2만 원으로」).',
    '- issueKeys 는 그 줄의 근거가 된 이슈 키다. 맡은 이슈 키만 쓴다.',
    '- sure 는 이슈 글에 적힌 것만 true 다. 화면에서만 본 것은 false 로 두고 basis 에 「화면에서만 봄」이라고 적는다 — 화면에서만 본 것을 확정하면 화면 버그가 기대값이 된다.',
    '- 이슈 설명이 너무 짧아 무엇이 바뀌는지 알 수 없으면 그 이슈는 sure false 줄 하나로 내고 basis 에 「이슈 설명이 모자람」과 무엇이 빠졌는지 적는다.',
    '- 같은 요구(reqId)를 건드리는 줄은 하나뿐이다. 이슈 둘이 같은 요구를 바꾸면 한 줄로 합치고 issueKeys 에 둘 다 적는다. 서버가 같은 번호 두 줄을 거절한다.',
    `- 이 애플리케이션(${서비스})과 상관없는 이슈는 줄을 내지 않는다. 하나도 없으면 rows 를 빈 목록으로 둔다.`,
    ...(다른앱.length > 0
      ? [
          `- 이슈가 다른 애플리케이션(${다른앱.map((s) => `${s.prefix} ${s.name}`).join(' · ')})과 이어진 흐름이면 e2e 에 E2E 시나리오를 제안한다 — 이어진 애플리케이션 접두사 둘 이상(services) · 단계 글(steps) · 이슈 키. 없으면 e2e 를 생략한다.`,
        ]
      : []),
    '- 코드는 보지 않는다. 비밀번호나 계정 값은 어디에도 적지 않는다.',
    '',
    '■ 출력',
    `${폴더}/${초안파일.출력} 에 JSON 하나를 쓴다:`,
    '{ "rows": [{ "op", "reqId"?, "text", "basis", "issueKeys", "sure" }], "e2e"?: [{ "title", "services", "steps", "issueKeys" }] }',
    '',
    '■ 사람 말로 쓴다',
    '- 번역투를 피한다. 「~에 있어서」 → 「~에서」, 「~에 의해」 → 행위자를 주어로, 「~와 관련하여」 → 「~에」, 「~를 통해」는 줄인다.',
    '- 「~되어진다」 같은 이중 피동 대신 「~된다」. 「~는 점이다」 같은 형식명사 결말 · 의의를 부풀리는 말을 쓰지 않는다. 이모지를 쓰지 않는다.',
    '- 화면 문구는 「」 안에 그대로 둔다. 짧게, 사실만.',
    '',
    '끝나면 한 줄로 몇 줄을 냈는지만 말한다.',
  ].join('\n');
}

export type 출력 = { rows: unknown[]; e2e?: unknown[] } | { 까닭: string };

/** 자식이 쓴 출력 파일 글을 가볍게 읽는다. 줄마다의 꼴 · 번호 검사는 서버(bts/draft.ts 초안검사)가 한다 — 여기서는 꼴만 */
export function 출력읽기(글: string): 출력 {
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return { 까닭: '출력 파일이 JSON 이 아니다' };
  }
  const 몸 = 값 as { rows?: unknown; e2e?: unknown } | null;
  if (몸 === null || typeof 몸 !== 'object' || !Array.isArray(몸.rows)) return { 까닭: '출력 파일에 rows 목록이 없다' };
  if (몸.e2e !== undefined && !Array.isArray(몸.e2e)) return { 까닭: '출력 파일의 e2e 는 목록이어야 한다' };
  return { rows: 몸.rows, ...(Array.isArray(몸.e2e) && { e2e: 몸.e2e }) };
}

/** 낸 초안에 비밀번호가 섞였나 — 화면에서 본 글을 옮기다 계정 값이 들 수 있다. 섞였으면 올리지 않는다 */
export function 비밀섞였나(몸: unknown, 비밀들: readonly string[]): boolean {
  return 계정섞였나(글모두(몸), 비밀들);
}
