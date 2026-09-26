// 자식이 끝난 사본을 올리는 껍데기 — 판정 → 커밋 → 다시 판정 → 파일 모양 → push → 초안 PR. 판단은 authoring-chain · authoring-copy 에 있다
// authoring-run.ts 가 300줄을 넘어 뗐다 (2026-09-24)

import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import type { 집은것 } from './authoring-rules.js';
import {
  PR만들기인자,
  PR본문,
  PR찾기인자,
  바뀐파일들,
  비밀섞였나,
  push실패,
  커밋메시지,
  커밋뒤거부사유,
  커밋수인자,
  올린파일인자,
  푸시거부사유,
  푸시인자,
} from './authoring-chain.js';
import { type 계정, type 사본, 사본환경, 파일거부사유 } from './authoring-copy.js';
import { 모양보기, 트리실제 } from './authoring-child.js';
import { type 보고손, type 판정기, 다시하며, 인증헤더, 친다, 한번더건다 } from './authoring-io.js';
import {
  계정섞였나,
  되읽기인자,
  변환인자,
  변환환경,
  사유거르기,
  산출물주소,
  올리기전검사,
  원고거부사유,
  차이정리,
} from './authoring-reverse.js';

/** 역방향일 때 올리기가 더 쓰는 것 (도메인/작성 §3.6 「★ 역방향」) */
export interface 역방향올리기 {
  주소기지: string;
  토큰: string;
  /** 자식 uid. 맥이면 null — pandoc 도 그 uid 로 돌린다(믿을 수 없는 원고를 연다) */
  자식: 계정 | null;
  /** 기획서 없이 시작 주소만 — 역기획서가 없으면 이유를 남긴다 */
  화면만: boolean;
}

const 글상한 = 1024 * 1024;
const 워드상한 = 20 * 1024 * 1024;

/**
 * 자식이 `<자료>/out/` 에 쓴 산출물 하나를 읽는다. 없으면 `몸: null`.
 * **root 가 읽는다** — 링크·하드링크(`nlink`)·`out` 폴더 바꿔치기(실제 경로 대조)를 거부해야 자식이 가리킨
 * 남의 파일(토큰·환경)이 PR·서버로 나가지 않는다. 자식은 이미 거둬져 읽는 사이에 바꿀 프로세스가 없다
 */
function 산출물읽기(자리: 사본, 이름: string, 상한: number): { 몸: Buffer | null } | { 사유: string } {
  const 파일 = join(자리.자료, 'out', 이름);
  let 정보;
  try {
    정보 = lstatSync(파일);
  } catch {
    return { 몸: null };
  }
  if (!정보.isFile() || 정보.nlink !== 1 || realpathSync(파일) !== join(realpathSync(자리.자료), 'out', 이름)) {
    return { 사유: `산출물 ${이름} 이 일반 파일이 아니거나 산출물 폴더 밖을 가리킨다 — 올리지 않는다` };
  }
  if (정보.size > 상한) return { 사유: `산출물 ${이름} 이 너무 크다 — 올리지 않는다` };
  return { 몸: readFileSync(파일) };
}

/** 원고를 워드로 바꾸고, 바꾼 것을 다시 글자로 읽어 비밀번호를 한 번 더 찾은 뒤 올린다. 못 하면 남길 이유, 되면 null */
async function 역기획서올리기(
  자리: 사본,
  것: 집은것,
  서비스: string,
  원고: string,
  역: 역방향올리기,
): Promise<string | null> {
  const 거부 = 원고거부사유(원고);
  if (거부 !== null) return 거부;
  const 폴더 = join(자리.자료, 'out');
  const 칠때 = {
    env: 변환환경(process.env, { HOME: 자리.집, TMPDIR: 자리.임시 }),
    ...(역.자식 === null ? {} : 역.자식),
  };
  const 바꿈 = 친다('pandoc', 변환인자('reverse-spec.md', 'reverse-spec.docx'), 폴더, undefined, 120_000, 칠때);
  if (!바꿈.ok) return '역기획서를 워드로 못 바꿨다';
  const 되읽음 = 친다('pandoc', 되읽기인자('reverse-spec.docx', 'reverse-spec.check.txt'), 폴더, undefined, 120_000, 칠때);
  const 글자 = 되읽음.ok ? 산출물읽기(자리, 'reverse-spec.check.txt', 글상한) : { 사유: '역기획서를 다시 못 읽었다' };
  if ('사유' in 글자 || 글자.몸 === null) return '역기획서를 다시 읽어 확인하지 못해 올리지 않았다';
  if (계정섞였나([글자.몸.toString('utf8')], 것.target?.loginPassword)) {
    return '역기획서에 테스트 계정 비밀번호가 들어 있어 올리지 않았다';
  }
  const 워드 = 산출물읽기(자리, 'reverse-spec.docx', 워드상한);
  if ('사유' in 워드 || 워드.몸 === null) return '역기획서 워드 파일을 못 읽었다';
  const 몸 = 워드.몸;
  const 답 = await 한번더건다(() =>
    fetch(`${역.주소기지}${산출물주소(것.id, 서비스, '역기획서.docx', 'REVERSE_SPEC')}`, {
      method: 'POST',
      headers: { ...인증헤더(역.토큰), 'content-type': 'application/octet-stream' },
      body: new Uint8Array(몸),
      signal: AbortSignal.timeout(120_000),
    }),
  );
  return 답.ok ? null : `역기획서를 못 올렸다 (${답.status})`;
}

/** 자식이 거둬진 뒤에 부른다 — 살아 있는 자식이 있으면 아래 검사 뒤에 파일을 바꿔치기한다 */
export async function 올리기(
  자리: 사본,
  것: 집은것,
  서비스: string,
  판정: 판정기,
  기준: string,
  자식출력: string,
  손: 보고손,
  역?: 역방향올리기,
): Promise<void> {
  const 깃 = 사본환경(자리);
  const 트리에서 = (명령: string, 인자: string[]) => 친다(명령, 인자, 자리.트리, undefined, 120_000, { env: 깃 });

  await 손.단계('올리는 중');
  const 상태 = 트리에서('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '-uall']);
  if (!상태.ok) {
    await 손.끝내기({ status: 'FAILED', error: `바뀐 파일을 못 읽었다: ${상태.까닭}` });
    return;
  }
  const 파일들 = 바뀐파일들(상태.낸것);
  // 판정 규칙은 cases-only.mjs 가 정본이다. 켤 때 메모리에 고정한 판을 쓴다 — 자식이 파일을 바꿔도 그대로다
  const 테스트만 = (목록: string[]) => 판정(목록, 기준, 자리.트리, 깃);
  const 거부 = 푸시거부사유(테스트만(파일들), 파일들);
  if (거부 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 거부 });
    return;
  }

  for (const [인자, 설명] of [
    [['add', '--', ...파일들], '담기'],
    [['commit', '-m', 커밋메시지(것.id, 서비스)], '커밋'],
  ] as const) {
    const r = 트리에서('git', [...인자]);
    if (!r.ok) {
      await 손.끝내기({ status: 'FAILED', error: `${설명}가 실패했다: ${r.까닭}` });
      return;
    }
  }

  // push 는 HEAD 라 자식이 몰래 만든 커밋까지 올라간다. 커밋한 뒤 진짜 main 과의 차이 전체를 다시 본다
  const 올린것 = 트리에서('git', 올린파일인자(기준));
  const 커밋수 = 트리에서('git', 커밋수인자(기준));
  const 전체 = 올린것.낸것.split('\n').filter((f) => f !== '');
  const 뒤거부 =
    올린것.ok && 커밋수.ok
      ? 커밋뒤거부사유(테스트만(전체), 전체, Number(커밋수.낸것.trim()))
      : '커밋한 뒤 차이를 못 읽었다';
  if (뒤거부 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 뒤거부 });
    return;
  }

  // 읽기 전에 모양을 본다 — 읽기는 링크를 따라가서, 자식이 /proc/1/environ 을 링크해 두면 토큰이 PR 본문에 실린다
  const 표 = join('docs', 'cases', `${서비스}.md`);
  const 모양거부 = 파일거부사유(
    [...new Set([...전체, 표])].map((f) => 모양보기(자리.트리, f)),
    트리실제(자리),
  );
  if (모양거부 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 모양거부 });
    return;
  }
  const 읽기 = (f: string) => (모양보기(자리.트리, f).종류 === '파일' ? readFileSync(join(자리.트리, f), 'utf8') : '');
  const 본문글 = PR본문({
    표: 읽기(표),
    // 결과 요약은 자식이 마지막에 찍는다 (tpx-author 「결과 요약」). 앞쪽 수다까지 실을 필요는 없다
    요약: 자식출력.trim().split('\n').slice(-40).join('\n'),
  });
  // 사유에 토큰을 싣지 않는다 — 사유는 화면과 서버 기록에 남는다
  if (비밀섞였나([본문글, ...전체.map(읽기)], 것.figmaToken)) {
    await 손.끝내기({ status: 'FAILED', error: '올릴 파일이나 PR 본문에 피그마 토큰이 들어 있다 — 올리지 않는다' });
    return;
  }
  // 역방향 — push 전에 올릴 글 전부(케이스·PR 본문·차이 파일·역기획서 원고)에서 테스트 계정 비밀번호를 찾는다 (§3.6 「남는 한계」)
  const 비밀 = 것.target?.loginPassword;
  const 차이파일 = 것.target === undefined ? { 몸: null } : 산출물읽기(자리, 'diffs.json', 글상한);
  const 원고파일 = 것.target === undefined ? { 몸: null } : 산출물읽기(자리, 'reverse-spec.md', 글상한);
  for (const f of [차이파일, 원고파일]) {
    if ('사유' in f) {
      await 손.끝내기({ status: 'FAILED', error: f.사유 });
      return;
    }
  }
  const 차이글 = '몸' in 차이파일 && 차이파일.몸 !== null ? 차이파일.몸.toString('utf8') : null;
  const 원고글 = '몸' in 원고파일 && 원고파일.몸 !== null ? 원고파일.몸.toString('utf8') : null;
  const 샘 = 올리기전검사({ 케이스: 전체.map(읽기), PR본문: 본문글, 차이: 차이글, 원고: 원고글 }, 비밀);
  if (샘 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 샘 });
    return;
  }

  // 훅은 안 돈다(사본환경) — 트리의 훅은 자식이 쓴 것이다. 같은 검사(타입·K 규칙)는 CI 의 가벼운 길이 한다
  const 올림 = await 다시하며('push', () => {
    const r = 트리에서('git', 푸시인자(것.id));
    return r.ok ? { 값: true } : push실패(r);
  });
  if ('까닭' in 올림) {
    await 손.끝내기({ status: 'FAILED', error: 사유거르기(`push 가 실패했다: ${올림.까닭}`, 비밀) });
    return;
  }

  // 재시도 전에 먼저 찾는다 — 만들기가 GitHub 에선 됐는데 답만 잃었으면 또 만들면 PR 이 둘이 된다
  const PR = await 다시하며('PR 만들기', () => {
    const 있나 = 트리에서('gh', PR찾기인자(것.id));
    const 있는것 = 있나.ok ? (JSON.parse(있나.낸것 || '[]') as { url: string }[])[0]?.url : undefined;
    if (있는것 !== undefined) return { 값: 있는것 };
    const r = 트리에서('gh', PR만들기인자(것.id, 커밋메시지(것.id, 서비스), 본문글));
    const 주소 = r.낸것.trim().split('\n').pop() ?? '';
    return r.ok && 주소.startsWith('https://') ? { 값: 주소 } : { 까닭: r.까닭 || 'PR 주소가 안 찍혔다' };
  });
  if ('까닭' in PR) {
    await 손.끝내기({ status: 'FAILED', error: 사유거르기(`PR 을 못 만들었다: ${PR.까닭}`, 비밀) });
    return;
  }
  if (것.target === undefined || 역 === undefined) {
    await 손.끝내기({ status: 'DONE', prUrl: PR.값 });
    return;
  }

  // 케이스 PR 은 섰다. 여기부터의 실패는 요청을 실패시키지 않고 이유만 남긴다 (2026-09-26 게이트 1)
  await 손.단계('역방향 산출물을 올리는 중');
  const 남길말: string[] = [];
  const 정리 = 차이정리(차이글);
  if ('사유' in 정리) 남길말.push(정리.사유);
  if (원고글 !== null) {
    const 못함 = await 역기획서올리기(자리, 것, 서비스, 원고글, 역);
    if (못함 !== null) 남길말.push(못함);
  } else if (역.화면만) {
    남길말.push('역기획서 원고(reverse-spec.md)가 없다');
  }
  await 손.끝내기({
    status: 'DONE',
    prUrl: PR.값,
    result: { diffs: 'diffs' in 정리 ? 정리.diffs : [] },
    ...(남길말.length === 0 ? {} : { error: 사유거르기(남길말.join(' · '), 비밀) }),
  });
}
