// 작성 에이전트. **화면이 세운 대기줄을 집어** `claude -p` 로 tpx-cases 스킬을 돌리고 초안 PR 까지 낸다.
// **서버가 아니라 맥에서 도는 이유** — `claude` 가 사용자의 구독 로그인을 그대로 쓰기 위해서다.
// 서버에 Claude 토큰도 GitHub 토큰도 심을 필요가 없어진다.
//
// **스스로 병합을 판단하지 않는다.** 사람이 화면에서 머지를 누르면 그것이 줄에 서고,
// 맥은 그 요청을 집어 `gh pr merge` 를 칠 뿐이다 (docs/spec/도메인/작성.md §3.6).
// 사람 게이트는 사라진 것이 아니라 **자리를 옮겼다.**
//
// ★ 2026-09-22 — **기획서 경로를 인자로 받던 진입 방식을 없앴다** (docs/SETUP.md §8).
// 그 길은 admin 을 아예 안 불러 **로그인을 지나지 않았다** — §3.5 가 러너 포트를 닫으며
// 막은 뒷길과 같은 성질이다. 이제 들어오는 길은 화면뿐이고, 맥은 계정으로 로그인해 집어 간다.
//
// **비밀번호는 어디에도 안 적는다.** 켤 때 한 번 묻고 메모리에만 든다 — 이 프로그램은
// 설계상 사람이 켜서 터미널에 띄워 두는 것이라(숨은 데몬이 아니다) 그 한 번이 공짜다.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
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
  오늘: string;
  기록: string[];
}): string | null {
  const 위험 = 과금위험(입력.env, 입력.설정들);
  if (위험.length > 0) {
    return [
      '실비 청구로 도는 설정이 있다. 구독 한도로만 돈다는 전제가 깨진다.',
      `걸린 것: ${위험.join(' · ')}`,
      '그 값을 지우고 다시 실행해라.',
    ].join('\n');
  }

  // 비밀번호를 묻기 **전에** 본다. 물어 놓고 「사실 못 돈다」고 하면 그 입력이 헛것이 된다
  const 전제 = 대기줄전제(입력.env);
  if (전제 !== null) return 전제;

  return 푸시막힘(입력.오늘, 입력.기록, 입력.env);
}

/**
 * 대기줄을 돌기 전에 봐야 할 것. 막히면 사유를, 아니면 `null`.
 *
 * **`AUTHORING_AGENT_USER` 가 비면 아무도 못 집는다** — 서버가 집기·단계·사진·끝내기 넷을
 * **정해진 계정 이름에만** 연다 (도메인/작성 §3.6). 이름이 없으면 줄이 영원히 쌓이기만 한다.
 * 비어 있는 것이 안전한 기본값이라 **고장이 아니라 설정 미완**이고, 그 사실을 여기서 말한다.
 */
export function 대기줄전제(env: Record<string, string | undefined>): string | null {
  if (env.AUTHORING_AGENT_USER) return null;
  return [
    'AUTHORING_AGENT_USER 가 비어 있다. 맥 계정 아이디를 적어야 줄을 집을 수 있다.',
    '서버는 그 이름에만 집기를 열어 둔다 — 비어 있으면 아무도 못 집는다.',
    '그 계정은 operator 여야 한다. admin 을 주면 맥에 든 열쇠 하나가 설정 전부를 연다.',
  ].join('\n');
}

/** 줄에서 집어 온 한 건. 화면이 넣고 서버가 돌려주는 것 중 맥이 쓰는 칸만 */
export interface 집은것 {
  id: number;
  kind: 'AUTHOR' | 'RERUN' | 'MERGE';
  specText?: string;
  prUrl?: string | null;
}

/**
 * 줄에서 집은 작성 요청으로 자식 세션에게 시킬 일.
 *
 * **기획서를 본문으로 넘긴다.** 셸 진입점은 경로를 받았지만 대기줄은 본문을 싣는다 —
 * 맥은 다른 기계라 서버의 경로를 못 읽고, 그 파일이 나중에 고쳐지면
 * 무엇을 시킨 요청이었는지도 같이 바뀐다 (공통/4-데이터모델 §6).
 */
export function 줄프롬프트(것: 집은것, 서비스: string): string {
  return [
    `/tpx 아래 기획서로 테스트케이스를 만들어줘. tcId 접두사는 ${서비스} 다.`,
    '- [5] 자리에서 tpx-cases 스킬을 써라.',
    '',
    '이 실행에는 답할 사람이 없다. 그래서 셋을 지켜라.',
    '',
    '1. **AskUserQuestion 을 부르지 마라.** tpx-cases §3 의 내부 게이트 대신',
    '   요구사항 표를 완성해 PR 본문에 싣고 그대로 진행해라.',
    '2. **초안 PR 까지만 한다.** gh pr ready 와 병합은 절대 하지 마라 —',
    '   사람이 화면에서 머지를 누른다.',
    '3. **git push --no-verify 를 쓰지 마라.** pre-push 검사가 막으면 그 자리에서 멈추고',
    '   무엇이 막았는지 보고해라. 건너뛰지 마라.',
    '4. **A-0 에서 다른 작업방이나 초안 PR 을 보면 「새 작업 추가」로 보고 진행해라.**',
    '   남의 작업방과 브랜치는 절대 건드리지 마라. 네 것을 새로 만들어라.',
    '5. **미커밋 변경이 있어도 버리지 마라.** 다른 사람이 작업 중일 수 있다.',
    '   임시 커밋을 쓰거나 별도 작업방으로 가라. 지우는 쪽은 고르지 마라.',
    '',
    '관문 넷(형식·표 대조·3회 연속·일부러 부수기)은 전부 돌려라.',
    '',
    '--- 기획서 ---',
    것.specText ?? '',
  ].join('\n');
}

/** 머지 요청을 실제로 칠 수 있나. 올릴 PR 주소가 없으면 할 일이 없다 */
export function 머지할수있나(것: { kind: 집은것['kind']; prUrl?: string | null }): boolean {
  return 것.kind === 'MERGE' && typeof 것.prUrl === 'string' && 것.prUrl !== '';
}

/**
 * `gh pr merge` 에 거는 인자.
 *
 * **강제 깃발을 절대 안 붙인다** (CLAUDE.md §5 · `guard.mjs` 의 `isBanned()`).
 * 관리자 우회(`--admin`)도 안 쓴다 — 검사가 빨간 PR 을 사람 없이 병합하는 일이
 * 이 제품에서 가장 하면 안 되는 일이다. **맥은 판단하지 않는다.**
 */
export function 머지인자(prUrl: string): string[] {
  return ['pr', 'merge', prUrl, '--merge', '--delete-branch'];
}

/** 맥은 컨테이너 밖이라 admin 을 주소로 부른다. 안 주면 compose 의 기본 포트를 본다 */
export function admin주소(env: Record<string, string | undefined>): string {
  return env.PLATFORM_ADMIN_URL ?? 'http://localhost:3000';
}

/**
 * 다시 물어도 소용없는 답인가.
 *
 * **거절은 기다린다고 안 풀린다.** 세션이 끊겼거나 등급이 모자란 것이고, 둘 다 사람이 손대야 한다.
 * 그런데 이 프로그램은 **사람이 없을 때 돈다** — 조용히 루프를 계속 돌면 요청마다 실패가 쌓이고
 * 아침에 와서 보면 줄 전체가 빨갛다. 그래서 그 자리에서 멈추고 왜인지 찍는다.
 * 서버가 잠깐 흔들린 것(5xx)은 다시 물어볼 만하므로 여기 안 넣는다.
 */
export function 거절인가(status: number): boolean {
  return status === 401 || status === 403;
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

/**
 * 켤 때 비밀번호를 한 번 묻는다. **어디에도 안 적는다.**
 *
 * 파일에 두면 그 파일이 열쇠가 되고, 환경변수에 두면 셸 기록과 프로세스 목록에 샌다.
 * 이 프로그램은 설계상 **사람이 켜서 터미널에 띄워 두는 것**이라(숨은 데몬이 아니다)
 * 켤 때 한 번 치는 값이 공짜다 — 그 대가로 **맥에 남는 비밀값이 0** 이 된다.
 *
 * 글자가 화면에 안 찍히게 출력을 가로챈다. 안 가리면 어깨너머로 보이고 터미널 기록에 남는다.
 */
async function 비밀번호묻기(아이디: string): Promise<string> {
  const 물음 = `${아이디} 의 비밀번호: `;
  process.stdout.write(물음);

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const 원래 = (rl as unknown as { _writeToOutput?: (글: string) => void })._writeToOutput;
  (rl as unknown as { _writeToOutput: (글: string) => void })._writeToOutput = (글: string) => {
    // 물음 자체는 그대로 두고 입력 글자만 지운다
    if (글.includes(물음)) 원래?.call(rl, 물음);
  };

  try {
    return await new Promise<string>((resolve) => rl.question('', resolve));
  } finally {
    rl.close();
    process.stdout.write('\n');
  }
}

/** 로그인해서 세션 쿠키와 배정 서비스를 받는다 */
async function 로그인(주소: string, 아이디: string, 비번: string): Promise<{ 쿠키: string; 서비스들: string[] }> {
  const 답 = await fetch(`${주소}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 아이디, password: 비번 }),
  });
  if (!답.ok) throw new Error(`로그인이 거절됐다 (${답.status}). 아이디와 비밀번호를 확인해라.`);

  const 쿠키 = 답.headers.get('set-cookie') ?? '';
  const 몸 = (await 답.json()) as { user: { role: string; services: { prefix: string }[] } };
  if (몸.user.role === 'viewer') {
    throw new Error('이 계정은 보기만 등급이라 줄을 집을 수 없다. operator 로 바꿔라.');
  }
  return { 쿠키, 서비스들: 몸.user.services.map((s) => s.prefix) };
}

/** 서버에 거는 한 번. 거절이면 그 자리에서 던져 루프를 끊는다 */
async function 부른다(
  주소: string,
  쿠키: string,
  길: string,
  옵션: { method?: string; body?: unknown } = {},
): Promise<{ status: number; 몸: unknown }> {
  const 답 = await fetch(`${주소}/api${길}`, {
    method: 옵션.method ?? 'GET',
    headers: {
      cookie: 쿠키,
      ...(옵션.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(옵션.body === undefined ? {} : { body: JSON.stringify(옵션.body) }),
  });

  if (거절인가(답.status)) {
    throw new Error(
      `서버가 거절했다 (${답.status}). 세션이 끊겼거나 등급이 모자란다 — 다시 물어도 같다.\n` +
        '켤 때 쓴 계정이 operator 이고 그 서비스에 배정돼 있는지 확인하고 다시 켜라.',
    );
  }
  const 몸 = 답.status === 204 ? null : await 답.json().catch(() => null);
  return { status: 답.status, 몸 };
}

/** 한 건을 끝까지 처리한다. 단계는 사람이 화면에서 보는 그 줄이다 */
async function 한건처리(주소: string, 쿠키: string, 서비스: string, 것: 집은것): Promise<void> {
  const 단계 = (글: string) =>
    부른다(주소, 쿠키, `/authoring/requests/${것.id}/stage?service=${encodeURIComponent(서비스)}`, {
      method: 'PATCH',
      body: { stage: 글 },
    });
  const 끝내기 = (몸: Record<string, unknown>) =>
    부른다(주소, 쿠키, `/authoring/requests/${것.id}/finish?service=${encodeURIComponent(서비스)}`, {
      method: 'POST',
      body: 몸,
    });

  if (것.kind === 'MERGE') {
    // **맥은 판단하지 않는다.** 사람이 화면에서 이미 정했고 여기는 손일 뿐이다
    if (!머지할수있나(것)) {
      await 끝내기({ status: 'FAILED', error: '머지할 초안 PR 주소가 없다' });
      return;
    }
    await 단계('머지하는 중');
    const 친것 = spawnSync('gh', 머지인자(것.prUrl!), { stdio: ['ignore', 'inherit', 'inherit'] });
    await 끝내기(
      친것.status === 0
        ? { status: 'DONE', prUrl: 것.prUrl }
        : { status: 'FAILED', error: '병합이 실패했다. 검사가 빨갛거나 충돌이 있다.' },
    );
    return;
  }

  await 단계('케이스를 만드는 중');
  const 돌린것 = spawnSync('claude', 클로드인자(), {
    input: 줄프롬프트(것, 서비스),
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  if (돌린것.error) {
    await 끝내기({ status: 'FAILED', error: `claude 를 못 띄웠다: ${돌린것.error.message}` });
    return;
  }
  await 끝내기(
    돌린것.status === 0
      ? { status: 'DONE' }
      : { status: 'FAILED', error: '케이스를 만들다 멈췄다. 터미널 기록을 봐라.' },
  );
}

const 쉬는시간 = 5000;

/**
 * 대기줄을 돌린다. **사람이 켜서 터미널에 띄워 두는 프로그램**이다 (숨은 데몬이 아니다) —
 * 한도를 얼마나 쓰는지와 지금 무엇을 하는지가 눈에 보여야 한다.
 */
async function 돈다(): Promise<number> {
  const 지금 = new Date();
  const 막힘 = 선행검사({
    env: process.env,
    설정들: 설정들읽기(),
    오늘: 오늘날짜(지금, -지금.getTimezoneOffset()),
    기록: existsSync('docs/reviews') ? readdirSync('docs/reviews') : [],
  });
  if (막힘 !== null) {
    console.error(`[거부] ${막힘}`);
    return 1;
  }

  const 주소 = admin주소(process.env);
  const 아이디 = process.env.AUTHORING_AGENT_USER!;
  console.log(`[작성] ${주소} 에 ${아이디} 로 로그인한다. 비밀번호는 어디에도 안 적는다.`);

  let 쿠키: string;
  let 서비스들: string[];
  try {
    const 비번 = await 비밀번호묻기(아이디);
    ({ 쿠키, 서비스들 } = await 로그인(주소, 아이디, 비번));
  } catch (err) {
    console.error(`[거부] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (서비스들.length === 0) {
    console.error('[거부] 이 계정에 배정된 서비스가 없다. 설정 화면에서 배정해라.');
    return 1;
  }

  console.log(`[작성] 줄을 본다: ${서비스들.join(' · ')} — 멈추려면 Ctrl+C.`);
  for (;;) {
    let 집었나 = false;
    try {
      for (const 서비스 of 서비스들) {
        const 답 = await 부른다(주소, 쿠키, `/authoring/requests/claim?service=${encodeURIComponent(서비스)}`, {
          method: 'POST',
        });
        if (답.status === 204 || 답.몸 === null) continue;

        const 것 = 답.몸 as 집은것;
        console.log(`[작성] ${서비스} 의 ${것.id}번을 집었다 (${것.kind}).`);
        집었나 = true;
        await 한건처리(주소, 쿠키, 서비스, 것);
        console.log(`[작성] ${것.id}번을 끝냈다.`);
      }
    } catch (err) {
      // 거절은 기다린다고 안 풀린다. 조용히 계속 돌면 요청마다 실패가 쌓인다
      console.error(`[멈춤] ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }

    if (!집었나) await new Promise((resolve) => setTimeout(resolve, 쉬는시간));
  }
}

// 검사가 이 파일을 import 할 때는 껍데기가 돌면 안 된다.
// 파일 이름으로 가르지 않는다 — 작업방 이름이 `authoring-agent` 라 그 방식은 조용히 틀린다
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void 돈다().then((코드) => process.exit(코드));
}
