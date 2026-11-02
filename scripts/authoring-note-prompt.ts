// 프로젝트 노트 고치는 자식의 입력 파일 · 지시문 · 출력 읽기 — 순수 함수 (도메인/BTS 「맥락 — 프로젝트 노트」)

import { type 노트문서, 노트상한, 늘있는문서 } from '../apps/admin/src/projectNote/note.js';
import { 끝점검, 막혔을때, 말투, 비밀값, 자료는자료, 제품이름 } from './authoring-prompt-common.js';

export type { 노트문서 };

export interface 노트사건 {
  id: number;
  kind: string;
  payload: unknown;
  createdAt: string;
}

/** 집기 응답의 `note` 칸 — 서버가 만든 그대로다 */
export interface 노트자료 {
  project: { id: number; name: string; btsProject: string };
  services: { prefix: string; name: string; kind: string }[];
  current: { version: number; savedAt: string; docs: 노트문서[] } | null;
  events: 노트사건[];
}

/** 노트 일인가 — 종류가 아니라 `note` 칸으로 가른다. 원본이 NOTE 인 재실행도 이 칸이 실린다 */
export function 노트일인가(것: { note?: unknown }): 것 is { note: 노트자료 } {
  const n = 것.note;
  return typeof n === 'object' && n !== null && Array.isArray((n as { events?: unknown }).events);
}

/** PR 하나에서 읽을 파일 경로의 상한 — 이 위는 자른다 */
export const PR경로상한 = 100;

/** `https://github.com/<소유>/<저장소>/pull/<번호>` 만 받는다. 그 밖의 주소(다른 호스트 · 이슈 주소)는 null */
export function PR주소풀기(글: unknown): { 저장소: string; 번호: number } | null {
  if (typeof 글 !== 'string') return null;
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\/?$/.exec(글.trim());
  return m === null ? null : { 저장소: `${m[1]}/${m[2]}`, 번호: Number(m[3]) };
}

/** `gh pr view <주소> --json files` 의 인자 — 주소는 위 모양을 지난 것만 넘긴다 */
export function PR경로인자(주소: string): string[] {
  return ['pr', 'view', 주소, '--json', 'files'];
}

/** gh 가 낸 글에서 바뀐 파일 경로를 뽑는다. 못 읽으면 null. 상한을 넘는 것은 자른다 */
export function PR경로풀기(낸것: string): string[] | null {
  try {
    const 값: unknown = JSON.parse(낸것);
    const 파일들 = (값 as { files?: unknown } | null)?.files;
    if (!Array.isArray(파일들)) return null;
    const 경로들 = 파일들.map((f) => (f as { path?: unknown } | null)?.path).filter((p): p is string => typeof p === 'string');
    return 경로들.slice(0, PR경로상한);
  } catch {
    return null;
  }
}

/** 사건 목록에 PR 병합 사건의 바뀐 파일을 더해 자식이 읽을 글로 만든다. 못 읽은 PR 은 `changedFiles` 가 null 이다 */
export function 사건글(사건들: 노트사건[], 경로들: ReadonlyMap<number, string[] | null>): string {
  const 더한것 = 사건들.map((e) => (e.kind === 'PR_MERGED' ? { ...e, changedFiles: 경로들.get(e.id) ?? null } : e));
  return JSON.stringify(더한것, null, 2);
}

/** 자식 작업 폴더에 둘 입력 파일 이름 */
export const 노트파일 = {
  프로젝트: 'note-project.json',
  지금: 'note-current.json',
  사건: 'note-events.json',
  출력: 'note-output.json',
} as const;

/** 프로젝트 · 애플리케이션 목록 파일의 글 */
export function 프로젝트글(자료: 노트자료): string {
  return JSON.stringify({ project: 자료.project, services: 자료.services }, null, 2);
}

/** 지금 노트 파일의 글. 처음 판이면 null 을 쓴다 */
export function 지금글(자료: 노트자료): string {
  return JSON.stringify(자료.current, null, 2);
}

/**
 * 자식 지시문. 자식은 저장소를 못 읽는다 — 말투 · 자료 규칙은 공통 블록에서 끼워 넣는다(번역투 목록의 원본이 이 지시문에 있던 것이다).
 * 숫자는 `노트상한` 에서 끼워 받는다(정본은 note.ts)
 */
export function 노트지시문(자료: 노트자료, 폴더: string, 열쇠있음: boolean): string {
  const 처음판 = 자료.current === null;
  const [한눈에, 최근, 자주깨짐, 요령, 더볼곳] = 늘있는문서;
  return [
    `너는 Test Commander 프로젝트 「${자료.project.name}」의 노트 담당이다. 배포 · 이슈 열림과 닫힘 · PR 병합 · PRD 새 버전 · 작성 끝 같은 사건을 받아 프로젝트 노트를 고쳐 쓰는 기록 담당이다.`,
    '노트를 읽는 쪽은 이 프로젝트를 처음 맡는 다른 AI(테스트 작성 · PRD 초안 · 수정 AI)와 자기 Claude Code 에서 note_read 로 묻는 사람이다. 그들이 「어디부터 보면 되나」를 1분 안에 알 수 있게 쓰는 것이 기준이다.',
    '사람은 노트를 고치지 않고 화면도 없어서, 네가 틀리게 쓴 줄은 다음 사건 때까지 그대로 남는다. 틀린 내용을 고칠 곳은 애플리케이션 가이드다.',
    '노트는 기대값(테스트가 맞는지 판정하는 근거)이 아니다. 사건에 없는 사실 짐작, 코드 읽기, 기대값 정하기는 네 몫이 아니다. 모든 글은 마크다운(md)으로 쓴다.',
    제품이름,
    '',
    `■ 입력 — 작업 폴더(${폴더})의 파일. 이 폴더 밖은 읽지도 쓰지도 않는다.`,
    `- ${노트파일.프로젝트} — 프로젝트(project.id 가 프로젝트 번호)와 애플리케이션 목록(접두사 · 이름 · 종류)`,
    `- ${노트파일.지금} — 지금 노트의 문서들(${처음판 ? '처음이라 null 이다' : `${자료.current?.version}판`}). 문서마다 name · summary(한 줄 설명) · body(본문)`,
    `- ${노트파일.사건} — 아직 노트에 안 들어간 사건들, 오래된 것부터. kind 는 DEPLOY · TASK_DONE · ISSUE_OPEN · ISSUE_CLOSE · PR_MERGED · PRD_VERSION · AUTHORING_DONE.`,
    '  PR_MERGED 의 payload 는 이슈 키 · PR 번호 · PR 주소 · PR 제목이고, changedFiles 는 그 PR 이 바꾼 파일 경로다(null 이면 못 읽었으니 제목만 쓴다).',
    `- ${자료는자료('사건 · PR 제목 · MCP 결과')}`,
    '',
    '■ 코드는 읽지 않는다. 너는 저장소를 받지 못했다. PR 제목과 바뀐 파일 경로만 보고 적는다.',
    ...(열쇠있음
      ? [
          `더 알아야 하면 MCP 도구(qa-hub)로 찾아본다 — note_read 의 projectId 는 ${String(자료.project.id)}, prd_search 의 service 는 ${노트파일.프로젝트} 의 애플리케이션 접두사다. 조회 도구뿐이고 찾은 것도 확인된 것만 적는다.`,
        ]
      : ['MCP 도구는 이번에 없다. 입력 파일만으로 쓴다.']),
    '',
    '■ 늘 있는 문서 다섯 — 노트에는 이 이름들이 늘 있고 목차 맨 앞에 선다.',
    `- ${한눈에} — 프로젝트가 무엇이고 애플리케이션이 어떻게 나뉘는지, 처음 보는 AI 가 알아야 할 것을 짧게`,
    `- ${최근} — 사건을 한 줄씩 쌓는 문서. 줄 꼴은 \`- YYYY-MM-DD · 사건 · 접두사 — 한 줄\` 이다(예: \`- 2026-11-02 · PR 병합 · MKW — 쿠폰 중복 적용 막기(#41)\`)`,
    `- ${자주깨짐} — 자주 실패하거나 흔들리는 기능과 까닭`,
    `- ${요령} — 테스트를 쓸 때의 요령. 요약하지 말고 각 애플리케이션 가이드의 「배운 것」을 가리키기만 한다`,
    `- ${더볼곳} — 더 읽을 곳(PRD 관리 · 서비스 가이드 · 이슈)`,
    '',
    '■ 사건마다 넣는 곳 — 모든 사건은 먼저 「최근 바뀐 것」에 한 줄이 된다. 그다음',
    '- PR_MERGED · TASK_DONE — 그 기능 문서의 코드 자리 · 최근 PR 을 고친다. 기능 문서가 없으면 만든다',
    '- PRD_VERSION — 바뀐 요구가 닿는 기능 문서를 고친다',
    `- ISSUE_OPEN · ISSUE_CLOSE — 같은 기능에서 이슈가 되풀이되면 「${자주깨짐}」에 적고, 닫힌 이슈는 그 줄을 고친다`,
    '- DEPLOY · AUTHORING_DONE — 「최근 바뀐 것」 한 줄로 끝난다',
    '',
    '■ 문서를 나누는 법',
    '- 「기능별 자리」는 한 문서에 몰지 않는다. 기능 묶음마다 기능 문서 하나로 만든다(문서 이름은 「쿠폰」 · 「결제」처럼 기능 이름). 그 기능의 코드 자리(파일 경로) · 최근 PR · 자주 깨지는 점을 모은다.',
    `- 「${최근}」는 최근 ${노트상한.최근줄}줄만 둔다(목록 줄 하나가 사건 하나). 더 오래된 줄은 달마다 「지난 기록 YYYY-MM」 문서로 옮긴다. 이름은 이 꼴 그대로다(예: 지난 기록 2026-10). 다르게 지으면 서버가 기능 문서로 센다.`,
    `- 문서 하나의 본문은 ${노트상한.본문}자, 한 줄 설명은 ${노트상한.설명}자, 이름은 ${노트상한.이름}자까지다. 문서는 전체 ${노트상한.문서}개까지다.`,
    `- 본문이 넘을 것 같으면 자르지 않는다. 오래된 PR · 지난 일을 한 줄로 줄이고, 그래도 넘으면 기능 문서를 나눈다. 문서가 ${노트상한.문서}개에 가까우면 나누지 않는다. 새 기능 문서도 만들지 말고 가장 가까운 기능 문서에 합친다. 넘은 글은 서버가 통째로 막아서 이번 고침이 사라진다.`,
    '',
    '■ 출력 — 바뀐 문서만 쓴다. 안 바뀐 문서를 다시 쓰다가 흐트러지게 하지 않는다.',
    `${폴더}/${노트파일.출력} 에 JSON 하나를 쓴다: { "docs": [{ "name", "summary", "body" }], "remove": ["지울 문서 이름"] }`,
    '- docs 에는 새로 쓰거나 고친 문서만 넣는다. 같은 name 이면 그 문서가 통째로 바뀐다.',
    '- 지울 문서는 remove 에 이름만 적는다(늘 있는 다섯은 못 지운다). 없으면 remove 를 생략한다.',
    `- summary 는 목차에 서는 한 줄 설명이다. 문서마다 ${노트상한.설명}자 안에서 무엇을 담은 문서인지 쓴다.`,
    ...(처음판
      ? [`- 지금 노트가 없으니 처음 판이다. 늘 있는 다섯(${늘있는문서.join(' · ')})을 전부 쓴다. 기능 문서도 사건과 애플리케이션 목록에서 알 수 있는 만큼 만든다.`]
      : ['- 새 사건이 닿지 않은 문서는 docs 에 넣지 않는다.']),
    `- 사건이 없는 칸을 지어내지 않는다. 모르면 「아직 모름」이라고 적는다. ${막혔을때('그 문서 본문')}`,
    `- 예: { "docs": [{ "name": "쿠폰", "summary": "쿠폰 적용 · 중복 막기의 코드 자리와 최근 PR", "body": "## 코드 자리\\n- 쿠폰 적용 — apps/web/src/coupon/\\n\\n## 최근 PR\\n- 2026-11-02 #41 쿠폰 중복 적용 막기(DM-13)" }] }`,
    `- ${비밀값}`,
    '',
    ...말투('한다', '이 노트는 다른 AI 와 사람이 참고 문서로 읽는다.'),
    '- 기능 이름을 먼저 쓰고 코드 경로는 그 뒤에 붙인다. 「쿠폰 적용 — apps/web/src/coupon/」처럼.',
    '- 줄임말을 풀어 쓴다. 영어는 업계 표준 이름(API · PR 등)만 그대로 둔다.',
    '',
    ...끝점검([
      '사건마다 「최근 바뀐 것」에 한 줄이 있고 줄 꼴이 맞는가',
      `「${최근}」가 ${노트상한.최근줄}줄을 넘지 않고, 옮긴 문서 이름이 「지난 기록 YYYY-MM」 꼴인가`,
      `문서마다 본문 ${노트상한.본문}자 · 설명 ${노트상한.설명}자 · 이름 ${노트상한.이름}자 안이고 전체 문서가 ${노트상한.문서}개를 넘지 않는가`,
      '사건과 MCP 결과에 없는 사실을 쓰지 않았는가',
    ]),
    '',
    '끝나면 한 줄로 어떤 문서를 고쳤는지만 말한다.',
  ].join('\n');
}

export type 출력 = { docs: 노트문서[]; remove?: string[] } | { 까닭: string };

/** 자식이 쓴 출력 파일 글을 가볍게 읽는다. 상한 · 겹치기 검사는 서버가 한다 — 여기서는 꼴만 */
export function 출력읽기(글: string): 출력 {
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return { 까닭: '출력 파일이 JSON 이 아니다' };
  }
  const 몸 = 값 as { docs?: unknown; remove?: unknown } | null;
  if (몸 === null || typeof 몸 !== 'object' || !Array.isArray(몸.docs)) return { 까닭: '출력 파일에 docs 목록이 없다' };
  const docs: 노트문서[] = [];
  for (const d of 몸.docs as unknown[]) {
    const 문서 = d as { name?: unknown; summary?: unknown; body?: unknown } | null;
    if (typeof 문서?.name !== 'string' || typeof 문서.summary !== 'string' || typeof 문서.body !== 'string') {
      return { 까닭: '출력 파일의 문서 하나에 name · summary · body 글이 다 있지 않다' };
    }
    docs.push({ name: 문서.name, summary: 문서.summary, body: 문서.body });
  }
  if (몸.remove === undefined) return { docs };
  if (!Array.isArray(몸.remove) || !몸.remove.every((r) => typeof r === 'string')) return { 까닭: '출력 파일의 remove 는 이름 글 목록이어야 한다' };
  return { docs, remove: 몸.remove as string[] };
}
