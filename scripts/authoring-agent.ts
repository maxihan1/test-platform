// 작성 에이전트. 기획서 한 장을 받아 `claude -p` 로 tpx-cases 스킬을 돌리고 초안 PR 까지 낸다.
// **서버가 아니라 맥에서 도는 이유** — `claude` 가 사용자의 구독 로그인을 그대로 쓰기 위해서다.
// 서버에 Claude 토큰도 GitHub 토큰도 심을 필요가 없어진다.
// **병합은 하지 않는다** — 체인의 사람 게이트 셋은 2026-09-17 사고 뒤에 세운 장치라 비대화형으로 통과시키지 않는다.

import { existsSync } from 'node:fs';

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
