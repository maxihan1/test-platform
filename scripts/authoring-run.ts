// 작성 에이전트의 껍데기 — 한 건 처리(작업방 → 자식 → 올리기) · 켤 때 멈춘 줄 닫기.
// 여기는 I/O 뿐이다. 판단은 authoring-chain · authoring-assets · authoring-agent 의 순수 함수에 있고 검사도 거기 붙어 있다.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type 집은것, 거절인가, 줄프롬프트, 클로드인자 } from './authoring-agent.js';
import { type 자료, 돌릴수있나, 자료계획, 자료출처 } from './authoring-assets.js';
import {
  PR만들기인자,
  PR본문,
  PR찾기인자,
  닫을RUNNING,
  바뀐파일들,
  작업방준비,
  작업방폴더,
  케이스폴더,
  커밋메시지,
  커밋뒤거부사유,
  커밋수인자,
  올린파일인자,
  푸시거부사유,
  푸시인자,
} from './authoring-chain.js';
import { 다시하며, 보고손만들기, 부른다, 친다 } from './authoring-io.js';
import { 머지처리 } from './authoring-merge.js';

/** 켤 때 내 이름으로 잡힌 채 멈춘 RUNNING 을 닫는다. 맥이 꺼져 끊긴 것이라 아무도 안 끝낸다 */
export async function 멈춘것닫기(주소기지: string, 쿠키: string, 서비스들: string[], 나: string): Promise<void> {
  for (const 서비스 of 서비스들) {
    const 답 = await 부른다(주소기지, 쿠키, `/authoring/requests?service=${encodeURIComponent(서비스)}&status=RUNNING`);
    if (답.status !== 200) {
      console.error(`[기다림] ${서비스} 의 RUNNING 목록을 못 읽었다 (${답.status}). 이번엔 건너뛴다.`);
      continue;
    }
    const 목록 = (답.몸 as { items?: { id: number; status: string; claimedBy?: string | null }[] }).items ?? [];
    for (const id of 닫을RUNNING(목록, 나)) {
      await 보고손만들기(주소기지, 쿠키, 서비스, id).끝내기({
        status: 'FAILED',
        error: '맥이 꺼져 중단됐다 — 다시 넣어라',
      });
      console.log(`[정리] ${서비스} 의 ${id}번은 맥이 꺼져 멈춘 채였다. 실패로 닫았다.`);
    }
  }
}

/** 한 건을 끝까지 처리한다. 단계는 사람이 화면에서 보는 그 줄이다 */
export async function 한건처리(
  주소기지: string,
  쿠키: string,
  서비스: string,
  것: 집은것,
  서버들: { env: string; baseUrl: string }[] = [],
): Promise<void> {
  const 손 = 보고손만들기(주소기지, 쿠키, 서비스, 것.id);

  if (것.kind === 'MERGE') {
    // **머지 행에는 PR 주소가 안 실려 온다** — 서버가 줄을 세울 때 그 칸을 안 채운다
    // (`authoring/store.ts` 의 `줄세우기`). 그래서 **원본 행을 읽어** 가져온다
    let 주소 = 것.prUrl ?? null;
    if (주소 === null && typeof 것.sourceId === 'number') {
      const 원본 = await 부른다(주소기지, 쿠키, `/authoring/requests/${것.sourceId}?service=${encodeURIComponent(서비스)}`);
      주소 = (원본.몸 as { prUrl?: string | null } | null)?.prUrl ?? null;
    }
    // 브랜치 이름이 원본 요청 번호(`author-<번호>`)라 CI 실행을 그 번호로 찾는다
    if (주소 === null || typeof 것.sourceId !== 'number') {
      await 손.끝내기({ status: 'FAILED', error: '머지할 초안 PR 주소가 없다' });
      return;
    }
    await 머지처리(손, 것.sourceId, 주소);
    return;
  }

  // 재실행 행은 자기 자료가 없다. 원본 행을 읽어 자료와(옛 행이면) 본문을 가져온다
  const 출처 = 자료출처(것);
  let 자료들 = 것.assets ?? [];
  let 본문 = 것.specText ?? null;
  if (출처 !== 것.id) {
    const 원본 = await 부른다(주소기지, 쿠키, `/authoring/requests/${출처}?service=${encodeURIComponent(서비스)}`);
    if (원본.status !== 200) {
      await 손.끝내기({ status: 'FAILED', error: `원본 요청(${출처}번)을 못 읽었다 (${원본.status})` });
      return;
    }
    const 몸 = 원본.몸 as { assets?: 자료[]; specText?: string | null };
    자료들 = 몸.assets ?? [];
    본문 = 본문 || (몸.specText ?? null);
  }

  const 막힘 = 돌릴수있나({ specText: 본문, figmaToken: 것.figmaToken }, 자료들);
  if (막힘 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 막힘 });
    return;
  }

  const 뿌리 = process.cwd();
  const 작업방 = 작업방폴더(것.id, 뿌리);
  // 이름을 예측할 수 없게 만든다. 고정 이름이면 남이 미리 만들어 둔 폴더·링크에 받아 쓴다.
  // 작업방 밖에 둔다 — 안에 두면 받은 자료가 바뀐 파일로 잡혀 push 가 거부된다
  const 폴더 = mkdtempSync(join(tmpdir(), `authoring-${것.id}-`));
  try {
    await 손.단계('작업방을 만드는 중');
    for (const c of 작업방준비(것.id, 뿌리)) {
      const r = 친다(c.명령, c.인자, 뿌리);
      if (!r.ok) {
        await 손.끝내기({ status: 'FAILED', error: `작업방을 못 만들었다: ${c.명령} ${c.인자.join(' ')} — ${r.까닭}` });
        return;
      }
    }

    // 테스트 폴더는 작업방의 기존 케이스로 찾는다 (2026-09-23 사용자 결정). 없으면 첫 케이스는 사람의 일이다
    const 목록 = 친다('git', ['-c', 'core.quotePath=false', 'ls-files', 'tests'], 작업방);
    const 케이스자리 = 목록.ok ? 케이스폴더(목록.낸것.split('\n'), 서비스) : null;
    if (케이스자리 === null) {
      await 손.끝내기({
        status: 'FAILED',
        error: `${서비스} 의 케이스 폴더를 못 찾았다 — 첫 케이스는 사람이 /tpx 로 만든다`,
      });
      return;
    }

    const 계획 = 자료계획(자료들, 폴더);
    if (계획.some((c) => c.kind === 'FILE')) await 손.단계('자료를 받는 중');
    for (const c of 계획) {
      if (c.kind !== 'FILE') continue;
      const 답 = await fetch(
        `${주소기지}/api/authoring/requests/${출처}/assets/${c.id}?service=${encodeURIComponent(서비스)}`,
        { headers: { cookie: 쿠키 } },
      );
      if (거절인가(답.status)) {
        throw new Error(`서버가 거절했다 (${답.status}). 세션이 끊겼거나 등급이 모자란다 — 다시 물어도 같다.`);
      }
      if (!답.ok) {
        await 손.끝내기({ status: 'FAILED', error: `자료 「${c.name}」 을 못 받았다 (${답.status})` });
        return;
      }
      // 바이트 그대로 쓴다. 글자로 읽으면 PDF·워드가 깨진다
      writeFileSync(c.받을자리, Buffer.from(await 답.arrayBuffer()));
      if (c.변환 === null) continue;
      const 바꾼것 = 친다('textutil', c.변환, 뿌리);
      if (!바꾼것.ok) {
        await 손.끝내기({ status: 'FAILED', error: `자료 「${c.name}」 을 글자로 못 바꿨다: ${바꾼것.까닭}` });
        return;
      }
    }

    await 손.단계('케이스를 만드는 중');
    // 출력을 잡아 PR 본문에 싣는다. 사람 눈에도 보여야 하므로(숨은 데몬이 아니다) 그대로 흘려보낸다.
    // 피그마 토큰은 **자식 환경에만** 넣는다. 부모 환경에 넣으면 이 뒤에 띄우는 모든 것(gh 등)에 샌다
    const 돌린것 = spawnSync('claude', 클로드인자(폴더), {
      cwd: 작업방,
      input: 줄프롬프트({ ...것, specText: 본문 }, 서비스, 계획, { 폴더: 케이스자리, 서버들 }),
      stdio: ['pipe', 'pipe', 'inherit'],
      encoding: 'utf8',
      env: 것.figmaToken === undefined ? process.env : { ...process.env, FIGMA_TOKEN: 것.figmaToken },
    });
    const 낸것 = 돌린것.stdout ?? '';
    process.stdout.write(낸것);
    if (돌린것.error) {
      await 손.끝내기({ status: 'FAILED', error: `claude 를 못 띄웠다: ${돌린것.error.message}` });
      return;
    }
    if (돌린것.status !== 0) {
      await 손.끝내기({ status: 'FAILED', error: '케이스를 만들다 멈췄다. 터미널 기록을 봐라.' });
      return;
    }

    await 손.단계('올리는 중');
    const 상태 = 친다('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '-uall'], 작업방);
    if (!상태.ok) {
      await 손.끝내기({ status: 'FAILED', error: `바뀐 파일을 못 읽었다: ${상태.까닭}` });
      return;
    }
    const 파일들 = 바뀐파일들(상태.낸것);
    // 판정 규칙은 cases-only.mjs 가 정본이다. 맥 자신의 판(뿌리)을 쓴다 — 작업방의 origin/main 판에는 아직 없을 수 있다
    const 테스트만 = (목록: string[]) =>
      친다('node', [join(뿌리, '.claude', 'scripts', 'cases-only.mjs'), 'origin/main'], 작업방, `${목록.join('\n')}\n`).ok;
    const 거부 = 푸시거부사유(테스트만(파일들), 파일들);
    if (거부 !== null) {
      await 손.끝내기({ status: 'FAILED', error: 거부 });
      return;
    }

    for (const [인자, 설명] of [
      [['add', '--', ...파일들], '담기'],
      [['commit', '-m', 커밋메시지(것.id, 서비스)], '커밋'],
    ] as const) {
      const r = 친다('git', [...인자], 작업방);
      if (!r.ok) {
        await 손.끝내기({ status: 'FAILED', error: `${설명}가 실패했다: ${r.까닭}` });
        return;
      }
    }

    // push 는 HEAD 라 자식이 몰래 만든 커밋까지 올라간다. 커밋한 뒤 origin/main 과의 차이 전체를 다시 본다
    const 올린것 = 친다('git', 올린파일인자, 작업방);
    const 커밋수 = 친다('git', 커밋수인자, 작업방);
    const 전체 = 올린것.낸것.split('\n').filter((f) => f !== '');
    const 뒤거부 =
      올린것.ok && 커밋수.ok
        ? 커밋뒤거부사유(테스트만(전체), 전체, Number(커밋수.낸것.trim()))
        : '커밋한 뒤 차이를 못 읽었다';
    if (뒤거부 !== null) {
      await 손.끝내기({ status: 'FAILED', error: 뒤거부 });
      return;
    }

    const 올림 = await 다시하며('push', () => {
      // pre-push 훅(타입·케이스 형식)이 돌므로 넉넉히 준다
      const r = 친다('git', 푸시인자(것.id), 작업방, undefined, 600_000);
      return r.ok ? { 값: true } : { 까닭: r.까닭 };
    });
    if ('까닭' in 올림) {
      await 손.끝내기({ status: 'FAILED', error: `push 가 실패했다: ${올림.까닭}` });
      return;
    }

    const 표자리 = join(작업방, 'docs', 'cases', `${서비스}.md`);
    const 본문글 = PR본문({
      표: existsSync(표자리) ? readFileSync(표자리, 'utf8') : '',
      // 결과 요약은 자식이 마지막에 찍는다 (tpx-author 「결과 요약」). 앞쪽 수다까지 실을 필요는 없다
      요약: 낸것.trim().split('\n').slice(-40).join('\n'),
    });
    // 재시도 전에 먼저 찾는다 — 만들기가 GitHub 에선 됐는데 답만 잃었으면 또 만들면 PR 이 둘이 된다
    const PR = await 다시하며('PR 만들기', () => {
      const 있나 = 친다('gh', PR찾기인자(것.id), 작업방);
      const 있는것 = 있나.ok ? (JSON.parse(있나.낸것 || '[]') as { url: string }[])[0]?.url : undefined;
      if (있는것 !== undefined) return { 값: 있는것 };
      const r = 친다('gh', PR만들기인자(것.id, 커밋메시지(것.id, 서비스), 본문글), 작업방);
      const 주소 = r.낸것.trim().split('\n').pop() ?? '';
      return r.ok && 주소.startsWith('https://') ? { 값: 주소 } : { 까닭: r.까닭 || 'PR 주소가 안 찍혔다' };
    });
    if ('까닭' in PR) {
      await 손.끝내기({ status: 'FAILED', error: `PR 을 못 만들었다: ${PR.까닭}` });
      return;
    }
    await 손.끝내기({ status: 'DONE', prUrl: PR.값 });
  } finally {
    // 받은 기획서를 맥에 남기지 않는다. 성공이든 실패든 지운다
    rmSync(폴더, { recursive: true, force: true });
    if (existsSync(작업방)) {
      // 강제로 안 지운다 — 남은 변경이 있으면 사람이 봐야 할 것이다
      const 치움 = 친다('git', ['worktree', 'remove', 작업방], 뿌리);
      if (!치움.ok) console.error(`[남김] 작업방을 못 치웠다: ${작업방} — ${치움.까닭}`);
    }
  }
}
