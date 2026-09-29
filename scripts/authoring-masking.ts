// 자식을 띄우기 전에 받은 자료·앞 실행이 남긴 파일에서 테스트 계정 비밀번호를 가린다 — I/O 껍데기 (도메인/작성 §3.6 「★ 역방향」)
// 판정은 순수 함수(`지울원본` · `가릴트리파일` · `글자인가` · `비밀가리기`)에 있다

import { lstatSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { 가릴트리파일, 글자인가, 지울원본, type 읽을자료 } from './authoring-assets.js';
import { 바뀐파일들 } from './authoring-chain.js';
import { type 사본, 사본환경 } from './authoring-copy.js';
import { 친다 } from './authoring-io.js';
import { 비밀가리기 } from './authoring-reverse.js';

const 파일상한 = 20 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * 파일 하나를 가려 다시 쓴다. 에이전트는 root 라 앞 자식이 남긴 것을 조심한다 —
 * 링크 · 하드링크 · 울타리 밖 실제 경로는 건너뛴다(`모양보기`·`파일거부사유` 와 같은 관례). UTF-8 이 아니면 부수지 않게 건너뛴다
 */
function 파일가리기(자리: string, 울타리: string, 비밀: string): number {
  const 것 = lstatSync(자리, { throwIfNoEntry: false });
  if (것 === undefined || !것.isFile() || 것.nlink !== 1 || 것.size > 파일상한) return 0;
  if (!realpathSync(자리).startsWith(울타리 + sep)) return 0;
  const 몸 = readFileSync(자리);
  if (!글자인가(몸)) return 0;
  let 글: string;
  try {
    글 = utf8.decode(몸);
  } catch {
    return 0;
  }
  const 가림 = 비밀가리기(글, 비밀);
  if (가림 === 글) return 0;
  writeFileSync(자리, 가림);
  return 1;
}

/** 폴더를 걸으며 가린다. 폴더 링크는 따라가지 않는다 — 앞 자식이 남긴 링크가 울타리 밖을 가리킬 수 있다 */
function 폴더가리기(자리: string, 울타리: string, 비밀: string): number {
  const 것 = lstatSync(자리, { throwIfNoEntry: false });
  if (것 === undefined || 것.isSymbolicLink()) return 0;
  if (!것.isDirectory()) return 파일가리기(자리, 울타리, 비밀);
  return readdirSync(자리).reduce((n, 이름) => n + 폴더가리기(join(자리, 이름), 울타리, 비밀), 0);
}

/**
 * 역방향이면 자식을 띄우기 전에 부른다 — 글자로 바꾼 워드 사본을 지우고, 자료 폴더 전체와 트리에서 앞 실행이 바꾼
 * 케이스 · 요구사항 표, 본문에서 비밀번호를 가린다. 이어받은 실행이면 앞 실행이 남긴 파일도 여기서 가려진다 (2026-09-29 사용자 게이트 1).
 * 로그에는 값 없이 수만 찍는다. 못 가리면 `사유` — 부르는 쪽이 자식을 띄우지 않고 FAILED 로 닫는다(가리지 않은 채 띄우지 않는다)
 */
export function 먼저가리기(
  번호: number,
  계획: 읽을자료[],
  자리: 사본,
  본문: string | null,
  비밀: string | null | undefined,
): { 본문: string | null } | { 사유: string } {
  if (!비밀) return { 본문 };
  try {
    return { 본문: 가리기(번호, 계획, 자리, 본문, 비밀) };
  } catch (err) {
    // 까닭에는 경로만 든다 — 값은 파일 안에만 있다
    return { 사유: `비밀번호를 가리지 못했다: ${err instanceof Error ? err.message : String(err)}` };
  }
}

function 가리기(번호: number, 계획: 읽을자료[], 자리: 사본, 본문: string | null, 비밀: string): string | null {
  for (const 원본 of 지울원본(계획)) rmSync(원본, { force: true });
  let 수 = 폴더가리기(자리.자료, realpathSync(자리.자료), 비밀);
  // 트리는 앞 실행이 바꾼 것만 — 커밋된 파일을 다시 쓰면 PR 에 관계없는 수정이 섞인다 (2026-09-29 검사)
  const 상태 = 친다('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '-uall'], 자리.트리, undefined, 120_000, {
    env: 사본환경(자리),
  });
  if (!상태.ok) throw new Error(`바뀐 파일을 못 읽었다: ${상태.까닭}`);
  const 트리울타리 = realpathSync(자리.트리);
  for (const f of 가릴트리파일(바뀐파일들(상태.낸것))) 수 += 파일가리기(join(자리.트리, f), 트리울타리, 비밀);
  if (수 > 0) console.log(`[작성] ${번호}번 — 비밀번호를 가린 파일 ${수}개`);
  return 본문 === null ? null : 비밀가리기(본문, 비밀);
}
