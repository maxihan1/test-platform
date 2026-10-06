// 작성 에이전트가 병합 직전에 PR 의 바뀐 파일을 어떻게 읽고 언제 병합을 막는지 정하는 순수 함수
import { 머지거부사유 } from './authoring-chain.js';

/** 파일 API 가 주는 상한(GitHub 문서). 바뀐 파일 수도 여기서 멈추면 둘이 같이 3000 이 되어 대조로 못 잡는다 */
const 목록상한 = 3000;

/**
 * 병합 직전에 PR 이 실제로 바꾼 파일. 올릴 때 판정했어도 그 뒤 누가 브랜치에 더 얹었을 수 있다.
 * `gh pr diff --name-only` 는 300 개를 넘으면 HTTP 406 이고(2026-10-07 #144) 이름 바꾼 파일은 새 이름만 준다 —
 * 코드 파일을 tests/ 로 옮긴 PR 이 「테스트만」으로 통과한다. 파일 API 는 옛 경로(`previous_filename`)도 준다.
 * 주소가 PR 로 끝나지 않으면 인자를 안 만든다 — 뒤에 붙은 것이 API 경로에 섞인다.
 * 호스트는 회사 GitHub(Enterprise)도 받는다 — 서버(`병합주소인가`)가 https 저장소면 호스트를 안 가린다.
 * 호스트 글자는 좁힌다 — `@` · 공백 · 앞 `-` 가 명령 인자로 들어가지 않게
 */
export function PR파일인자(prUrl: string): string[] | null {
  const m = /^https:\/\/([A-Za-z0-9][A-Za-z0-9.-]*(?::\d+)?)\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)$/.exec(prUrl);
  if (m === null) return null;
  return [
    'api',
    '--hostname',
    m[1],
    '--paginate',
    `repos/${m[2]}/${m[3]}/pulls/${m[4]}/files?per_page=100`,
    '--jq',
    '.[] | [.filename, (.previous_filename // "")] | @tsv',
  ];
}

/** 줄 하나가 PR 의 파일 하나다(이름 바꾼 것도 한 줄). 판정에는 옛 경로까지 넣는다 — 올리기 전 판정의 `--no-renames` 와 같아진다 */
export function PR파일읽기(낸것: string): { 수: number; 파일들: string[] } {
  const 줄들 = 낸것.split('\n').filter((줄) => 줄 !== '');
  return { 수: 줄들.length, 파일들: 줄들.flatMap((줄) => 줄.split('\t').filter((f) => f !== '')) };
}

/**
 * 판정 직전에 PR 을 새로 읽는다 — 함수 앞에서 읽은 PR 정보는 보류 빼기 커밋(`반영올리기`) 전 것이라 낡았다.
 * 머리도 같이 읽는다 — 목록을 읽은 뒤 머리가 병합할 커밋과 같아야 그 목록이 병합할 커밋의 것이다
 */
export function PR수인자(prUrl: string): string[] {
  return ['pr', 'view', prUrl, '--json', 'changedFiles,headRefOid', '-q', '[.changedFiles, .headRefOid] | @tsv'];
}

/** 잘린 목록으로 판정하면 뒤쪽 코드 파일을 못 본다. 다 읽었다고 확인될 때만 null */
export function 파일수어긋남(읽은수: number, PR수글: string): string | null {
  if (읽은수 >= 목록상한) return `PR 의 바뀐 파일이 ${목록상한}개 이상이라 목록을 다 못 읽는다 — 맥은 병합하지 않는다`;
  const 글 = PR수글.trim();
  if (/^\d+$/.test(글) && Number(글) === 읽은수) return null;
  return `PR 의 바뀐 파일 수(${글})와 읽은 목록(${읽은수})이 달라 판정하지 않는다 — 맥은 병합하지 않는다`;
}

type 친결과 = { ok: boolean; 낸것: string; 까닭: string };

/**
 * 병합 직전 판정을 한 줄로. 앞 단계가 먼저 걸린다 — main → 목록 → 수 → 머리 → 수 대조 → 테스트만.
 * `머리` 는 병합할 커밋(`--match-head-commit` 에 넣는 것)이다.
 * 목록이 실패면 낸 글자를 읽지 않는다 — `gh api` 실패는 stdout 에 오류 JSON 한 줄을 내서 파일 하나로 세어진다.
 * 목록 · 수 · `테스트만` 은 앞이 다 통과했을 때만 부른다 — 셋 다 동기 호출이라 미리 몰아 치면
 * 그동안 생존 신호(30초)가 끊기고 서버는 3분이면 죽었다고 본다(authoring-heartbeat)
 */
export function 병합직전막힘(입력: {
  메인: { sha: string } | { 까닭: string };
  머리: string;
  목록: () => 친결과;
  수: () => 친결과;
  테스트만: (파일들: string[], 기준: string) => boolean;
}): string | null {
  const { 메인 } = 입력;
  if ('까닭' in 메인) return `최신 main 을 못 받아 판정을 못 했다: ${메인.까닭}`;
  const 목록 = 입력.목록();
  if (!목록.ok) return `PR 의 바뀐 파일을 못 읽었다: ${목록.까닭}`;
  const 수 = 입력.수();
  if (!수.ok) return `PR 의 바뀐 파일 수를 못 읽었다: ${수.까닭}`;
  const [수글 = '', 그때머리 = ''] = 수.낸것.split('\t').map((칸) => 칸.trim());
  if (그때머리 !== 입력.머리) {
    return `PR 머리가 판정 사이에 바뀌었다 (${입력.머리.slice(0, 7)} → ${그때머리.slice(0, 7)}) — 판정하지 않는다`;
  }
  const 읽음 = PR파일읽기(목록.낸것);
  const 어긋남 = 파일수어긋남(읽음.수, 수글);
  if (어긋남 !== null) return 어긋남;
  return 머지거부사유(입력.테스트만(읽음.파일들, 메인.sha), 읽음.파일들);
}
