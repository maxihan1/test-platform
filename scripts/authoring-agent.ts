// 작성 에이전트. **화면이 세운 대기줄을 집어** 작업방에서 `claude -p` 로 tpx-author 를 돌리고, 맥이 직접 초안 PR 을 낸다.
// 껍데기(한 건 처리·머지·공용 손)는 authoring-run.ts · authoring-merge.ts · authoring-io.ts 에 있다. 이 파일은 순수 함수와 켜기·줄 돌기다.
// **기본은 서버의 `author` 컨테이너가 돌린다** (2026-09-23, apps/authoring/ · SPEC 도메인/작성 §3.6).
// 맥에서 같은 스크립트를 돌리는 길은 개발용 대체다 — 처음엔 서버에 Claude·GitHub 토큰을 안 심으려고 맥에서 돌렸다.
//
// **스스로 병합을 판단하지 않는다.** 사람이 화면에서 머지를 누르면 그것이 줄에 서고,
// 맥은 그 요청을 집어 초안을 풀고 CI 가 초록일 때 병합할 뿐이다 (docs/spec/도메인/작성.md §3.6).
// 사람 게이트는 사라진 것이 아니라 **자리를 옮겼다.**
//
// ★ 2026-09-22 — **기획서 경로를 인자로 받던 진입 방식을 없앴다** (docs/SETUP.md §8).
// 그 길은 admin 을 아예 안 불러 **로그인을 지나지 않았다** — §3.5 가 러너 포트를 닫으며
// 막은 뒷길과 같은 성질이다. 이제 들어오는 길은 화면뿐이고, 맥은 계정의 토큰으로 집어 간다.
//
// **비밀번호 대신 에이전트 토큰을 든다** (2026-09-23) — 켤 때마다 치던 비밀번호가 허들이었다.
// 토큰은 계정에 묶인 두 번째 열쇠이고 맥이 부르는 통로만 연다 (authoring-token.ts · SPEC 도메인/인증 §7).

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type 설정, type 설정자리, admin주소, 기다렸다다시인가, 선행검사, 주소안전한가, 집은것인가 } from './authoring-rules.js';
import { 부른다, 판정기만들기 } from './authoring-io.js';
import { 멈춘것닫기, 한건처리 } from './authoring-run.js';
import { 나풀기, 토큰고르기, 토큰모양인가, 토큰묻기, 토큰읽기, 토큰자리, 토큰저장 } from './authoring-token.js';

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

  // 서버 컨테이너는 .env 의 토큰, 맥은 처음 한 번 묻고 홈 아래 파일에 둔다 (SPEC 도메인/인증 §7). 계정 이름은 서버가 알려 준다
  const 자리 = 토큰자리(homedir());
  let 토큰: string;
  let 어디: '환경' | '파일' | '입력';
  let 나: string;
  let 서비스들: string[];
  let 서버표: Record<string, { env: string; baseUrl: string }[]>;
  try {
    const 고른것 = 토큰고르기(process.env, 토큰읽기(자리));
    토큰 = 고른것?.토큰 ?? (await 토큰묻기());
    어디 = 고른것?.어디 ?? '입력';
    if (!토큰모양인가(토큰)) throw new Error('에이전트 토큰 모양이 아니다 (tpa_ 로 시작한다). 설정 화면에서 복사한 값을 넣어라.');
    const 답 = await 부른다(주소, 토큰, '/auth/me');
    const 풀린것 = 나풀기(답.몸);
    if (typeof 풀린것 === 'string') throw new Error(풀린것);
    ({ username: 나, 서비스들, 서버표 } = 풀린것);
    // 서버가 받아 준 뒤에만 저장한다 — 틀린 값을 파일에 남기면 다음에 켤 때도 같은 자리에서 막힌다
    if (어디 === '입력') 토큰저장(자리, 토큰);
  } catch (err) {
    // 거절돼도 파일을 지우지 않는다 — 주소를 잘못 준 것만으로 멀쩡한 토큰이 사라지면 안 된다
    console.error(`[거부] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
  console.log(`[작성] ${주소} 에 ${나} 로 붙었다. 토큰은 ${어디 === '환경' ? 'AUTHORING_AGENT_TOKEN' : 자리} 에서 왔다.`);

  if (서비스들.length === 0) {
    console.error('[거부] 이 계정에 배정된 서비스가 없다. 설정 화면에서 배정해라.');
    return 1;
  }

  // 맥이 꺼져 끊긴 요청은 아무도 안 끝낸다. 집기 전에 내 것만 닫는다 (게이트 1 결정)
  try {
    await 멈춘것닫기(주소, 토큰, 서비스들, 나);
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
        const 답 = await 부른다(주소, 토큰, `/authoring/requests/claim?service=${encodeURIComponent(서비스)}`, {
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
        await 한건처리(주소, 토큰, 서비스, 것, 판정, 서버표[서비스] ?? []);
        console.log(`[작성] ${것.id}번을 끝냈다.`);
      } catch (err) {
        const 글 = err instanceof Error ? err.message : String(err);
        // **거절만 끝낸다.** 기다린다고 안 풀리고 사람이 손대야 한다
        if (글.includes('서버가 거절했다')) {
          console.error(`[멈춤] ${글}`);
          return 1;
        }
        // 연결이 끊긴 것은 서버가 다시 뜨는 중일 수 있다. **여기서 죽으면
        // 사람이 와서 다시 켤 때까지 아무도 못 되살린다**
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
