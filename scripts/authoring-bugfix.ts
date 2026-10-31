// 수정 AI(BUGFIX) 한 건 — 대상 코드 저장소를 받아 자식 claude 가 파일만 고치게 하고, 비밀값 검사 → push → 초안 PR → 결과 통로 보고까지 한다 (도메인/BTS 「수정 AI」)
// 자식은 GitHub 열쇠도 git 도 없다. clone · commit · push · PR 은 모두 이 스크립트(에이전트 권한)가 한다

import { mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 비밀번호들 } from './authoring-accounts.js';
import { PR본문고치기인자, 자식환경, 한줄 } from './authoring-chain.js';
import { type 계정, 사본자리, 사본환경, 파일거부사유, type 사본 } from './authoring-copy.js';
import { MCP설정쓰기, 모양보기, 사본치우기, 새집, 자식거두기 } from './authoring-child.js';
import { 결제환경 } from './authoring-billing.js';
import { type 보고손, 닫으며, 다시하며, 돌린다, 멈춤, 보고손만들기, 부른다, 친다 } from './authoring-io.js';
import { type 박동, 박동손 } from './authoring-heartbeat.js';
import { 도는번호 } from './authoring-keeping.js';
import { 모델인자, 한도걸렸나 } from './authoring-model.js';
import { 진척누적기, 끝낼상태, 자식제한 } from './authoring-progress.js';
import { 값가리기 } from './authoring-draft-prompt.js';
import { 계정섞였나, 글모두, 사유거르기 } from './authoring-reverse.js';
import { type 집은것, MCP설정글 } from './authoring-rules.js';
import { 글자자르기, 사용량보고 } from './authoring-usage.js';
import type { 판 } from './authoring-run.js';
import {
  type 사람,
  type 수정자료,
  PR본문,
  blame풀기,
  넘길사람모으기,
  수정자식인자,
  수정지시문,
  수정파일,
  올릴수없는파일,
  옛범위풀기,
  이슈글,
  저장소이름,
  출력읽기,
  코드주인풀기,
  파일주인,
  상태파일들,
  수정커밋제목인가,
  원격머리풀기,
  푸시인자,
  상한,
} from './authoring-bugfix-prompt.js';

/** 출력 파일 크기 상한 — 글 두 칸(각 8,000자 × 한글 3바이트)보다 넉넉하다. 이 위는 자식이 잘못 쓴 것으로 본다 */
const 출력상한 = 100_000;
/** 얕은 복제 깊이 — blame 이 닿을 만큼만 받는다 */
const 복제깊이 = 200;
/** 넘길 사람을 찾느라 blame 을 칠 한도 — 파일이 많은 고침에서 에이전트가 오래 막히지 않게 */
const 파일한도 = 20;
const 범위한도 = 10;

export const 수정건브랜치 = (번호: number): string => `qahub-bugfix-${번호}`;

/** 수정 일 한 건을 끝까지 돌린다. 단계는 에이전트 기록에 남는다(사람 작성 목록에는 안 보인다) */
export async function 수정한건처리(주소기지: string, 토큰: string, 서비스: string, 것: 집은것 & { bugfix: 수정자료 }, 판: 판, 자리번호: number): Promise<void> {
  const 박동 = 박동손(보고손만들기(주소기지, 토큰, 서비스, 것.id));
  await 닫으며(박동.손, (손) => 수정건(주소기지, 토큰, 서비스, 것, 판, 판.계정?.자식[자리번호] ?? null, 손, 박동)).finally(박동.멈추기);
}

async function 수정건(주소기지: string, 토큰: string, 서비스: string, 것: 집은것 & { bugfix: 수정자료 }, 판: 판, 자식: 계정 | null, 손: 보고손, 박동: 박동): Promise<void> {
  const 자료 = 것.bugfix;
  // 이슈 글은 note 에 이미 있다. MCP 는 맥락을 더 찾는 용도지만 BTS 를 이은 프로젝트면 늘 열쇠가 온다(mcp/jobKey.ts)
  const 설정글 = MCP설정글(주소기지, 것.mcpKey);
  if (설정글 === undefined) return void (await 손.끝내기({ status: 'FAILED', error: 'MCP 열쇠가 없어 맥락을 못 읽는다 — BTS 연결을 확인해라' }));
  const 계정비밀 = 비밀번호들(것);
  // 피그마 · 팜 토큰도 자식 환경에 있을 수 있다 — 저장소는 공개일 수 있어 올라가면 그대로 공개된다
  const 비밀들 = [...계정비밀, ...[것.figmaToken, process.env.PLATFORM_APPIUM_TOKEN].filter((v): v is string => typeof v === 'string' && v !== '')];
  const 이름 = 자료.repo === null ? null : 저장소이름(자료.repo.url);

  const 자리 = 사본자리(것.id, 판.바탕);
  도는번호.add(것.id);
  try {
    await 손.단계('버그 고치는 중 — 작업 폴더를 만드는 중');
    rmSync(자리.뿌리, { recursive: true, force: true });
    mkdirSync(자리.뿌리, { recursive: true, mode: 0o755 });
    for (const 폴더 of [자리.자료, 자리.gh]) mkdirSync(폴더, { mode: 0o700 });
    새집(자리);

    let 기본브랜치 = '';
    if (이름 !== null) {
      await 손.단계('버그 고치는 중 — 코드 저장소를 받는 중');
      const 받음 = await 저장소받기(자리, 이름);
      if (typeof 받음 !== 'string') return void (await 손.끝내기({ status: 'FAILED', error: 사유거르기(받음.까닭, 비밀들) }));
      기본브랜치 = 받음;
    }
    const 저장소있음 = 이름 !== null;

    // 자식이 읽는 것이라 0644 다. 이슈 글에 계정 값이 적혀 있을 수 있어 가린다
    writeFileSync(join(자리.자료, 수정파일.이슈), 값가리기(이슈글(자료), 비밀들));
    const 설정파일 = MCP설정쓰기(자리.임시, 설정글, 자식)!;
    if (자식 !== null) {
      for (const 폴더 of [자리.자료, 자리.집, 자리.임시, 자리.gh, ...(저장소있음 ? [자리.트리] : [])]) {
        const r = 친다('chown', ['-hR', `${자식.uid}:${자식.gid}`, 폴더], 자리.뿌리);
        if (!r.ok) return void (await 손.끝내기({ status: 'FAILED', error: `수정 작업 폴더를 자식에게 못 넘겼다: ${r.까닭}` }));
      }
    }
    await 손.단계(`버그 고치는 중 — ${자료.issueKey} 원인을 찾는 중`);
    if (박동.멈추라했다()) return void (await 손.끝내기({ status: 'STOPPED', stopReason: 'USER' }));

    const 누적 = 진척누적기(0, { 비밀번호들: 비밀들 });
    const 시작 = Date.now();
    const 인자 = 수정자식인자(모델인자(판.모델), 자리.자료, 자리.임시, 설정파일);
    const 환경 = 결제환경({ ...자식환경(process.env, 자리.gh), ...(자식 === null ? {} : { HOME: 자리.집, TMPDIR: 자리.임시 }) }, undefined);
    const 돌린것 = await 박동.자식동안(
      () => 누적.스냅샷({ elapsedSec: Math.floor((Date.now() - 시작) / 1000), caseFiles: 0 }),
      (신호) =>
        돌린다(자식 === null ? 'claude' : 'sh', 자식 === null ? 인자 : ['-c', 'umask 077 && exec claude "$@"', 'sh', ...인자], {
          cwd: 저장소있음 ? 자리.트리 : 자리.자료,
          input: 수정지시문({ 자료, 폴더: 자리.자료, 서비스 }),
          env: 환경,
          uid: 자식?.uid,
          gid: 자식?.gid,
          조용한제한: 자식제한,
          신호,
          흘림: true,
          흘림줄: (줄) => {
            const 글 = 누적.먹기(줄);
            return 글 === null ? null : `[수정] ${것.id}번 ${글}`;
          },
        }),
    );
    // 서버가 거절해 멈추는 중이면 자식을 죽인 것이다 — 서버도 받지 않으니 보고하지 않는다
    if (멈춤.까닭 !== null) return;
    const 안떴다 = 돌린것.코드 === null && !돌린것.시간초과 && !돌린것.멈춤으로죽음;
    // 토큰은 끝내기보다 먼저 알린다 — 끝난 행에는 서버가 409 라 시간초과 건의 토큰이 버려진다
    const 풀린 = 안떴다 ? null : await 사용량보고({ 주소기지, 토큰 }, 서비스, 것.id, 돌린것.낸것);
    // 읽기 전에 자식을 전부 거둔다 — 살아 있으면 읽은 뒤에 파일을 바꿔치기한다
    if (!(await 자식거두기(자식))) return void (await 손.끝내기({ status: 'FAILED', error: '자식이 남긴 프로세스를 거두지 못했다 — 수정을 올리지 않는다' }));
    if (안떴다) {
      const 끝줄 = 돌린것.오류.trim().split('\n').pop() ?? '';
      return void (await 손.끝내기({ status: 'FAILED', error: 사유거르기(`claude 를 못 띄웠다: ${끝줄}`, 비밀들) }));
    }
    const 끝낼것 = 끝낼상태(돌린것, 한도걸렸나(풀린?.글 ?? '', 돌린것.오류));
    if (끝낼것 !== null && 끝낼것.stopReason !== 'CRASH') return void (await 손.끝내기(끝낼것));
    if (돌린것.코드 !== 0) return void (await 손.끝내기({ status: 'FAILED', error: `버그를 고치다 claude 가 ${돌린것.코드 ?? '못 띄움'} 로 끝났다. 에이전트 기록을 봐라.` }));

    const 글 = 출력파일읽기(자리.자료);
    if (typeof 글 !== 'string') return void (await 손.끝내기({ status: 'FAILED', error: 글.까닭 }));
    const 몸 = 출력읽기(글);
    if ('까닭' in 몸) return void (await 손.끝내기({ status: 'FAILED', error: `수정 출력이 맞지 않는다 — ${몸.까닭}` }));

    await 손.단계('버그 고치는 중 — 고친 내용을 검사하는 중');
    const 깃 = 사본환경(자리);
    const 트리에서 = (명령: string, 인자2: string[]) => 친다(명령, 인자2, 자리.트리, undefined, 120_000, { env: 깃 });
    // -z 로 읽는다 — 공백 · 따옴표가 든 이름이 따옴표로 싸여 와 깨지지 않게
    const 상태 = 저장소있음 ? 트리에서('git', ['status', '--porcelain', '-z', '-uall']) : null;
    if (상태 !== null && !상태.ok) return void (await 손.끝내기({ status: 'FAILED', error: `바뀐 파일을 못 읽었다: ${상태.까닭}` }));
    const 파일들 = 상태 === null ? [] : 상태파일들(상태.낸것);
    const 주인들 = 파일들.length === 0 ? [] : 넘길사람(자리, 파일들);

    const 분석 = (앞말: string, 본문넣기 = true) =>
      분석보내기(주소기지, 토큰, 것.id, 손, 비밀들, 주인들, 본문넣기 ? [앞말, 몸.analysis, 몸.fixed ? 몸.summary : ''].filter((x) => x.trim() !== '').join('\n\n') : 앞말);
    if (!저장소있음) return await 분석(자료.repo === null ? '코드 저장소가 없어 원인 분석만 했어요.' : '코드 저장소 주소를 받을 수 없어 원인 분석만 했어요.');
    if (!몸.fixed) return await 분석(파일들.length === 0 ? '' : '자식이 파일을 바꿨지만 고치지 못했다고 해서 올리지 않았어요.');
    if (파일들.length === 0) return await 분석('고쳤다고 했지만 바뀐 파일이 없어요.');
    const 설정바꿈 = 올릴수없는파일(파일들);
    if (설정바꿈 !== null) return await 분석(설정바꿈);
    if (파일거부사유(파일들.map((f) => 모양보기(자리.트리, f)), realpathSync(자리.트리)) !== null) return await 분석('링크나 폴더(서브모듈 포함)를 바꿔 올리지 않았어요.');

    const 담기 = 트리에서('git', ['add', '--', ...파일들]);
    if (!담기.ok) return void (await 손.끝내기({ status: 'FAILED', error: `파일을 담지 못했다: ${담기.까닭}` }));
    const 차이 = 트리에서('git', ['diff', '--cached', '--no-ext-diff', 'HEAD']);
    if (!차이.ok) return void (await 손.끝내기({ status: 'FAILED', error: `바뀐 내용을 읽지 못했다: ${차이.까닭}` }));
    const 제목 = 자료.title.replace(/\s+/g, ' ').trim();
    const 본문 = PR본문({ issueKey: 자료.issueKey, title: 제목, summary: 몸.summary, files: 파일들 });
    const 커밋글 = `[QA Hub] ${자료.issueKey} 수정 — ${제목}`;
    // diff · 본문 · 커밋 글 · 요약 · 분석 어디든 비밀이 섞였으면 push 하지 않는다
    if (계정섞였나([차이.낸것, 본문, 커밋글, ...글모두(몸)], 비밀들)) {
      return await 분석(`고친 내용에 비밀값이 섞여 올리지 않았어요. 바뀐 파일은 ${파일들.slice(0, 20).join(' · ')} 이에요.`, false);
    }

    await 손.단계('버그 고치는 중 — 초안 PR 을 올리는 중');
    const 커밋 = 트리에서('git', ['commit', '-m', 커밋글]);
    if (!커밋.ok) return void (await 손.끝내기({ status: 'FAILED', error: 사유거르기(`커밋이 실패했다: ${커밋.까닭}`, 비밀들) }));
    const 브랜치 = 수정건브랜치(것.id);
    // 덮어쓰기는 원격 머리가 이 스크립트가 올린 커밋일 때만이다(CLAUDE.md §5) — 사람 커밋이 있으면 push 하지 않는다
    const 올림 = await 다시하며('push', () => {
      const 묻기 = 트리에서('git', ['ls-remote', 'origin', `refs/heads/${브랜치}`]);
      if (!묻기.ok) return { 까닭: `원격 ${브랜치} 를 못 읽었다: ${묻기.까닭}` };
      const 머리 = 원격머리풀기(묻기.낸것);
      if ('까닭' in 머리) return { 까닭: 머리.까닭, 그만: true };
      if (머리.머리 !== null) {
        if (!트리에서('git', ['fetch', '--quiet', 'origin', 머리.머리]).ok) return { 까닭: `원격 ${브랜치} 머리를 못 받았다` };
        const 머리제목 = 트리에서('git', ['log', '-1', '--format=%s', 머리.머리]);
        if (!머리제목.ok) return { 까닭: `원격 ${브랜치} 머리 커밋을 못 읽었다: ${머리제목.까닭}` };
        if (!수정커밋제목인가(머리제목.낸것, 자료.issueKey)) return { 까닭: `${브랜치} 에 사람 커밋이 있어 덮어쓰지 않는다`, 그만: true };
      }
      const r = 트리에서('git', 푸시인자(브랜치, 머리.머리));
      return r.ok ? { 값: true } : { 까닭: r.까닭 || r.오류.trim().split('\n').pop() || 'push 가 실패했다' };
    });
    if ('까닭' in 올림) return void (await 손.끝내기({ status: 'FAILED', error: 사유거르기(`push 가 실패했다: ${올림.까닭}`, 비밀들) }));

    // 재시도 전에 먼저 찾는다 — 만들기가 GitHub 에선 됐는데 답만 잃었으면 또 만들면 PR 이 둘이 된다
    const PR = await 다시하며('PR 만들기', () => {
      const 있나 = 트리에서('gh', ['pr', 'list', '--repo', 이름, '--head', 브랜치, '--json', 'url']);
      const 있는것 = 있나.ok ? (JSON.parse(있나.낸것 || '[]') as { url: string }[])[0]?.url : undefined;
      if (있는것 !== undefined) {
        if (!트리에서('gh', PR본문고치기인자(있는것, 본문)).ok) console.error(`[수정] ${것.id}번 PR 본문을 못 고쳤다 — 옛 본문이 남는다`);
        return { 값: 있는것 };
      }
      const r = 트리에서('gh', ['pr', 'create', '--draft', '--repo', 이름, '--base', 기본브랜치, '--head', 브랜치, '--title', `[QA Hub] ${자료.issueKey} ${제목}`, '--body', 본문]);
      const 주소 = r.낸것.trim().split('\n').pop() ?? '';
      return r.ok && 주소.startsWith('https://') ? { 값: 주소 } : { 까닭: r.까닭 || 'PR 주소가 안 찍혔다' };
    });
    if ('까닭' in PR) return void (await 손.끝내기({ status: 'FAILED', error: 사유거르기(`PR 을 못 만들었다: ${PR.까닭}`, 비밀들) }));

    await 손.단계('버그 고치는 중 — 결과를 저장하는 중');
    const 답 = await 부른다(주소기지, 토큰, `/authoring/requests/${것.id}/bugfix`, {
      method: 'POST',
      body: {
        prUrl: PR.값,
        summary: 글자자르기(사유거르기(몸.summary, 비밀들), 상한.글),
        files: 파일들.slice(0, 상한.파일수).map((f) => 글자자르기(f, 상한.파일길이)),
        owners: 주인들,
      },
    });
    return await 보고뒤(답, 손, 것.id, { status: 'DONE', prUrl: PR.값 }, `PR 은 올렸어요(${PR.값})`);
  } finally {
    if (await 자식거두기(자식)) 사본치우기(자리);
    도는번호.delete(것.id);
  }
}

/**
 * 결과 통로 답을 보고 끝낸다 — 201 이면 DONE. 409 는 응답을 잃고 다시 보낸 것일 수 있어(서버는 이미 저장했다) 똑같이 끝낸다 —
 * 서버가 이미 끝낸 줄이면 끝내기도 409 라 해가 없다. 400 · 그 밖은 FAILED. 201 응답 몸은 비어 있어 읽지 않는다
 */
async function 보고뒤(답: { status: number; 몸: unknown }, 손: 보고손, id: number, 성공: Record<string, unknown>, 앞말: string): Promise<void> {
  if (답.status === 409) console.error(`[수정] ${id}번 결과 통로가 409 를 냈다 — 이미 저장된 것으로 보고 끝낸다`);
  if (답.status === 201 || 답.status === 409) return void (await 손.끝내기(성공));
  const 까닭 = (답.몸 as { error?: unknown; detail?: unknown } | null) ?? {};
  await 손.끝내기({ status: 'FAILED', error: `${앞말}. 결과를 저장하지 못했습니다 — ${typeof 까닭.detail === 'string' ? `${String(까닭.error)} ${까닭.detail}` : `서버가 ${답.status} 를 냈다`}` });
}

/** 원인 분석만 보낸다 — 못 고쳤거나 저장소가 없거나 올리지 못한 경우. 글은 비밀을 가리고 상한에 맞춘다 */
async function 분석보내기(주소기지: string, 토큰: string, id: number, 손: 보고손, 비밀들: readonly string[], 주인들: 사람[], 글: string): Promise<void> {
  // 자식이 지은 파일 이름에도 비밀이 들 수 있어 어느 길이든 거른다
  const 분석 = 글자자르기(사유거르기(글, 비밀들), 상한.글);
  const 답 = await 부른다(주소기지, 토큰, `/authoring/requests/${id}/bugfix`, { method: 'POST', body: { analysis: 분석 === '' ? '원인을 찾지 못했어요.' : 분석, owners: 주인들 } });
  await 보고뒤(답, 손, id, { status: 'DONE' }, '원인 분석');
}

/** 코드 저장소를 받아 푼다 — 얕은 bare 는 에이전트만 쓰는 자리(`git`)에, 파일은 자식이 쓰는 `트리`에. 기본 브랜치 이름을 낸다 */
async function 저장소받기(자리: 사본, 이름: string): Promise<string | { 까닭: string }> {
  const 환경 = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  const 복제 = await 돌린다('git', ['clone', '--bare', '--depth', String(복제깊이), `https://github.com/${이름}`, 자리.git], { cwd: 자리.뿌리, env: 환경, 제한: 10 * 60_000 });
  if (복제.코드 !== 0) return { 까닭: `코드 저장소를 못 받았다: ${복제.시간초과 ? '시간 초과' : 복제.오류.trim().split('\n').pop() ?? ''}` };
  const 머리 = 친다('git', ['--git-dir', 자리.git, 'symbolic-ref', '--short', 'HEAD'], 자리.뿌리);
  const 브랜치 = 머리.낸것.trim();
  if (!머리.ok || !/^[\w][\w./-]*$/.test(브랜치)) return { 까닭: '코드 저장소의 기본 브랜치를 못 읽었다' };
  mkdirSync(자리.트리, { mode: 0o755 });
  // 훅은 안 돈다(사본환경) — 저장소 훅이 에이전트 권한으로 돌지 않게
  const 풀기 = await 돌린다('git', ['checkout', '-q', '--detach', '-f', 'HEAD'], { cwd: 자리.트리, env: { ...환경, ...사본환경(자리) }, 제한: 10 * 60_000 });
  if (풀기.코드 !== 0) return { 까닭: `코드 저장소를 풀지 못했다: ${풀기.오류.trim().split('\n').pop() ?? ''}` };
  return 브랜치;
}

/** 넘길 사람 후보 — CODEOWNERS(마지막 규칙이 이긴다) → 고친 줄을 마지막으로 바꾼 사람. 이메일이 있는 사람만 BTS 와 이어진다 */
function 넘길사람(자리: 사본, 파일들: string[]): 사람[] {
  const 깃 = 사본환경(자리);
  const 트리에서 = (인자: string[]) => 친다('git', 인자, 자리.트리, undefined, 60_000, { env: 깃 });
  try {
    const 규칙 = 코드주인풀기(코드주인글(자리));
    const 코드주인 = 파일들.flatMap((f) => 파일주인(규칙, f));
    const 바꾼이: 사람[] = [];
    for (const f of 파일들.slice(0, 파일한도)) {
      const 차이 = 트리에서(['diff', '-U0', '--no-ext-diff', 'HEAD', '--', f]);
      if (!차이.ok) continue;
      for (const { 시작, 줄수 } of 옛범위풀기(차이.낸것).slice(0, 범위한도)) {
        const b = 트리에서(['blame', '--porcelain', '-L', `${시작},+${줄수}`, 'HEAD', '--', f]);
        if (b.ok) 바꾼이.push(...blame풀기(b.낸것));
      }
    }
    return 넘길사람모으기(코드주인, 바꾼이);
  } catch (err) {
    // 후보를 못 찾아도 PR 은 올린다 — 담당자는 서버가 BTS 구성 요소 리드 · 프로젝트 리드로 이어 간다
    console.error(`[수정] 넘길 사람을 못 찾았다: ${한줄(err)}`);
    return [];
  }
}

/** CODEOWNERS 글 — 세 자리 중 처음 것. 기본 브랜치의 저장소 사본(HEAD)에서 읽어 자식이 바꾼 것을 믿지 않는다 */
function 코드주인글(자리: 사본): string {
  for (const 경로 of ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']) {
    const r = 친다('git', ['--git-dir', 자리.git, 'show', `HEAD:${경로}`], 자리.뿌리);
    if (r.ok) return r.낸것;
  }
  return '';
}

/** 자식이 쓴 출력 파일을 읽는다 — 일반 파일이고 작업 폴더 안일 때만(링크로 서버 파일을 읽게 하는 것을 막는다) */
function 출력파일읽기(자료폴더: string): string | { 까닭: string } {
  const 모양 = 모양보기(자료폴더, 수정파일.출력);
  if (모양.종류 === '없음') return { 까닭: `자식이 ${수정파일.출력} 을 쓰지 않았다` };
  const 거부 = 파일거부사유([모양], realpathSync(자료폴더));
  if (모양.종류 !== '파일' || 거부 !== null) return { 까닭: '수정 출력 파일이 일반 파일이 아니다' };
  if (statSync(join(자료폴더, 수정파일.출력)).size > 출력상한) return { 까닭: '수정 출력 파일이 너무 크다' };
  return readFileSync(join(자료폴더, 수정파일.출력), 'utf8');
}
