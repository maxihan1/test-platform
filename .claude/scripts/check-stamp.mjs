// 같은 커밋의 검사 통과를 git 폴더에 표지로 남기고, 올릴 커밋에서 건너뛸 검사를 판정한다
//
// 쓰는 법
//   check-stamp.mjs find [커밋]       `stamp=… kinds=… delta=…` 와 `reuse=<all|tests|none>` 두 줄. 늘 종료 0
//   check-stamp.mjs put push <커밋>   pre-push 훅 전용. 스킬이 이 명령으로 찍는 길은 없다
// 표지가 틀리면 검사 없이 코드가 들어가므로, 확신이 없으면 어디서든 none 이고 표지를 남기지 않는다.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lane } from './lane.mjs';

/** 차이: same(0개) · docs · spec · cases · full. all = 단위 테스트와 기록 확인까지, tests = 단위 테스트만 건너뛴다 */
export function 재사용(종류들, 차이) {
  if (차이 === 'same' || 차이 === 'docs') {
    if (종류들.includes('push')) return 'all';
    if (종류들.includes('local')) return 'tests';
  }
  if (차이 === 'spec' && 종류들.some((k) => k === 'push' || k === 'local')) return 'tests';
  return 'none';
}

/** `git status --porcelain --no-renames` 줄들이 전부 문서 자리일 때만 깨끗하다. 따옴표 친 경로는 못 읽으므로 더러움 */
export function 깨끗한가(상태줄들) {
  return 상태줄들.every((줄) => {
    const 경로 = 줄.slice(3);
    if (경로.startsWith('"')) return false;
    return ['docs', 'spec'].includes(lane([경로]));
  });
}

const git = (...인자) => execFileSync('git', ['-c', 'core.quotePath=false', ...인자], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const 표지폴더 = () => join(git('rev-parse', '--path-format=absolute', '--git-common-dir').trim(), 'tpx-checks');
const 종류읽기 = (sha) => {
  const 파일 = join(표지폴더(), sha);
  return existsSync(파일) ? readFileSync(파일, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean) : [];
};
const 해석 = (이름) => git('rev-parse', '--verify', '--quiet', `${이름}^{commit}`).trim();

/** origin/main..대상 을 새 것부터 거슬러 첫 표지 커밋을 찾는다 */
function 찾기(대상) {
  const c = git('rev-list', `origin/main..${대상}`).split('\n').filter(Boolean).find((sha) => 종류읽기(sha).length > 0);
  if (!c) return { stamp: 'none', kinds: [], delta: 'none', reuse: 'none' };
  const 종류들 = 종류읽기(c);
  const 파일들 = git('diff', '--no-renames', '--name-only', c, 대상).split('\n').map((l) => l.trim()).filter(Boolean);
  const delta = 파일들.length === 0 ? 'same' : lane(파일들);
  return { stamp: c, kinds: 종류들, delta, reuse: 재사용(종류들, delta) };
}

function find(이름 = 'HEAD') {
  let r = { stamp: 'none', kinds: [], delta: 'none', reuse: 'none' };
  try {
    r = 찾기(해석(이름));
  } catch (e) {
    console.error(`[check-stamp] 표지를 못 찾았다 — none 으로 간다: ${e.message.split('\n')[0]}`);
  }
  console.log(`stamp=${r.stamp} kinds=${r.kinds.join(',') || 'none'} delta=${r.delta}`);
  console.log(`reuse=${r.reuse}`);
}

/** 표지를 남기지 않을 이유를 돌려준다. 없으면 null */
function 안남길이유(sha) {
  if (process.env.ALLOW_PROTECTED === '1') return 'ALLOW_PROTECTED=1 길은 표지를 남기지 않는다';
  // 훅은 HEAD 의 작업 폴더를 검사한다 — 다른 커밋에 찍으면 검사하지 않은 것에 도장이 찍힌다
  if (sha !== git('rev-parse', 'HEAD').trim()) return '대상 커밋이 HEAD 가 아니다';
  // 새 문서 폴더가 `?? docs/` 한 줄로 접히면 안의 파일을 못 봐서 문서도 더러움이 된다 — 파일 단위로 펼친다
  const 줄들 = git('status', '--porcelain', '--no-renames', '--untracked-files=all').split('\n').filter(Boolean);
  if (!깨끗한가(줄들)) return '커밋 안 된 코드가 작업 폴더에 있다';
  return null;
}

function put(종류, 이름) {
  try {
    const sha = 해석(이름);
    const 이유 = 안남길이유(sha);
    if (이유) return console.log(`[check-stamp] 표지를 남기지 않는다 — ${이유}`);
    if (종류읽기(sha).includes(종류)) return;
    mkdirSync(표지폴더(), { recursive: true });
    appendFileSync(join(표지폴더(), sha), `${종류}\n`);
    console.log(`[check-stamp] ${종류} 표지를 남겼다: ${sha}`);
  } catch (e) {
    console.log(`[check-stamp] 표지를 남기지 못했다 — ${e.message.split('\n')[0]}`);
  }
}

function 직접불렸나() {
  try {
    return realpathSync.native(fileURLToPath(import.meta.url)) === realpathSync.native(process.argv[1] ?? '');
  } catch {
    return false;
  }
}

if (직접불렸나()) {
  const [명령, a, b] = process.argv.slice(2);
  if (명령 === 'find') find(a);
  else if (명령 === 'put' && a === 'push' && b) put('push', b);
  else console.error('쓰는 법: check-stamp.mjs find [커밋] | put push <커밋>');
}
