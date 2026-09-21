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

/** 설정 하나와 그것이 어디서 왔는지. 어디서 걸렸는지를 사람에게 알려야 고칠 수 있다 */
export interface 설정자리 {
  어디: string;
  값: 설정;
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
 * `process.env` 에 안 보이는데 CLI 는 읽는다.
 *
 * **설정 파일도 한 곳이 아니다.** CLI 는 user·project·local 을 다 읽고,
 * 이 저장소 문서(`docs/SETUP.md`)가 직접 `.claude/settings.local.json` 의 `env` 를 쓰라고 가르친다.
 * 한 곳만 보면 **막힌 줄 알고 열려 있다** (2026-09-21 검토 지적).
 */
export function 과금위험(env: Record<string, string | undefined>, 설정들: 설정자리[]): string[] {
  const 걸린것: string[] = [];

  for (const 이름 of 실비청구_환경변수) {
    // 빈 문자열은 위험이 아니다 — `ANTHROPIC_API_KEY=` 로 지운 환경을 막으면 쓸 수가 없다
    if (env[이름]) 걸린것.push(이름);
  }

  for (const { 어디, 값 } of 설정들) {
    if (값.apiKeyHelper) 걸린것.push(`${어디} 설정의 apiKeyHelper`);

    for (const [이름, 값2] of Object.entries(값.env ?? {})) {
      // 환경변수 경로와 **같은 목록**을 본다. 접두사로만 거르면 3P 제공자 셋이 그대로 샌다
      if (값2 && (실비청구_환경변수 as readonly string[]).includes(이름)) {
        걸린것.push(`${어디} 설정의 env.${이름}`);
      }
    }
  }

  return 걸린것;
}

/**
 * `pre-push` 훅이 쓰는 것과 **같은 날짜**를 만든다.
 *
 * 훅은 `date +%F` 로 **로컬** 날짜를 쓰는데 `toISOString()` 은 **UTC** 다.
 * 한국(+9시간)에서는 **새벽 00:00~09:00 동안 둘이 하루 갈린다** — 그리고 그 구간이
 * 바로 이 안전핀이 지키려던 「아침 무인 실행」이다 (2026-09-21 검토 지적).
 */
export function 오늘날짜(지금: Date, 시차분: number): string {
  return new Date(지금.getTime() + 시차분 * 60000).toISOString().slice(0, 10);
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
export function 푸시막힘(
  오늘: string,
  검사기록: string[],
  env: Record<string, string | undefined>,
): string | null {
  // 훅이 ALLOW_PROTECTED=1 이면 검사 기록 확인을 통째로 건너뛴다.
  // 그걸 안 보면 **막히지 않을 push 를 막았다고 거부**한다 (2026-09-21 검토 지적)
  if (env.ALLOW_PROTECTED === '1') return null;

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
    '4. **A-0 에서 다른 작업방이나 초안 PR 을 보면 「새 작업 추가」로 보고 진행해라.**',
    '   남의 작업방과 브랜치는 절대 건드리지 마라. 네 것을 새로 만들어라.',
    '5. **미커밋 변경이 있어도 버리지 마라.** 그 안에 방금 받은 기획서가 들어 있을 수 있다.',
    '   임시 커밋을 쓰거나 별도 작업방으로 가라. 지우는 쪽은 고르지 마라.',
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
 *
 * **프롬프트는 여기 안 싣는다.** `--disallowedTools` 가 가변 인자라 **뒤따르는 것을 전부 삼킨다** —
 * 프롬프트가 도구 이름 목록으로 먹혀 `Input must be provided...` 로 죽었다 (2026-09-21 실측).
 * 프롬프트는 stdin 으로 넘긴다. 셸 따옴표 문제도 같이 사라진다.
 */
export function 클로드인자(): string[] {
  return ['-p', '--permission-mode', 'acceptEdits', '--disallowedTools', 'AskUserQuestion'];
}

/**
 * `claude` 를 부르기 전에 봐야 할 것 전부. **순서가 계약이다** — 돈이 가장 앞이다.
 *
 * 순수 함수로 뽑아 둔 이유는 **순서를 검사가 붙잡게** 하기 위해서다.
 * 껍데기 안에 있으면 누가 `spawnSync` 를 과금 검사 위로 올려도 검사가 전부 초록이고,
 * **진짜 키가 있는 환경에서 그 요청이 실제로 나간다** (2026-09-21 검토 지적).
 */
export function 선행검사(입력: {
  env: Record<string, string | undefined>;
  설정들: 설정자리[];
  argv: string[];
  오늘: string;
  기록: string[];
}): { 막힘: string | null; 입력: { 기획서: string; 서비스: string | undefined } | null } {
  const 위험 = 과금위험(입력.env, 입력.설정들);
  if (위험.length > 0) {
    return {
      막힘: [
        '실비 청구로 도는 설정이 있다. 구독 한도로만 돈다는 전제가 깨진다.',
        `걸린 것: ${위험.join(' · ')}`,
        '그 값을 지우고 다시 실행해라.',
      ].join('\n'),
      입력: null,
    };
  }

  let 읽은것: { 기획서: string; 서비스: string | undefined };
  try {
    읽은것 = 인자읽기(입력.argv);
  } catch (err) {
    return { 막힘: err instanceof Error ? err.message : String(err), 입력: null };
  }

  const 막힘 = 푸시막힘(입력.오늘, 입력.기록, 입력.env);
  if (막힘 !== null) return { 막힘, 입력: null };

  return { 막힘: null, 입력: 읽은것 };
}

// ── 껍데기 ────────────────────────────────────────────────────────────
// 여기부터는 I/O 다. 판단은 전부 위의 순수 함수에 있고 검사도 거기 붙어 있다.
// `scripts/run-scheduled.ts` 와 같은 모양이다.

/**
 * CLI 가 읽는 설정 파일을 **전부** 읽는다. 없거나 깨졌으면 건너뛴다 —
 * 못 읽는 파일 때문에 멈추면 쓸 수가 없고, 환경변수 쪽이 따로 막는다.
 */
function 설정들읽기(): 설정자리[] {
  const 자리들: [string, string][] = [
    ['사용자', join(homedir(), '.claude', 'settings.json')],
    ['사용자 local', join(homedir(), '.claude', 'settings.local.json')],
    ['프로젝트', join('.claude', 'settings.json')],
    ['프로젝트 local', join('.claude', 'settings.local.json')],
  ];

  const 모은것: 설정자리[] = [];
  for (const [어디, 경로] of 자리들) {
    if (!existsSync(경로)) continue;
    try {
      모은것.push({ 어디, 값: JSON.parse(readFileSync(경로, 'utf8')) as 설정 });
    } catch {
      // 깨진 설정은 건너뛴다
    }
  }
  return 모은것;
}

function 실행(): number {
  const 지금 = new Date();
  const 결과 = 선행검사({
    env: process.env,
    설정들: 설정들읽기(),
    argv: process.argv.slice(2),
    오늘: 오늘날짜(지금, -지금.getTimezoneOffset()),
    기록: existsSync('docs/reviews') ? readdirSync('docs/reviews') : [],
  });

  if (결과.입력 === null) {
    console.error(`[거부] ${결과.막힘 ?? '알 수 없는 이유'}`);
    return 1;
  }

  console.log(`[작성] ${결과.입력.기획서} 로 케이스를 만든다. 초안 PR 까지 간다 — 병합은 사람이 한다.`);
  const 돌린것 = spawnSync('claude', 클로드인자(), {
    // 프롬프트는 stdin 으로 넘긴다 (클로드인자 주석 참고). 나머지는 그대로 흘려보낸다
    input: 프롬프트(결과.입력.기획서, 결과.입력.서비스),
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  // spawn 자체가 실패하면 status 가 null 이라 그냥 1 이 된다 — 왜인지를 남긴다
  if (돌린것.error) {
    console.error(`[실패] claude 를 못 띄웠다: ${돌린것.error.message}`);
    console.error('[실패] claude 가 설치돼 있고 PATH 에 있는지 봐라.');
    return 1;
  }

  return 돌린것.status ?? 1;
}

// 검사가 이 파일을 import 할 때는 껍데기가 돌면 안 된다.
// 파일 이름으로 가르지 않는다 — 작업방 이름이 `authoring-agent` 라 그 방식은 조용히 틀린다
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(실행());
}
