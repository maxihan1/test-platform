// 작성 에이전트. **화면이 세운 대기줄을 집어** 작업방에서 `claude -p` 로 tpx-author 를 돌리고, 맥이 직접 초안 PR 을 낸다.
// 껍데기(한 건 처리·머지·공용 손)는 authoring-run.ts · authoring-merge.ts · authoring-io.ts 에 있다. 이 파일은 순수 함수와 켜기·줄 돌기다.
// **서버가 아니라 맥에서 도는 이유** — `claude` 가 사용자의 구독 로그인을 그대로 쓰기 위해서다.
// 서버에 Claude 토큰도 GitHub 토큰도 심을 필요가 없어진다.
//
// **스스로 병합을 판단하지 않는다.** 사람이 화면에서 머지를 누르면 그것이 줄에 서고,
// 맥은 그 요청을 집어 초안을 풀고 CI 가 초록일 때 병합할 뿐이다 (docs/spec/도메인/작성.md §3.6).
// 사람 게이트는 사라진 것이 아니라 **자리를 옮겼다.**
//
// ★ 2026-09-22 — **기획서 경로를 인자로 받던 진입 방식을 없앴다** (docs/SETUP.md §8).
// 그 길은 admin 을 아예 안 불러 **로그인을 지나지 않았다** — §3.5 가 러너 포트를 닫으며
// 막은 뒷길과 같은 성질이다. 이제 들어오는 길은 화면뿐이고, 맥은 계정으로 로그인해 집어 간다.
//
// **비밀번호는 어디에도 안 적는다.** 켤 때 한 번 묻고 메모리에만 든다 — 이 프로그램은
// 설계상 사람이 켜서 터미널에 띄워 두는 것이라(숨은 데몬이 아니다) 그 한 번이 공짜다.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type 설정, type 설정자리, admin주소, 기다렸다다시인가, 선행검사, 주소안전한가, 집은것인가 } from './authoring-rules.js';
import { 부른다, 판정기만들기 } from './authoring-io.js';
import { 멈춘것닫기, 한건처리 } from './authoring-run.js';

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
  // **파일로 먹일 수 없게 막는다** (2026-09-23 검토가 잡았다).
  // 안 막으면 `npm run authoring-agent < 비밀.txt` 가 그대로 통해서,
  // 이 파일 머리가 「파일에 두면 그 파일이 열쇠가 된다」고 못박은 그 길이 열린 채로 남는다
  if (process.stdin.isTTY !== true) {
    throw new Error(
      '비밀번호는 사람이 직접 쳐야 한다. 파일이나 파이프로 먹이지 마라 —\n' +
        '그러면 그 파일이 열쇠가 되고, 이 프로그램이 비밀값을 안 남기려는 이유가 사라진다.',
    );
  }

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
type 서버 = { env: string; baseUrl: string };

async function 로그인(
  주소: string,
  아이디: string,
  비번: string,
): Promise<{ 쿠키: string; 서비스들: string[]; 서버표: Record<string, 서버[]> }> {
  const 답 = await fetch(`${주소}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 아이디, password: 비번 }),
  });
  if (!답.ok) throw new Error(`로그인이 거절됐다 (${답.status}). 아이디와 비밀번호를 확인해라.`);

  // 헤더를 통째로 되돌려 보내지 않는다 — 속성(Path·HttpOnly·SameSite)까지 같이 가면
  // 서버가 쿠키를 하나 더 굽는 날 로그인이 조용히 깨진다. auth/gate.test.ts 가 같은 모양을 쓴다
  const 쿠키 = (답.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  const 몸 = (await 답.json()) as { user: { role: string; services: { prefix: string; envs?: 서버[] }[] } };
  if (몸.user.role === 'viewer') {
    throw new Error('이 계정은 보기만 등급이라 줄을 집을 수 없다. operator 로 바꿔라.');
  }
  // 대상 서버는 자식(tpx-author)이 입력으로 기대한다. 이미 로그인 응답에 실려 온다 — 새 통로가 필요 없다
  const 서버표 = Object.fromEntries(몸.user.services.map((s) => [s.prefix, s.envs ?? []]));
  return { 쿠키, 서비스들: 몸.user.services.map((s) => s.prefix), 서버표 };
}

const 쉬는시간 = 5000;

/**
 * 대기줄을 돌린다. **사람이 켜서 터미널에 띄워 두는 프로그램**이다 (숨은 데몬이 아니다) —
 * 한도를 얼마나 쓰는지와 지금 무엇을 하는지가 눈에 보여야 한다.
 */
async function 돈다(): Promise<number> {
  const 막힘 = 선행검사({ env: process.env, 설정들: 설정들읽기() });
  if (막힘 !== null) {
    console.error(`[거부] ${막힘}`);
    return 1;
  }

  const 주소 = admin주소(process.env);
  const 안전하지않음 = 주소안전한가(주소);
  if (안전하지않음 !== null) {
    console.error(`[거부] ${안전하지않음}`);
    return 1;
  }

  const 아이디 = process.env.AUTHORING_AGENT_USER!;
  console.log(`[작성] ${주소} 에 ${아이디} 로 로그인한다. 비밀번호는 어디에도 안 적는다.`);

  let 쿠키: string;
  let 서비스들: string[];
  let 서버표: Record<string, 서버[]>;
  try {
    const 비번 = await 비밀번호묻기(아이디);
    ({ 쿠키, 서비스들, 서버표 } = await 로그인(주소, 아이디, 비번));
  } catch (err) {
    console.error(`[거부] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  if (서비스들.length === 0) {
    console.error('[거부] 이 계정에 배정된 서비스가 없다. 설정 화면에서 배정해라.');
    return 1;
  }

  // 맥이 꺼져 끊긴 요청은 아무도 안 끝낸다. 집기 전에 내 것만 닫는다 (게이트 1 결정)
  try {
    await 멈춘것닫기(주소, 쿠키, 서비스들, 아이디);
  } catch (err) {
    console.error(`[멈춤] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  // 자식이 돌기 전에 읽어 둔다 — 자식은 맥의 파일을 쓸 수 있다
  const 판정 = 판정기만들기(join(process.cwd(), '.claude', 'scripts', 'cases-only.mjs'));
  console.log(`[작성] 줄을 본다: ${서비스들.join(' · ')} — 멈추려면 Ctrl+C.`);
  for (;;) {
    let 집었나 = false;
    for (const 서비스 of 서비스들) {
      try {
        const 답 = await 부른다(주소, 쿠키, `/authoring/requests/claim?service=${encodeURIComponent(서비스)}`, {
          method: 'POST',
        });
        // **「204 가 아니면 집은 것」으로 가르지 않는다.** 500 의 오류 본문이
        // 집은 한 건으로 통과하면 빈 기획서로 claude 를 끝없이 돌린다
        if (!집은것인가(답.status, 답.몸)) {
          if (기다렸다다시인가(답.status)) {
            console.error(`[기다림] ${서비스} 집기가 ${답.status} 를 냈다. 잠시 뒤 다시 묻는다.`);
          }
          continue;
        }

        const 것 = 답.몸;
        console.log(`[작성] ${서비스} 의 ${것.id}번을 집었다 (${것.kind}).`);
        집었나 = true;
        await 한건처리(주소, 쿠키, 서비스, 것, 판정, 서버표[서비스] ?? []);
        console.log(`[작성] ${것.id}번을 끝냈다.`);
      } catch (err) {
        const 글 = err instanceof Error ? err.message : String(err);
        // **거절만 끝낸다.** 기다린다고 안 풀리고 사람이 손대야 한다
        if (글.includes('서버가 거절했다')) {
          console.error(`[멈춤] ${글}`);
          return 1;
        }
        // 연결이 끊긴 것은 서버가 다시 뜨는 중일 수 있다. **여기서 죽으면
        // 비밀번호를 저장 안 하므로 사람이 와서 다시 칠 때까지 아무도 못 되살린다**
        console.error(`[기다림] ${서비스}: ${글}`);
      }
    }

    if (!집었나) await new Promise((resolve) => setTimeout(resolve, 쉬는시간));
  }
}

// 검사가 이 파일을 import 할 때는 껍데기가 돌면 안 된다.
// 파일 이름으로 가르지 않는다 — 작업방 이름이 `authoring-agent` 라 그 방식은 조용히 틀린다
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void 돈다().then((코드) => process.exit(코드));
}
