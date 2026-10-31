// PRD 초안(PRD_DRAFT) 한 건 — 지금 PRD 를 받아 두고, 저장소 없이 자식 claude 를 띄워 이슈 글 · 노트 · 화면으로 초안 줄을 쓰게 한 뒤 결과 통로로 보낸다 (도메인/BTS 「PRD 초안 → 결정 필요」)
// 테스트 저장소 · PR 을 만들지 않는다. 자식은 코드를 읽지 않아 사본이 필요 없다 — 입력 파일만 둔 작업 폴더 하나로 돈다(노트 고치기와 같은 틀)

import { mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 비밀번호들, 계정환경 } from './authoring-accounts.js';
import { 자식환경 } from './authoring-chain.js';
import { type 계정, 사본자리, 파일거부사유 } from './authoring-copy.js';
import { MCP설정쓰기, 모양보기, 사본치우기, 새집, 자식거두기 } from './authoring-child.js';
import { 초안몸상한 } from '../apps/admin/src/bts/draft.js';
import { 결제환경 } from './authoring-billing.js';
import { 초안파일, 초안지시문, 값가리기, 비밀섞였나, 요청글, 출력읽기, 화면보나, type 초안자료 } from './authoring-draft-prompt.js';
import { type 보고손, 닫으며, 멈춤, 보고손만들기, 부른다, 돌린다, 친다 } from './authoring-io.js';
import { type 박동, 박동손 } from './authoring-heartbeat.js';
import { 도는번호 } from './authoring-keeping.js';
import { type 모델, 모델인자, 한도걸렸나 } from './authoring-model.js';
import { 진척누적기, 끝낼상태, 자식제한 } from './authoring-progress.js';
import { 대상환경, 사유거르기 } from './authoring-reverse.js';
import { type 집은것, MCP설정글 } from './authoring-rules.js';
import type { 서비스설정 } from './authoring-token.js';
import { 사용량보고 } from './authoring-usage.js';
import type { 판 } from './authoring-run.js';

/** 출력 파일 크기 상한 — 서버 결과 통로 몸 상한과 같다. 이 위는 자식이 잘못 쓴 것으로 본다 */
const 출력상한 = 초안몸상한;

/**
 * 자식 인자. 도구는 작업 폴더의 파일 읽기 · 쓰기와 QA Hub MCP, 웹이면 playwright-cli 뿐이다 —
 * `--tools` 에 Bash 를 넣어도 `-p` 의 허용 목록 밖 명령은 거절된다(묻지 못하니). 프롬프트는 stdin 으로 간다
 */
export function 초안자식인자(모델값: 모델, 자료폴더: string, 임시: string, 설정파일: string, 화면: boolean): string[] {
  return [
    '-p',
    ...모델인자(모델값),
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--add-dir',
    자료폴더,
    임시,
    '--tools',
    화면 ? 'Read,Write,Edit,Glob,Grep,Bash' : 'Read,Write,Edit,Glob,Grep',
    '--disable-slash-commands',
    '--strict-mcp-config',
    '--mcp-config',
    설정파일,
    '--allowedTools',
    'mcp__qa-hub',
    ...(화면 ? ['Bash(playwright-cli:*)'] : []),
  ];
}

/** 초안 일 한 건을 끝까지 돌린다. 단계는 에이전트 기록에 남는다(사람 작성 목록에는 안 보인다) */
export async function 초안한건처리(주소기지: string, 토큰: string, 서비스: string, 것: 집은것 & { draft: 초안자료 }, 판: 판, 자리번호: number, 설정: 서비스설정 | undefined): Promise<void> {
  const 박동 = 박동손(보고손만들기(주소기지, 토큰, 서비스, 것.id));
  await 닫으며(박동.손, (손) => 초안건(주소기지, 토큰, 서비스, 것, 판, 판.계정?.자식[자리번호] ?? null, 설정, 손, 박동)).finally(박동.멈추기);
}

async function 초안건(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것 & { draft: 초안자료 },
  판: 판,
  자식: 계정 | null,
  설정: 서비스설정 | undefined,
  손: 보고손,
  박동: 박동,
): Promise<void> {
  // 이슈 글은 MCP 로만 읽는다 — 열쇠가 없으면 근거 없이 쓰게 된다. BTS 를 이은 프로젝트의 초안이면 늘 온다(mcp/jobKey.ts)
  const 설정글 = MCP설정글(주소기지, 것.mcpKey);
  if (설정글 === undefined) return void (await 손.끝내기({ status: 'FAILED', error: 'MCP 열쇠가 없어 이슈 글을 못 읽는다 — BTS 연결을 확인해라' }));
  const 비밀들 = 비밀번호들(것);
  const 화면 = 화면보나(설정?.종류, 것.target?.baseUrl ?? undefined);

  await 손.단계('PRD 초안 쓰는 중 — 지금 PRD 를 받는 중');
  const prd = await 부른다(주소기지, 토큰, `/authoring/requests/${것.id}/prd`);
  if (prd.status !== 200) return void (await 손.끝내기({ status: 'FAILED', error: `지금 PRD 를 못 받았다 (${prd.status})` }));
  const 판몸 = prd.몸 as { version?: unknown; items?: unknown } | null;
  // 서버가 이 판으로 요구 번호를 견준다 — 도는 사이 새 판이 저장돼도 자식이 본 판과 맞춘다
  const 판번호 = typeof 판몸?.version === 'number' ? 판몸.version : 0;

  await 손.단계('PRD 초안 쓰는 중 — 작업 폴더를 만드는 중');
  const 자리 = 사본자리(것.id, 판.바탕);
  도는번호.add(것.id);
  try {
    rmSync(자리.뿌리, { recursive: true, force: true });
    mkdirSync(자리.뿌리, { recursive: true, mode: 0o755 });
    for (const 폴더 of [자리.자료, 자리.gh]) mkdirSync(폴더, { mode: 0o700 });
    새집(자리);
    // 자식이 읽는 것이라 0644 다 — 폴더가 자식 것이라 남은 못 연다. PRD 에 계정 값이 적혀 있을 수 있어 가린다
    writeFileSync(join(자리.자료, 초안파일.요청), 요청글({ 자료: 것.draft, 서비스, 종류: 설정?.종류, env: 것.target?.env ?? '', 화면 }));
    writeFileSync(join(자리.자료, 초안파일.PRD), JSON.stringify(값가리기({ version: 판번호, items: 판몸?.items ?? [] }, 비밀들), null, 2));
    const 설정파일 = MCP설정쓰기(자리.임시, 설정글, 자식)!;
    if (자식 !== null) {
      for (const 폴더 of [자리.자료, 자리.집, 자리.임시, 자리.gh]) {
        const r = 친다('chown', ['-hR', `${자식.uid}:${자식.gid}`, 폴더], 자리.뿌리);
        if (!r.ok) return void (await 손.끝내기({ status: 'FAILED', error: `초안 작업 폴더를 자식에게 못 넘겼다: ${r.까닭}` }));
      }
    }
    await 손.단계('PRD 초안 쓰는 중 — 이슈와 화면을 보는 중');
    if (박동.멈추라했다()) return void (await 손.끝내기({ status: 'STOPPED', stopReason: 'USER' }));

    const 누적 = 진척누적기(0, { 비밀번호들: 비밀들 });
    const 시작 = Date.now();
    const 인자 = 초안자식인자(판.모델, 자리.자료, 자리.임시, 설정파일, 화면);
    // 대상 서버 · 계정은 환경 변수로만 — 프롬프트 · 인자에 값을 싣지 않는다(작성 §7 ★)
    const 환경 = 결제환경(
      {
        ...자식환경(process.env, 자리.gh),
        ...(자식 === null ? {} : { HOME: 자리.집, TMPDIR: 자리.임시 }),
        ...(화면 && 것.target !== undefined ? { ...대상환경(것.target), ...계정환경(것.accounts) } : {}),
      },
      undefined,
    );
    const 돌린것 = await 박동.자식동안(
      () => 누적.스냅샷({ elapsedSec: Math.floor((Date.now() - 시작) / 1000), caseFiles: 0 }),
      (신호) =>
        돌린다(자식 === null ? 'claude' : 'sh', 자식 === null ? 인자 : ['-c', 'umask 077 && exec claude "$@"', 'sh', ...인자], {
          cwd: 자리.자료,
          input: 초안지시문({ 자료: 것.draft, 서비스, 폴더: 자리.자료, 화면 }),
          env: 환경,
          uid: 자식?.uid,
          gid: 자식?.gid,
          조용한제한: 자식제한,
          신호,
          흘림: true,
          흘림줄: (줄) => {
            const 글 = 누적.먹기(줄);
            return 글 === null ? null : `[초안] ${것.id}번 ${글}`;
          },
        }),
    );
    // 서버가 거절해 멈추는 중이면 자식을 죽인 것이다 — 서버도 받지 않으니 보고하지 않는다
    if (멈춤.까닭 !== null) return;
    const 안떴다 = 돌린것.코드 === null && !돌린것.시간초과 && !돌린것.멈춤으로죽음;
    // 토큰은 끝내기보다 먼저 알린다 — 끝난 행에는 서버가 409 라 시간초과 건의 토큰이 버려진다
    const 풀린 = 안떴다 ? null : await 사용량보고({ 주소기지, 토큰 }, 서비스, 것.id, 돌린것.낸것);
    // 읽기 전에 자식을 전부 거둔다 — 살아 있으면 읽은 뒤에 파일을 바꿔치기한다(브라우저도 같이 거둔다)
    if (!(await 자식거두기(자식))) return void (await 손.끝내기({ status: 'FAILED', error: '자식이 남긴 프로세스를 거두지 못했다 — 초안을 올리지 않는다' }));
    if (안떴다) {
      const 끝줄 = 돌린것.오류.trim().split('\n').pop() ?? '';
      return void (await 손.끝내기({ status: 'FAILED', error: 사유거르기(`claude 를 못 띄웠다: ${끝줄}`, 비밀들) }));
    }
    // 멈춤 · 시간 초과 · 한도는 STOPPED, 그 밖의 비정상 종료는 FAILED
    const 끝낼것 = 끝낼상태(돌린것, 한도걸렸나(풀린?.글 ?? '', 돌린것.오류));
    if (끝낼것 !== null && 끝낼것.stopReason !== 'CRASH') return void (await 손.끝내기(끝낼것));
    if (돌린것.코드 !== 0) return void (await 손.끝내기({ status: 'FAILED', error: `초안을 쓰다 claude 가 ${돌린것.코드 ?? '못 띄움'} 로 끝났다. 에이전트 기록을 봐라.` }));

    const 글 = 출력파일읽기(자리.자료);
    if (typeof 글 !== 'string') return void (await 손.끝내기({ status: 'FAILED', error: 글.까닭 }));
    const 몸 = 출력읽기(글);
    if ('까닭' in 몸) return void (await 손.끝내기({ status: 'FAILED', error: `초안 출력이 맞지 않는다 — ${몸.까닭}` }));
    if (비밀섞였나(몸, 비밀들)) return void (await 손.끝내기({ status: 'FAILED', error: '초안에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다' }));

    await 손.단계('PRD 초안 쓰는 중 — 초안을 저장하는 중');
    const 보내기 = (실을것: object) => 부른다(주소기지, 토큰, `/authoring/requests/${것.id}/draft`, { method: 'POST', body: { ...실을것, prdVersion: 판번호 } });
    let 답 = await 보내기(몸);
    // E2E 제안만 틀렸으면 그것만 빼고 다시 — 맞는 PRD 줄까지 버리지 않는다
    if (E2E만틀림(답) && 몸.e2e !== undefined) {
      console.error(`[초안] ${것.id}번 E2E 제안이 거절돼(${String((답.몸 as { detail?: unknown }).detail)}) 빼고 다시 보낸다`);
      답 = await 보내기({ rows: 몸.rows });
    }
    if (답.status === 201) return void (await 손.끝내기({ status: 'DONE' }));
    // 409 NOT_RUNNING 은 누가 이미 행을 닫았다 — 끝내기도 받아 주지 않는다
    if (답.status === 409) return void console.error(`[초안] ${것.id}번 이미 끝난 요청이라 초안을 올리지 못했다`);
    const 까닭 = (답.몸 as { error?: unknown; detail?: unknown } | null) ?? {};
    await 손.끝내기({ status: 'FAILED', error: `초안을 저장하지 못했습니다 — ${typeof 까닭.detail === 'string' ? `${String(까닭.error)} ${까닭.detail}` : `서버가 ${답.status} 를 냈다`}` });
  } finally {
    if (await 자식거두기(자식)) 사본치우기(자리);
    도는번호.delete(것.id);
  }
}

/** 서버가 E2E 제안 칸만 거절했나(400 BAD_DRAFT · detail 'e2e…') */
export function E2E만틀림(답: { status: number; 몸: unknown }): boolean {
  const 몸 = 답.몸 as { error?: unknown; detail?: unknown } | null;
  return 답.status === 400 && 몸?.error === 'BAD_DRAFT' && typeof 몸.detail === 'string' && 몸.detail.startsWith('e2e');
}

/** 자식이 쓴 출력 파일을 읽는다 — 일반 파일이고 작업 폴더 안일 때만(링크로 서버 파일을 읽게 하는 것을 막는다) */
function 출력파일읽기(자료폴더: string): string | { 까닭: string } {
  const 모양 = 모양보기(자료폴더, 초안파일.출력);
  if (모양.종류 === '없음') return { 까닭: `자식이 ${초안파일.출력} 을 쓰지 않았다` };
  const 거부 = 파일거부사유([모양], realpathSync(자료폴더));
  if (모양.종류 !== '파일' || 거부 !== null) return { 까닭: '초안 출력 파일이 일반 파일이 아니다' };
  if (statSync(join(자료폴더, 초안파일.출력)).size > 출력상한) return { 까닭: '초안 출력 파일이 너무 크다' };
  return readFileSync(join(자료폴더, 초안파일.출력), 'utf8');
}
