// 프로젝트 노트 고치기(NOTE) 한 건 — PR 바뀐 파일을 GitHub 에서 읽고, 저장소 없이 자식 claude 를 띄워 노트를 고치게 한 뒤 결과 통로로 보낸다 (도메인/BTS 「맥락 — 프로젝트 노트」)
// 테스트 저장소 · PR 을 만들지 않는다. 자식은 코드를 읽지 않아 사본이 필요 없다 — 입력 파일만 둔 작업 폴더 하나로 돈다

import { mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 자식환경 } from './authoring-chain.js';
import { type 계정, 사본자리, 파일거부사유 } from './authoring-copy.js';
import { MCP설정쓰기, 모양보기, 사본치우기, 새집, 자식거두기 } from './authoring-child.js';
import { 결제환경 } from './authoring-billing.js';
import { type 보고손, 닫으며, 돌린다, 멈춤, 보고손만들기, 부른다, 친다 } from './authoring-io.js';
import { type 박동, 박동손 } from './authoring-heartbeat.js';
import { 도는번호 } from './authoring-keeping.js';
import { type 모델, 모델인자, 한도걸렸나 } from './authoring-model.js';
import { 진척누적기, 끝낼상태, 자식제한 } from './authoring-progress.js';
import { type 집은것, MCP설정글 } from './authoring-rules.js';
import { 사용량보고 } from './authoring-usage.js';
import type { 판 } from './authoring-run.js';
import {
  type 노트자료,
  노트지시문,
  노트파일,
  PR경로인자,
  PR경로풀기,
  PR주소풀기,
  사건글,
  지금글,
  출력읽기,
  프로젝트글,
} from './authoring-note-prompt.js';

/** 출력 파일의 크기 상한 — 문서 40개 × 4,000자(한글 3바이트)보다 넉넉하다. 이 위는 자식이 잘못 쓴 것으로 본다 */
const 출력상한 = 2 * 1024 * 1024;

/**
 * 자식 인자. 도구는 작업 폴더의 파일 읽기 · 쓰기와 QA Hub MCP 뿐이다 — 셸이 없으니 `Bash(*)` 허용이 집에 있어도 못 쓴다.
 * 변수 인자(`--add-dir` · `--tools`)는 `--` 깃발 앞에서 끝나고 프롬프트는 stdin 으로 간다
 */
export function 노트자식인자(모델값: 모델, 자료폴더: string, 임시: string, 설정파일: string | undefined): string[] {
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
    'Read,Write,Edit,Glob,Grep',
    '--disable-slash-commands',
    ...(설정파일 === undefined ? [] : ['--strict-mcp-config', '--mcp-config', 설정파일, '--allowedTools', 'mcp__qa-hub']),
  ];
}

/** 사건 목록의 PR 병합 사건마다 바뀐 파일을 읽는다. 읽기가 안 되면 그 PR 은 null — 제목만 넘기고 계속한다 */
async function PR경로들읽기(자료: 노트자료, 원천: string, id: number): Promise<Map<number, string[] | null>> {
  const 결과 = new Map<number, string[] | null>();
  const 주소별 = new Map<string, string[] | null>();
  for (const e of 자료.events) {
    if (e.kind !== 'PR_MERGED') continue;
    const 주소 = (e.payload as { prUrl?: unknown } | null)?.prUrl;
    const 풀린 = PR주소풀기(주소);
    if (풀린 === null) {
      console.error(`[노트] ${id}번 사건 ${e.id}: PR 주소가 GitHub 풀 리퀘스트 꼴이 아니어서 제목만 넘긴다`);
      결과.set(e.id, null);
      continue;
    }
    const 정규 = `https://github.com/${풀린.저장소}/pull/${풀린.번호}`;
    if (!주소별.has(정규)) {
      // 비동기로 친다 — 병합 사건이 여럿이어도 다른 줄의 집기 · 보고가 안 선다. 자식과 같은 이유로 gh 는 에이전트 환경(GH_TOKEN)에서만 돈다
      const 답 = await 돌린다('gh', PR경로인자(정규), { cwd: 원천, env: process.env, 제한: 60_000 });
      const 경로들 = 답.코드 === 0 ? PR경로풀기(답.낸것) : null;
      if (경로들 === null) console.error(`[노트] ${id}번 ${정규} 바뀐 파일을 못 읽어 제목만 넘긴다: ${답.시간초과 ? '시간 초과' : (답.오류.trim().split('\n')[0] ?? '읽지 못함')}`);
      주소별.set(정규, 경로들);
    }
    결과.set(e.id, 주소별.get(정규) ?? null);
  }
  return 결과;
}

/** 입력 파일 셋을 작업 폴더에 둔다. 자식이 읽는 것이라 0644 다 — 폴더가 자식 것이라 남은 못 연다 */
function 입력쓰기(자료폴더: string, 자료: 노트자료, 경로들: Map<number, string[] | null>): void {
  writeFileSync(join(자료폴더, 노트파일.프로젝트), 프로젝트글(자료));
  writeFileSync(join(자료폴더, 노트파일.지금), 지금글(자료));
  writeFileSync(join(자료폴더, 노트파일.사건), 사건글(자료.events, 경로들));
}

/** 노트 일 한 건을 끝까지 돌린다. 단계는 사람이 화면에서 보는 그 줄이다 */
export async function 노트한건처리(주소기지: string, 토큰: string, 서비스: string, 것: 집은것 & { note: 노트자료 }, 판: 판, 자리번호: number): Promise<void> {
  const 박동 = 박동손(보고손만들기(주소기지, 토큰, 서비스, 것.id));
  await 닫으며(박동.손, (손) => 노트건(주소기지, 토큰, 서비스, 것, 판, 판.계정?.자식[자리번호] ?? null, 손, 박동)).finally(박동.멈추기);
}

async function 노트건(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것 & { note: 노트자료 },
  판: 판,
  자식: 계정 | null,
  손: 보고손,
  박동: 박동,
): Promise<void> {
  const 자료 = 것.note;
  await 손.단계(`노트 고치는 중 — 바뀐 PR 파일을 읽는 중 (사건 ${자료.events.length}건)`);
  const 경로들 = await PR경로들읽기(자료, 판.원천, 것.id);
  if (박동.멈추라했다()) return void (await 손.끝내기({ status: 'STOPPED', stopReason: 'USER' }));

  await 손.단계('노트 고치는 중 — 작업 폴더를 만드는 중');
  const 자리 = 사본자리(것.id, 판.바탕);
  도는번호.add(것.id);
  try {
    rmSync(자리.뿌리, { recursive: true, force: true });
    mkdirSync(자리.뿌리, { recursive: true, mode: 0o755 });
    for (const 폴더 of [자리.자료, 자리.gh]) mkdirSync(폴더, { mode: 0o700 });
    새집(자리);
    입력쓰기(자리.자료, 자료, 경로들);
    const 설정파일 = MCP설정쓰기(자리.임시, MCP설정글(주소기지, 것.mcpKey), 자식);
    if (자식 !== null) {
      for (const 폴더 of [자리.자료, 자리.집, 자리.임시, 자리.gh]) {
        const r = 친다('chown', ['-hR', `${자식.uid}:${자식.gid}`, 폴더], 자리.뿌리);
        if (!r.ok) return void (await 손.끝내기({ status: 'FAILED', error: `노트 작업 폴더를 자식에게 못 넘겼다: ${r.까닭}` }));
      }
    }
    await 손.단계('노트 고치는 중 — 문서를 쓰는 중');
    if (박동.멈추라했다()) return void (await 손.끝내기({ status: 'STOPPED', stopReason: 'USER' }));

    const 누적 = 진척누적기(0);
    const 시작 = Date.now();
    const 인자 = 노트자식인자(판.모델, 자리.자료, 자리.임시, 설정파일);
    const 환경 = 결제환경({ ...자식환경(process.env, 자리.gh), ...(자식 === null ? {} : { HOME: 자리.집, TMPDIR: 자리.임시 }) }, undefined);
    const 돌린것 = await 박동.자식동안(
      () => 누적.스냅샷({ elapsedSec: Math.floor((Date.now() - 시작) / 1000), caseFiles: 0 }),
      (신호) =>
        돌린다(자식 === null ? 'claude' : 'sh', 자식 === null ? 인자 : ['-c', 'umask 077 && exec claude "$@"', 'sh', ...인자], {
          cwd: 자리.자료,
          input: 노트지시문(자료, 자리.자료, 설정파일 !== undefined),
          env: 환경,
          uid: 자식?.uid,
          gid: 자식?.gid,
          조용한제한: 자식제한,
          신호,
          흘림: true,
          흘림줄: (줄) => {
            const 글 = 누적.먹기(줄);
            return 글 === null ? null : `[노트] ${것.id}번 ${글}`;
          },
        }),
    );
    // 서버가 거절해 멈추는 중이면 자식을 죽인 것이다 — 서버도 받지 않으니 보고하지 않는다
    if (멈춤.까닭 !== null) return;
    const 안떴다 = 돌린것.코드 === null && !돌린것.시간초과 && !돌린것.멈춤으로죽음;
    // 토큰은 끝내기보다 먼저 알린다 — 끝난 행에는 서버가 409 라 시간초과 건의 토큰이 버려진다. claude 가 안 떴으면 쓴 토큰이 없다
    const 풀린 = 안떴다 ? null : await 사용량보고({ 주소기지, 토큰 }, 서비스, 것.id, 돌린것.낸것);
    // 읽기 전에 자식을 전부 거둔다 — 살아 있으면 읽은 뒤에 파일을 바꿔치기한다
    if (!(await 자식거두기(자식))) return void (await 손.끝내기({ status: 'FAILED', error: '자식이 남긴 프로세스를 거두지 못했다 — 노트를 올리지 않는다' }));
    if (안떴다) {
      const 끝줄 = 돌린것.오류.trim().split('\n').pop() ?? '';
      return void (await 손.끝내기({ status: 'FAILED', error: `claude 를 못 띄웠다: ${끝줄}` }));
    }
    // 멈춤 · 시간 초과 · 한도는 STOPPED — 쌓인 사건이 다음 노트 고치기로 간다. 그 밖의 비정상 종료는 FAILED
    const 끝낼것 = 끝낼상태(돌린것, 한도걸렸나(풀린?.글 ?? '', 돌린것.오류));
    if (끝낼것 !== null && 끝낼것.stopReason !== 'CRASH') return void (await 손.끝내기(끝낼것));
    if (돌린것.코드 !== 0) return void (await 손.끝내기({ status: 'FAILED', error: `노트를 고치다 claude 가 ${돌린것.코드 ?? '못 띄움'} 로 끝났다. 에이전트 기록을 봐라.` }));

    const 글 = 출력파일읽기(자리.자료);
    if (typeof 글 !== 'string') return void (await 손.끝내기({ status: 'FAILED', error: 글.까닭 }));
    const 몸 = 출력읽기(글);
    if ('까닭' in 몸) return void (await 손.끝내기({ status: 'FAILED', error: `노트 출력이 맞지 않는다 — ${몸.까닭}` }));

    await 손.단계('노트 고치는 중 — 새 판을 저장하는 중');
    const 답 = await 부른다(주소기지, 토큰, `/authoring/requests/${것.id}/note`, { method: 'POST', body: 몸 });
    if (답.status === 201) return void (await 손.끝내기({ status: 'DONE', result: { version: (답.몸 as { version?: unknown } | null)?.version } }));
    const 까닭 = (답.몸 as { error?: unknown; detail?: unknown } | null) ?? {};
    // 앞 판은 서버가 그대로 둔다. 409 NOT_RUNNING 은 누가 이미 행을 닫았다 — 끝내기도 받아 주지 않는다
    if (답.status === 409) return void console.error(`[노트] ${것.id}번 이미 끝난 요청이라 노트를 올리지 못했다`);
    await 손.끝내기({ status: 'FAILED', error: `노트를 저장하지 못했습니다 — ${typeof 까닭.detail === 'string' ? 까닭.detail : `서버가 ${답.status} 를 냈다`}` });
  } finally {
    if (await 자식거두기(자식)) 사본치우기(자리);
    도는번호.delete(것.id);
  }
}

/** 자식이 쓴 출력 파일을 읽는다 — 일반 파일이고 작업 폴더 안일 때만(링크로 서버 파일을 읽게 하는 것을 막는다) */
function 출력파일읽기(자료폴더: string): string | { 까닭: string } {
  const 모양 = 모양보기(자료폴더, 노트파일.출력);
  if (모양.종류 === '없음') return { 까닭: `자식이 ${노트파일.출력} 을 쓰지 않았다` };
  const 거부 = 파일거부사유([모양], realpathSync(자료폴더));
  if (모양.종류 !== '파일' || 거부 !== null) return { 까닭: `노트 출력 파일이 일반 파일이 아니다` };
  if (statSync(join(자료폴더, 노트파일.출력)).size > 출력상한) return { 까닭: '노트 출력 파일이 너무 크다' };
  return readFileSync(join(자료폴더, 노트파일.출력), 'utf8');
}
