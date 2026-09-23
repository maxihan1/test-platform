// 자식이 끝난 사본을 올리는 껍데기 — 판정 → 커밋 → 다시 판정 → 파일 모양 → push → 초안 PR. 판단은 authoring-chain · authoring-copy 에 있다
// authoring-run.ts 가 300줄을 넘어 뗐다 (2026-09-24)

import { readFileSync } from 'node:fs';
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
import { type 사본, 사본환경, 파일거부사유 } from './authoring-copy.js';
import { 모양보기, 트리실제 } from './authoring-child.js';
import { type 보고손, type 판정기, 다시하며, 친다 } from './authoring-io.js';

/** 자식이 거둬진 뒤에 부른다 — 살아 있는 자식이 있으면 아래 검사 뒤에 파일을 바꿔치기한다 */
export async function 올리기(
  자리: 사본,
  것: 집은것,
  서비스: string,
  판정: 판정기,
  기준: string,
  자식출력: string,
  손: 보고손,
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

  // 훅은 안 돈다(사본환경) — 트리의 훅은 자식이 쓴 것이다. 같은 검사(타입·K1~K10)는 CI 의 가벼운 길이 한다
  const 올림 = await 다시하며('push', () => {
    const r = 트리에서('git', 푸시인자(것.id));
    return r.ok ? { 값: true } : push실패(r);
  });
  if ('까닭' in 올림) {
    await 손.끝내기({ status: 'FAILED', error: `push 가 실패했다: ${올림.까닭}` });
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
    await 손.끝내기({ status: 'FAILED', error: `PR 을 못 만들었다: ${PR.까닭}` });
    return;
  }
  await 손.끝내기({ status: 'DONE', prUrl: PR.값 });
}
