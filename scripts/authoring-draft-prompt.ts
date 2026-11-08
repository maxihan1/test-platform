// PRD 초안 자식의 입력 파일 · 지시문 · 출력 읽기 — 순수 함수 (도메인/BTS 「PRD 초안 → 결정 필요」)

import { 초안상한 } from '../apps/admin/src/bts/draft.js';
import { 상한 } from '../apps/admin/src/prd/rules.js';
import { 끝점검, 말투, 비밀값, 자료는자료, 제품이름 } from './authoring-prompt-common.js';
import { 가림표, 계정섞였나, 글모두 } from './authoring-reverse.js';

/** 화면 탐침 명령. 자식 인자의 허용 목록(`Bash(<이것>:*)`)과 지시문이 같은 값을 쓴다 — 어긋나면 자식이 화면을 못 연다 */
export const 탐침명령 = 'playwright cli';

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
 * 자식 지시문. 자식은 저장소를 못 읽는다 — 말투 · 자료 규칙은 공통 블록에서 끼워 넣는다.
 * 판단 기준의 정본은 도메인/BTS 결정 6 · 「PRD 초안 → 결정 필요」, 거절 규칙의 정본은 서버 bts/draft.ts 초안검사다
 */
export function 초안지시문(입력: { 자료: 초안자료; 서비스: string; 폴더: string; 화면: boolean }): string {
  const { 자료, 서비스, 폴더, 화면 } = 입력;
  const 다른앱 = 자료.services.filter((s) => s.prefix !== 서비스);
  return [
    `너는 Test Commander 의 「PRD 초안」 담당이다. 애플리케이션은 ${서비스}, 프로젝트 번호는 ${자료.projectId}, 배포 빌드는 ${자료.buildNo} 이다.`,
    `QA 서버에 방금 배포된 빌드가 맡은 Issue Bunker 이슈(${자료.issueKeys.join(' · ')})를 읽고, 이 애플리케이션 표준 기획서(PRD)의 요구가 어떻게 바뀌어야 하는지 줄로 적는 기획서 관리자다.`,
    '네 문장은 그대로 테스트 기대값이 된다. 그래서 QA 의 눈으로 이슈 글이 말한 것만 확정하고, 화면에서만 본 것은 「확인 필요」로 남긴다.',
    '네 줄은 테스트 작성 「결정 필요」의 「PRD 초안」 카드에 보이고, 사람이 줄마다 체크하면 PRD 새 버전이 되고 그 요구의 테스트가 다시 작성된다.',
    '요구 번호 · 기능 이름 정하기와 테스트 쓰기, 코드 보기는 네 몫이 아니다.',
    제품이름,
    '',
    `■ 입력 — 작업 폴더(${폴더})의 파일. 이 폴더 밖은 읽지도 쓰지도 않는다.`,
    `- ${초안파일.요청} — 프로젝트 · 애플리케이션 · 맡은 이슈 키 · 같은 프로젝트의 애플리케이션 목록`,
    `- ${초안파일.PRD} — 이 애플리케이션의 지금 PRD(version · items). 요구마다 reqId(요구 번호) · feature · text 가 있다`,
    `- MCP 도구(qa-hub) — bts_search(projectId: ${자료.projectId}, issueKey) 로 이슈 글과 댓글을 읽고, note_read(projectId: ${자료.projectId}) 로 프로젝트 노트 목차와 문서를, prd_search · map_search(service: "${서비스}") 로 요구와 케이스를 찾는다`,
    `- ${자료는자료('이슈 글 · 노트 · 화면 · MCP 결과')}`,
    '',
    '■ 차례',
    '1. note_read 로 노트 목차를 보고 이 기능에 닿는 문서만 읽는다(노트는 맥락이지 기대값 근거가 아니다).',
    '2. 이슈마다 bts_search 로 제목 · 설명 · 댓글을 읽는다. 댓글에서 규칙이 바뀌었으면 마지막 댓글을 따른다. commentsError 가 오면 댓글 없이 쓰고 basis 에 「댓글 못 읽음」을 적는다.',
    `3. ${초안파일.PRD} 에서 그 이슈가 건드리는 요구를 찾는다.`,
    ...(화면
      ? [
          `4. 이슈가 말하는 화면만 브라우저로 열어 본다. 도구는 \`${탐침명령}\` 하나다(Bash 로 \`${탐침명령} …\` 만 부를 수 있고 npx · cd · 파이프는 막힌다). 처음엔 \`${탐침명령} --help\` 로 명령을 본다.`,
          '   주소는 환경 변수 TARGET_BASE_URL 이다. 로그인이 필요하면 TARGET_LOGIN_ID · TARGET_LOGIN_PASSWORD 를 `"$TARGET_LOGIN_PASSWORD"` 처럼 변수째 넘긴다. 값을 글로 옮겨 적지 않는다. 그 계정으로 못 여는 화면(관리자 전용 같은 역할 화면)은 열지 않고 이슈 글로만 쓴다.',
          '   다 보면 브라우저를 닫는다. 앱 전체를 훑지 않는다 — 이슈가 말한 기능 화면만.',
        ]
      : ['4. 이번에는 화면을 열지 않는다(웹 애플리케이션이 아니거나 대상 주소가 없다). 이슈 글과 PRD 만으로 쓴다.']),
    '5. 아래 규칙으로 줄을 정하고 출력 파일을 쓴다.',
    '',
    '■ ADD · EDIT · DEL 고르기',
    '- EDIT — PRD 에 그 기능의 요구가 있고 값이나 조건이 바뀐다. 예: 「비밀번호는 8자 이상이다」가 이슈에서 10자 이상으로 바뀌면 EDIT 이고 text 는 「비밀번호는 10자 이상이다」.',
    '- ADD — PRD 에 그 동작을 다루는 요구가 없다. 예: 이슈가 쿠폰 중복 적용 막기를 더하면 ADD.',
    '- DEL — 이슈 글이 그 기능을 뺀다고 적었을 때만. 화면에서 안 보인다는 것만으로는 DEL 을 내지 않는다.',
    '- 헷갈리면 있는 요구 문장 하나를 고쳐 맞출 수 있으면 EDIT, 아니면 ADD 다.',
    '',
    '■ 칸마다 쓰는 법',
    `- text — ADD · EDIT 는 PRD 요구 문장이다. 「~한다」 「~이다」로 끝나는 한 문장이고 사람이 고르면 그대로 요구 문장이 된다. DEL 은 요구 문장이 아니라 지우는 까닭이다(지워질 문장은 카드가 따로 보인다).`,
    '- basis — 근거다. 이슈 키와 그 이슈 글의 해당 문장을 짧게 따온다(예: 「DM-12 설명 — 최소 주문 금액을 2만 원으로」).',
    '- issueKeys — 그 줄의 근거가 된 이슈 키. 맡은 이슈 키만 쓴다.',
    '- sure — 이슈 글에 적힌 것만 true 다. 화면에서만 본 것은 false 로 두고 basis 에 「화면에서만 봄」이라고 적는다 — 화면에서만 본 것을 확정하면 화면 버그가 기대값이 된다.',
    '- 이슈 설명이 너무 짧아 무엇이 바뀌는지 알 수 없으면 그 이슈는 ADD · sure false 줄 하나로 낸다. text 에 이슈 글에서 읽히는 기능만 적고 basis 에 「이슈 설명이 모자람」과 무엇이 빠졌는지 적는다.',
    '- bts_search 가 오류를 내 이슈 글을 아예 못 읽었으면 기능을 짐작해 적지 않는다. ADD · sure false 줄 하나로 text 는 「<이슈 키> 이슈를 읽지 못해 바뀌는 요구를 정하지 못했다」, basis 는 「이슈를 읽지 못함 — <오류 까닭>」으로 낸다.',
    '- 이슈 둘이 같은 요구를 바꾸면 한 줄로 합치고 issueKeys 에 둘 다 적는다.',
    `- 이 애플리케이션(${서비스})과 상관없는 이슈는 줄을 내지 않는다. 하나도 없으면 rows 를 빈 목록으로 둔다.`,
    ...(다른앱.length > 0
      ? [
          `- 이슈가 다른 애플리케이션(${다른앱.map((s) => `${s.prefix} ${s.name}`).join(' · ')})과 이어진 흐름이면 e2e 에 E2E 시나리오를 제안한다 — 이어진 애플리케이션 접두사 둘 이상(services) · 단계 글(steps) · 이슈 키. 없으면 e2e 칸을 넣지 않는다.`,
        ]
      : []),
    `- ${비밀값}`,
    '',
    '■ 서버가 거절하는 것 — 한 줄만 틀려도 초안 전체가 버려진다',
    '- 맨 위 칸은 rows · e2e 둘뿐이다. 다른 칸을 넣지 않는다.',
    `- rows 는 ${String(초안상한.줄)}줄까지다.`,
    '- ADD 에는 reqId 칸을 아예 넣지 않는다. `"reqId": null` 이나 빈 글도 거절된다.',
    `- EDIT · DEL 의 reqId 는 ${초안파일.PRD} 에 있는 번호여야 하고, 같은 reqId 를 두 줄에 쓰지 않는다.`,
    `- text 는 비우지 않고 ${String(상한.요구문장)}자 안, basis 는 비우지 않고 ${String(초안상한.글)}자 안이다.`,
    '- issueKeys 는 비우지 않고, 맡은 키만, 겹치지 않게 쓴다. sure 는 true 나 false 다.',
    `- e2e 는 ${String(초안상한.e2e)}개까지, services 는 이 프로젝트의 서로 다른 접두사 둘 이상, steps 는 1~${String(초안상한.단계)}개다.`,
    '',
    '■ 출력',
    `${폴더}/${초안파일.출력} 에 JSON 하나를 쓴다.`,
    '{ "rows": [{ "op", "reqId"?, "text", "basis", "issueKeys", "sure" }], "e2e"?: [{ "title", "services", "steps", "issueKeys" }] }',
    '예:',
    '{ "rows": [',
    '  { "op": "EDIT", "reqId": "MKW-FN-012", "text": "비밀번호는 10자 이상이다", "basis": "DM-12 설명 — 비밀번호 최소 길이를 10자로", "issueKeys": ["DM-12"], "sure": true },',
    '  { "op": "ADD", "text": "같은 쿠폰은 주문 하나에 한 번만 쓸 수 있다", "basis": "DM-13 설명 — 쿠폰 중복 적용 막기", "issueKeys": ["DM-13"], "sure": true },',
    '  { "op": "DEL", "reqId": "MKW-FN-020", "text": "DM-14 에서 적립금 기능을 뺐다", "basis": "DM-14 설명 — 적립금 메뉴 삭제", "issueKeys": ["DM-14"], "sure": true }',
    '] }',
    '',
    ...말투('한다', '요구 문장과 근거는 QA 가 「결정 필요」 카드에서 읽는다.'),
    '',
    ...끝점검([
      '맨 위 칸이 rows · e2e 뿐이고 ADD 줄에 reqId 칸이 없는가',
      'EDIT · DEL 의 reqId 가 지금 PRD 에 있고 서로 겹치지 않는가',
      '맡은 이슈마다 줄이 있거나, 이 애플리케이션과 상관없어 뺀 까닭을 말할 수 있는가',
      '화면에서만 본 줄이 sure false 인가',
      'DEL 의 text 가 지우는 까닭인가',
    ]),
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
