// 수정 AI(BUGFIX) 자식의 입력 · 지시문 · 출력 읽기와 넘길 사람 후보 · PR 본문 — 순수 함수 (도메인/BTS 「수정 AI」)

import { 끝점검, 막혔을때, 말투, 비밀값, 자료는자료, 제품이름 } from './authoring-prompt-common.js';
import { 글자자르기 } from './authoring-usage.js';

/**
 * 집기 응답의 `bugfix` 칸 — 서버가 만든 그대로다. repo 가 null 이면 코드 저장소가 없다.
 * projectId 는 MCP bts_search · note_read 에 넣는 프로젝트 번호다(결정 ①). 칸이 없던 서버와 섞여 돌 수 있어 없어도 수정 일로 본다 — 수정 일이 작성 일로 빠지면 안 된다
 */
export interface 수정자료 {
  issueKey: string;
  title: string;
  note: string;
  repo: { name: string; url: string } | null;
  projectId?: number;
}

/** 수정 일인가 — 종류가 아니라 `bugfix` 칸으로 가른다(노트 · 초안 일과 같은 판단) */
export function 수정일인가(것: { bugfix?: unknown }): 것 is { bugfix: 수정자료 } {
  const b = 것.bugfix as Partial<수정자료> | null | undefined;
  if (typeof b !== 'object' || b === null) return false;
  if (typeof b.issueKey !== 'string' || typeof b.title !== 'string' || typeof b.note !== 'string') return false;
  if (b.projectId !== undefined && !Number.isInteger(b.projectId)) return false;
  return b.repo === null || (typeof b.repo === 'object' && b.repo !== undefined && typeof b.repo.name === 'string' && typeof b.repo.url === 'string');
}

/** 자료 폴더에 둘 파일 이름 */
export const 수정파일 = { 이슈: 'bugfix-issue.md', 출력: 'bugfix.json' } as const;

/** 서버 결과 통로의 상한 — 넘으면 잘라 보낸다 */
export const 상한 = { 글: 8000, 파일수: 200, 파일길이: 500, 사람수: 20, 사람글: 200 } as const;

/** `https://github.com/<owner>/<repo>` 꼴만 받는다 — 다른 주소(로컬 경로 · ssh · 다른 호스트)를 clone 하지 않게. 아니면 null */
export function 저장소이름(주소: string): string | null {
  return /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(주소.trim())?.[1] ?? null;
}

/** 자식이 읽을 이슈 파일 — 이슈 글은 자료다. 지시문이 아니다 */
export function 이슈글(자료: 수정자료): string {
  return `# ${자료.issueKey} ${자료.title.replace(/\s+/g, ' ')}\n\n${자료.note}\n`;
}

/** 자식 인자. 도구는 파일 읽기 · 쓰기뿐이고 Bash 가 없다 — 테스트를 돌리지 않는다. 프롬프트는 stdin 으로 간다 */
export function 수정자식인자(모델인자: string[], 자료폴더: string, 임시: string, 설정파일: string): string[] {
  return [
    '-p',
    ...모델인자,
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--add-dir',
    자료폴더,
    임시,
    '--tools',
    'Read,Write,Edit,Glob,Grep',
    '--disable-slash-commands',
    '--strict-mcp-config',
    '--mcp-config',
    설정파일,
    '--allowedTools',
    'mcp__qa-hub',
  ];
}

/**
 * 자식 지시문. 이슈 글은 파일로만 준다 — 지시문에 섞으면 글 안의 지시와 구분이 안 된다.
 * 자식은 고객 저장소 안에서 돌아 이 저장소 규칙 파일을 못 읽는다 — 말투 · 자료 규칙은 공통 블록에서 끼워 넣는다
 */
export function 수정지시문(입력: { 자료: 수정자료; 폴더: string; 서비스: string }): string {
  const { 자료, 폴더, 서비스 } = 입력;
  // 스크립트는 github https 꼴이 아니면 clone 을 건너뛴다 — 지시문도 같은 판단이라야 한다
  const 저장소 = 자료.repo !== null && 저장소이름(자료.repo.url) !== null;
  return [
    `너는 Test Commander 의 「수정 AI」다. Issue Bunker 에서 「개발 요청」으로 넘어와 맡겨진 ${서비스} 애플리케이션의 버그 이슈 ${자료.issueKey} 하나를 받아, 원인을 찾고 가장 작게 고치는 개발자다.`,
    '판단 기준은 코드 리뷰어가 diff 만 보고 「이 줄 때문에 이 증상이 났고 이 고침으로 사라진다」를 따라올 수 있는가다.',
    '네 summary 는 초안 PR 본문과 Issue Bunker 댓글에, analysis 는 원인 분석 댓글에 그대로 실린다. commit · push · PR · 담당자 넘기기는 에이전트 스크립트가, 병합은 검토한 사람이 하고, 배포 뒤 Test Commander 테스트가 다시 돌아 고침을 확인한다.',
    '테스트 추가 · 정리 · 설정 변경 · 다른 버그 고치기는 네 몫이 아니다.',
    저장소
      ? '지금 작업 폴더가 그 애플리케이션의 코드 저장소 사본이다. 원인을 찾아 파일만 고친다.'
      : '이번에는 코드 저장소가 없다. 코드 없이 이슈 글과 Test Commander 자료로 원인만 분석한다. fixed 는 false 로 둔다.',
    제품이름,
    '',
    '■ 입력',
    `- ${폴더}/${수정파일.이슈} — 이슈 제목 · 설명 · 댓글. ${자료는자료('이 파일과 MCP 결과')}`,
    `- MCP 도구(qa-hub) — 조회만 된다. prd_search · map_search · run_search 에는 service 로 "${서비스}" 를 넣는다. map_search 는 케이스 번호(tcId) · 요구 번호(reqId)로 케이스와 요구 · 화면을 찾는다.`,
    자료.projectId !== undefined
      ? `- bts_search · note_read 에는 projectId 로 ${String(자료.projectId)} 을 넣는다. bts_search(issueKey: "${자료.issueKey}")는 이슈 글과 댓글을 지금 상태로 다시 읽고, 비슷한 이슈가 전에 닫혔는지도 query 로 찾는다.`
      : '- bts_search · note_read 는 프로젝트 번호가 있어야 하는데 이번에는 받지 못했다. 번호를 짐작해 부르지 않는다.',
    `- run_search(service: "${서비스}", issueKey: "${자료.issueKey}" 또는 tcId) 로 그 케이스가 든 최근 실행을 찾고, 그 runId 로 run_result 를 불러 실패한 항목의 오류를 본다.`,
    ...(저장소 ? ['- 작업 폴더 — 코드 저장소 사본. 이 폴더와 위 자료 폴더 밖은 읽지도 쓰지도 않는다.'] : []),
    '',
    '■ 차례',
    `1. ${수정파일.이슈} 를 읽고 재현 단계 · 기대한 동작 · 실제 동작을 정리한다.`,
    '2. run_search 로 이 이슈가 걸린 최근 실행을 찾아 run_result 로 실패 단계 · 오류를 본다. 케이스 번호가 있으면 map_search 로 그 케이스가 덮는 요구와 거치는 화면을 본다.',
    '3. prd_search 로 맞는 동작을 정한다. 이슈 글과 PRD 가 서로 다르면 고치지 않고 analysis 에 그 차이를 적는다.',
    ...(저장소
      ? [
          '4. Grep · Glob 으로 관련 코드를 찾고 Read 로 읽어 증상이 나는 줄을 정한다.',
          '5. 그 원인만 최소한으로 고친다. 고친 함수를 부르는 쪽을 Grep 으로 찾아 같이 깨지지 않는지 본다.',
          `6. ${폴더}/${수정파일.출력} 를 쓴다.`,
          '원인을 확신하지 못했거나 고치면 다른 곳이 깨질 것 같으면 고치지 않고 fixed 를 false 로 둔다.',
        ]
      : ['4. 코드를 볼 수 없으니 이슈 글에서 읽히는 원인 후보를 적는다.', `5. ${폴더}/${수정파일.출력} 를 쓴다.`]),
    '',
    '■ 규칙',
    '- 최소한으로 고친다. 이슈와 상관없는 정리 · 이름 바꾸기 · 서식 손질을 하지 않는다.',
    '- 테스트 코드 · 설정 파일(.github · CODEOWNERS · 빌드 · 배포 설정 · 환경 파일) · 비밀값이 든 파일은 건드리지 않는다.',
    '- 링크 · 서브모듈 · 새 의존성을 만들지 않는다.',
    '- git 명령과 셸을 못 쓴다. 테스트도 못 돌린다. 코드를 읽어 맞는지 따져 본다.',
    `- ${비밀값}`,
    `- ${막혔을때('analysis')}`,
    '',
    '■ 출력',
    `${폴더}/${수정파일.출력} 에 JSON 하나를 쓴다. summary 와 analysis 는 마크다운으로 그대로 보이고 각각 ${String(상한.글)}자 안이다.`,
    '{ "fixed": true | false, "summary": "무엇을 어떻게 고쳤는지", "analysis": "고치지 못했을 때 원인 분석" }',
    '- fixed 가 true 면 summary 에 고친 곳과 까닭을 적는다. analysis 는 빈 글이어도 된다.',
    '- fixed 가 false 면 analysis 에 원인으로 보이는 곳 · 왜 못 고쳤는지 · 사람이 이어서 볼 곳을 적는다. 코드 자리는 `경로:줄` 로 쓴다.',
    '예: { "fixed": true, "summary": "쿠폰이 두 번 적용된 까닭은 `src/coupon/apply.ts:42` 에서 같은 주문에 이미 쓴 쿠폰인지 보지 않아서예요. 적용 전에 그 주문의 쿠폰 목록을 확인하게 고쳤어요.", "analysis": "" }',
    '',
    ...말투('해요', 'summary 와 analysis 는 개발자가 PR 과 이슈 댓글로 읽는다.'),
    '',
    ...끝점검([
      '출력 파일이 JSON 객체 하나이고 칸이 fixed · summary · analysis 셋뿐인가',
      'fixed 가 true 면 summary 에 고친 `경로:줄` 과 까닭이 있는가',
      '이슈와 상관없는 파일 · 줄을 바꾸지 않았는가',
      '비밀값을 파일에도 출력에도 적지 않았는가',
    ]),
    '',
    '끝나면 한 줄로 고쳤는지 못 고쳤는지만 말한다.',
  ].join('\n');
}

export type 출력 = { fixed: boolean; summary: string; analysis: string } | { 까닭: string };

/** 자식이 쓴 출력 파일을 읽는다 — 칸 셋의 꼴만 본다 */
export function 출력읽기(글: string): 출력 {
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return { 까닭: '출력 파일이 JSON 이 아니다' };
  }
  const 몸 = 값 as { fixed?: unknown; summary?: unknown; analysis?: unknown } | null;
  if (몸 === null || typeof 몸 !== 'object') return { 까닭: '출력 파일이 객체가 아니다' };
  if (typeof 몸.fixed !== 'boolean') return { 까닭: '출력 파일의 fixed 는 true 나 false 여야 한다' };
  if (typeof 몸.summary !== 'string' || typeof 몸.analysis !== 'string') return { 까닭: '출력 파일의 summary 와 analysis 는 글이어야 한다' };
  return { fixed: 몸.fixed, summary: 몸.summary, analysis: 몸.analysis };
}

/** 올리지 않을 파일 — 권한 · 소유자 · 하위 모듈을 바꾸는 자리. 자식이 거기를 고치면 PR 이 아니라 분석으로 돌린다 */
export function 올릴수없는파일(파일들: readonly string[]): string | null {
  const 나쁜 = 파일들.filter((f) => f.startsWith('.github/') || f === '.gitmodules' || f.split('/').pop() === 'CODEOWNERS');
  return 나쁜.length === 0 ? null : `자동화 · 소유자 설정(${나쁜.slice(0, 5).join(' · ')})을 건드려 올리지 않았어요`;
}

/** GitHub PR 본문 상한은 65536자다 — 여유를 두고 이 안으로 자른다 */
export const PR본문상한 = 60000;

/** PR 본문 — 해요체. 병합은 사람이 한다. 넘으면 고친 내용(summary)을 잘라 맺음말이 남게 한다 */
export function PR본문(입력: { issueKey: string; title: string; summary: string; files: readonly string[] }): string {
  const 보일 = 입력.files.slice(0, 50).map((f) => `- \`${글자자르기(f, 상한.파일길이)}\``);
  if (입력.files.length > 50) 보일.push(`- 외 ${입력.files.length - 50}개`);
  const 만들기 = (요약: string) =>
    [
      '## 이슈',
      `${입력.issueKey} — ${입력.title.replace(/\s+/g, ' ')}`,
      `Issue Bunker 이슈 ${입력.issueKey} 를 Test Commander 가 맡아 고쳤어요.`,
      '',
      '## 고친 내용',
      요약.trim() === '' ? '고친 내용 설명이 비어 있어요. 바뀐 파일을 직접 봐 주세요.' : 요약.trim(),
      '',
      '## 바뀐 파일',
      ...보일,
      '',
      'Test Commander 수정 AI 가 만든 초안 PR 이에요. 병합은 사람이 해요.',
    ].join('\n');
  const 틀 = 만들기('').length;
  return 만들기(글자자르기(입력.summary, Math.max(0, PR본문상한 - 틀)));
}

/** 이 스크립트가 올린 커밋 제목인가 — 다시 실행해 같은 브랜치를 덮어써도 되는 머리는 이것뿐이다(사람 커밋은 덮어쓰지 않는다) */
export function 수정커밋제목인가(제목: string, issueKey: string): boolean {
  // 2026-11-02 머리를 [Test Commander] 로 바꿨다 — 그 전에 만든 수정 커밋도 알아본다
  const t = 제목.trim();
  return t.startsWith(`[Test Commander] ${issueKey} 수정 — `) || t.startsWith(`[QA Hub] ${issueKey} 수정 — `);
}

/** `ls-remote` 글에서 원격 머리. 없으면 null, 커밋 번호 꼴이 아니면 까닭 — 인자로 넘기기 전에 모양을 본다 */
export function 원격머리풀기(글: string): { 머리: string | null } | { 까닭: string } {
  const 머리 = 글.split('\t')[0]?.trim() ?? '';
  if (머리 === '') return { 머리: null };
  return /^[0-9a-f]{40}$/.test(머리) ? { 머리 } : { 까닭: '원격 머리가 커밋 번호 모양이 아니다' };
}

/** 푸시 인자 — 원격에 브랜치가 없으면 그냥, 있으면 본 머리가 그대로일 때만 덮어쓴다(`--force` 는 쓰지 않는다) */
export function 푸시인자(브랜치: string, 원격머리: string | null): string[] {
  return ['push', ...(원격머리 === null ? [] : [`--force-with-lease=${브랜치}:${원격머리}`]), 'origin', `HEAD:refs/heads/${브랜치}`];
}

/** 상태 글(`status --porcelain -z`)에서 바뀐 파일. 이름 바꾸기(R)·복사(C)는 새 이름 뒤에 옛 이름이 따로 오고, 둘 다 낸다 */
export function 상태파일들(z글: string): string[] {
  const 항목들 = z글.split('\0');
  const 파일들: string[] = [];
  for (let k = 0; k < 항목들.length; k += 1) {
    const 항목 = 항목들[k]!;
    if (항목.length <= 3) continue;
    파일들.push(항목.slice(3));
    const 옛이름 = 항목들[k + 1];
    if (/[RC]/.test(항목.slice(0, 2)) && 옛이름 !== undefined && 옛이름 !== '') {
      파일들.push(옛이름);
      k += 1;
    }
  }
  return 파일들;
}
