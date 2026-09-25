// 맥이 들고 다니는 에이전트 토큰 — 파일 자리 · 모양 · 읽기 · 한 번 묻고 저장 · /api/auth/me 풀기 (SPEC 도메인/인증 §7)
// 비밀번호를 켤 때마다 치던 것을 대신한다 (2026-09-23). 운영체제 키체인을 안 쓴다 — 윈도우에서도 같은 방식이어야 한다

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

/** 홈 아래 한 곳. 저장소 밖이라 커밋에 섞일 일이 없다 */
export function 토큰자리(집: string): string {
  return join(집, '.test-platform', 'agent-token');
}

/** 서버가 주는 모양만 받는다 — 엉뚱한 값(비밀번호 등)을 서버에 들고 가지 않게 */
export function 토큰모양인가(값: string): boolean {
  return /^tpa_[A-Za-z0-9_-]{43}$/.test(값);
}

/** 파일이 없으면 `null`. 있는데 모양이 아니면 그 자리를 알려 주며 던진다 */
export function 토큰읽기(자리: string): string | null {
  if (!existsSync(자리)) return null;
  const 값 = readFileSync(자리, 'utf8').trim();
  if (!토큰모양인가(값)) {
    throw new Error(`${자리} 의 값이 에이전트 토큰 모양이 아니다. 그 파일을 지우고 다시 켜면 새로 묻는다.`);
  }
  return 값;
}

/**
 * 어느 토큰을 쓸까. **서버 컨테이너는 `.env` 의 `AUTHORING_AGENT_TOKEN`**, 맥은 홈 폴더 파일이다 (SPEC 도메인/인증 §7).
 * 둘 다 없으면 `null` — 맥이면 그때 한 번 묻는다. 환경값은 파일에 옮겨 적지 않는다 — 열쇠가 두 곳이 된다
 */
export function 토큰고르기(
  env: Record<string, string | undefined>,
  파일값: string | null,
): { 토큰: string; 어디: '환경' | '파일' } | null {
  const 환경값 = env.AUTHORING_AGENT_TOKEN ?? '';
  if (환경값 !== '') {
    if (!토큰모양인가(환경값)) {
      throw new Error('AUTHORING_AGENT_TOKEN 이 에이전트 토큰 모양이 아니다 (tpa_ 로 시작한다). 설정 화면에서 발급한 값을 넣어라.');
    }
    return { 토큰: 환경값, 어디: '환경' };
  }
  return 파일값 === null ? null : { 토큰: 파일값, 어디: '파일' };
}

/**
 * 본인만 읽게 저장한다. `mode` 는 **새로 만들 때만** 걸리므로 이미 있던 파일은 따로 좁힌다.
 * 윈도우는 이 권한 비트를 무시한다 — 사용자 프로필 폴더의 기본 접근 권한에 기댄다 (docs/SETUP.md §8)
 */
export function 토큰저장(자리: string, 토큰: string): void {
  mkdirSync(dirname(자리), { recursive: true, mode: 0o700 });
  writeFileSync(자리, `${토큰}\n`, { mode: 0o600 });
  chmodSync(자리, 0o600);
}

/**
 * 터미널에서 한 번 묻는다. 글자가 화면에 안 찍히게 출력을 가로챈다 — 어깨너머로 보이고 터미널 기록에 남는다.
 * **파이프로 먹이는 것은 막는다** — 토큰을 다른 파일에 두고 흘려 넣는 길이 생기면 열쇠가 두 곳이 된다
 */
export async function 토큰묻기(): Promise<string> {
  if (process.stdin.isTTY !== true) {
    throw new Error('에이전트 토큰은 처음 한 번 터미널에서 붙여넣는다. 파일이나 파이프로 먹이지 마라.');
  }
  const 물음 = '에이전트 토큰 (설정 > 계정 > 에이전트 토큰에서 발급): ';
  process.stdout.write(물음);

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const 원래 = (rl as unknown as { _writeToOutput?: (글: string) => void })._writeToOutput;
  (rl as unknown as { _writeToOutput: (글: string) => void })._writeToOutput = (글: string) => {
    // 물음 자체는 그대로 두고 입력 글자만 지운다
    if (글.includes(물음)) 원래?.call(rl, 물음);
  };

  try {
    return (await new Promise<string>((resolve) => rl.question('', resolve))).trim();
  } finally {
    rl.close();
    process.stdout.write('\n');
  }
}

type 서버 = { env: string; baseUrl: string };

/** 폴더를 받았거나, 못 받은 까닭 */
export type 폴더자리 = { 폴더: string } | { 사유: string };

/**
 * 서비스 설정의 테스트 폴더(`testsDir`). **한 칸 이름만 받는다** — 자식 프롬프트에 `tests/<폴더>` 로 박히므로
 * `..`·`/` 가 섞이면 저장소 밖이나 남의 폴더를 가리킨다. 옛 서버라 칸이 없어도 여기서 사유가 된다
 */
function 폴더고르기(prefix: string, 값: unknown): 폴더자리 {
  if (typeof 값 === 'string' && /^[A-Za-z0-9._-]+$/.test(값) && 값 !== '.' && 값 !== '..') return { 폴더: 값 };
  return { 사유: `${prefix} 의 테스트 폴더 설정이 비었거나 한 칸 이름이 아니다 (설정 화면에서 고친다)` };
}

/**
 * `/api/auth/me` 응답에서 작성 에이전트가 쓸 것. 모양이 틀렸거나 보기만 등급이면 사유 글.
 * 대상 서버와 테스트 폴더는 자식(tpx-author)이 입력으로 기대한다 — 둘 다 이 응답에 실려 온다. 새 통로가 필요 없다
 */
export function 나풀기(
  몸: unknown,
): { username: string; 서비스들: string[]; 서버표: Record<string, 서버[]>; 폴더표: Record<string, 폴더자리> } | string {
  const user = (몸 as { user?: unknown } | null)?.user as
    | { username?: unknown; role?: unknown; services?: { prefix: string; envs?: 서버[]; testsDir?: unknown }[] }
    | undefined;
  if (user === undefined || typeof user.username !== 'string' || !Array.isArray(user.services)) {
    return '/api/auth/me 응답이 예상한 모양이 아니다. 서버 판이 맞는지 봐라.';
  }
  if (user.role === 'viewer') return '이 계정은 보기만 등급이라 줄을 집을 수 없다. operator 로 바꿔라.';
  return {
    username: user.username,
    서비스들: user.services.map((s) => s.prefix),
    서버표: Object.fromEntries(user.services.map((s) => [s.prefix, s.envs ?? []])),
    폴더표: Object.fromEntries(user.services.map((s) => [s.prefix, 폴더고르기(s.prefix, s.testsDir)])),
  };
}
