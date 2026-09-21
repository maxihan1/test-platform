// 작성 에이전트. 기획서 한 장을 받아 `claude -p` 로 tpx-cases 스킬을 돌리고 초안 PR 까지 낸다.
// **서버가 아니라 맥에서 도는 이유** — `claude` 가 사용자의 구독 로그인을 그대로 쓰기 위해서다.
// 서버에 Claude 토큰도 GitHub 토큰도 심을 필요가 없어진다.
// **병합은 하지 않는다** — 체인의 사람 게이트 셋은 2026-09-17 사고 뒤에 세운 장치라 비대화형으로 통과시키지 않는다.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 설정 파일에서 우리가 보는 부분만. 나머지 키는 이 스크립트가 알 바가 아니다 */
export interface 설정 {
  apiKeyHelper?: string;
  env?: Record<string, string>;
}

/** 환경에 있으면 구독이 아니라 실비로 청구되는 것들 */
const 실비청구_환경변수 = [
  // OAuth 를 건너뛴다. 이틀에 $1,800 청구 사례가 있다 (anthropics/claude-code#37686)
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  // 구독이 아니라 AWS·GCP·Azure 계정에 청구된다
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
] as const;

/**
 * 돈이 새는 경로를 전부 모아 돌려준다. 빈 배열이면 구독 한도로 돈다.
 *
 * **환경변수만 보면 부족하다** — 설정 파일의 `apiKeyHelper` 와 `env` 블록은
 * `process.env` 에 안 보이는데 CLI 는 읽는다. 그 둘이 이 안전핀의 사각지대였다.
 */
export function 과금위험(env: Record<string, string | undefined>, 설정값: 설정): string[] {
  const 걸린것: string[] = [];

  for (const 이름 of 실비청구_환경변수) {
    // 빈 문자열은 위험이 아니다 — `ANTHROPIC_API_KEY=` 로 지운 환경을 막으면 쓸 수가 없다
    if (env[이름]) 걸린것.push(이름);
  }

  if (설정값.apiKeyHelper) 걸린것.push('설정의 apiKeyHelper');

  for (const [이름, 값] of Object.entries(설정값.env ?? {})) {
    if (값 && 이름.startsWith('ANTHROPIC_')) 걸린것.push(`설정의 env.${이름}`);
  }

  return 걸린것;
}

const 쓰는법 = '쓰는 법: npm run authoring-agent -- <기획서 경로> [--service <접두사>]';

/** argv 를 읽고 기획서가 실제로 있는지까지 본다. 없는 파일로 한도를 태우지 않는다 */
export function 인자읽기(argv: string[]): { 기획서: string; 서비스: string | undefined } {
  let 기획서: string | undefined;
  let 서비스: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--service') {
      서비스 = argv[++i];
    } else if (기획서 === undefined) {
      기획서 = argv[i];
    }
  }

  if (기획서 === undefined) throw new Error(쓰는법);
  if (!existsSync(기획서)) throw new Error(`기획서가 없다: ${기획서}\n${쓰는법}`);

  return { 기획서, 서비스 };
}

/**
 * push 가 막힐 조건을 **시작 전에** 본다. 막히면 사유를, 아니면 `null`.
 *
 * `.claude/hooks/pre-push` 가 오늘 날짜의 `docs/reviews/<오늘>-*.md` 를 요구한다.
 * 없으면 관문 넷까지 초록을 내고 **push 에서 죽어** 결과가 작업방에 갇히고 PR 이 안 열린다.
 * **늦은 실패를 이른 실패로 바꾼다.**
 *
 * 훅이 에러 문구에 적어 둔 `--no-verify` 는 **권하지 않는다** —
 * 그건 저장소가 사고 뒤에 세운 검사를 무인으로 건너뛰는 일이다.
 */
export function 푸시막힘(오늘: string, 검사기록: string[]): string | null {
  if (검사기록.some((이름) => 이름.startsWith(`${오늘}-`))) return null;

  return [
    `오늘(${오늘}) 날짜의 검사 기록이 없어 push 가 막힌다: docs/reviews/${오늘}-*.md`,
    '초안 PR 을 못 여니 결과가 작업방에 갇힌다. 지금 멈추는 편이 한도를 아낀다.',
    'Claude Code 에서 spec-review 를 돌려 기록을 남긴 뒤 다시 실행해라.',
  ].join('\n');
}

/** 자식 세션에게 시킬 일. 경계(어디까지 자동인가)가 여기 글자로 박혀 있다 */
export function 프롬프트(기획서: string, 서비스: string | undefined): string {
  return [
    `/tpx ${기획서} 의 기획서로 테스트케이스를 만들어줘.`,
    '',
    서비스 === undefined
      ? '- tcId 접두사는 기획서에서 판단해라.'
      : `- tcId 접두사는 ${서비스} 다.`,
    '- [5] 자리에서 tpx-cases 스킬을 써라.',
    '',
    '이 실행에는 답할 사람이 없다. 그래서 셋을 지켜라.',
    '',
    '1. **AskUserQuestion 을 부르지 마라.** tpx-cases §3 의 내부 게이트 대신',
    '   요구사항 표를 완성해 PR 본문에 싣고 그대로 진행해라.',
    '2. **초안 PR 까지만 한다.** gh pr ready 와 병합은 절대 하지 마라 —',
    '   사람이 게이트 2 에서 판단한다.',
    '3. **git push --no-verify 를 쓰지 마라.** pre-push 검사가 막으면 그 자리에서 멈추고',
    '   무엇이 막았는지 보고해라. 건너뛰지 마라.',
    '',
    '관문 넷(형식·표 대조·3회 연속·일부러 부수기)은 전부 돌려라.',
  ].join('\n');
}

/**
 * `claude` 에 거는 인자. **과금 안전핀의 둘째 문이다.**
 *
 * `--bare` 를 절대 넣지 않는다 — 그 깃발은 OAuth 와 keychain 을 아예 안 읽고
 * `ANTHROPIC_API_KEY` 만 쓴다. 구독이 실비로 바뀐다.
 *
 * `--permission-mode acceptEdits` 가 없으면 **쓰기가 자동 거부되는데 종료 코드는 0** 이다
 * (2026-09-21 실측). 산출물 0 인데 성공으로 보고된다.
 */
export function 클로드인자(입력: { 기획서: string; 서비스: string | undefined }): string[] {
  return [
    '-p',
    '--permission-mode',
    'acceptEdits',
    '--disallowedTools',
    'AskUserQuestion',
    프롬프트(입력.기획서, 입력.서비스),
  ];
}

// ── 껍데기 ────────────────────────────────────────────────────────────
// 여기부터는 I/O 다. 판단은 전부 위의 순수 함수에 있고 검사도 거기 붙어 있다.
// `scripts/run-scheduled.ts` 와 같은 모양이다.

/** 사용자 설정을 읽는다. 없거나 깨졌으면 빈 것으로 본다 — 안전핀은 여기서 관대해도 된다(환경변수가 따로 막는다) */
function 설정읽기(): 설정 {
  const 자리 = join(homedir(), '.claude', 'settings.json');
  if (!existsSync(자리)) return {};
  try {
    return JSON.parse(readFileSync(자리, 'utf8')) as 설정;
  } catch {
    return {};
  }
}

function 실행(): number {
  const 위험 = 과금위험(process.env, 설정읽기());
  if (위험.length > 0) {
    console.error('[거부] 실비 청구로 도는 설정이 있다. 구독 한도로만 돈다는 전제가 깨진다.');
    console.error(`[거부] 걸린 것: ${위험.join(' · ')}`);
    console.error('[거부] 그 값을 지우고 다시 실행해라.');
    return 1;
  }

  let 입력: { 기획서: string; 서비스: string | undefined };
  try {
    입력 = 인자읽기(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }

  const 오늘 = new Date().toISOString().slice(0, 10);
  const 기록 = existsSync('docs/reviews') ? readdirSync('docs/reviews') : [];
  const 막힘 = 푸시막힘(오늘, 기록);
  if (막힘 !== null) {
    console.error(`[거부] ${막힘}`);
    return 1;
  }

  console.log(`[작성] ${입력.기획서} 로 케이스를 만든다. 초안 PR 까지 간다 — 병합은 사람이 한다.`);
  const 결과 = spawnSync('claude', 클로드인자(입력), { stdio: 'inherit' });
  return 결과.status ?? 1;
}

// 검사가 이 파일을 import 할 때는 껍데기가 돌면 안 된다.
// 파일 이름으로 가르지 않는다 — 작업방 이름이 `authoring-agent` 라 그 방식은 조용히 틀린다
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(실행());
}
