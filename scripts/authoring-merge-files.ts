// 작성 에이전트가 병합 직전에 PR 의 바뀐 파일을 어떻게 읽는지 정하는 순수 함수

/**
 * 병합 직전에 PR 이 실제로 바꾼 파일. 올릴 때 판정했어도 그 뒤 누가 브랜치에 더 얹었을 수 있다.
 * `gh pr diff --name-only` 는 300 개를 넘으면 HTTP 406 이고(2026-10-07 #144) 이름 바꾼 파일은 새 이름만 준다 —
 * 코드 파일을 tests/ 로 옮긴 PR 이 「테스트만」으로 통과한다. 파일 API 는 옛 경로(`previous_filename`)도 준다.
 * 주소가 PR 로 끝나지 않으면 인자를 안 만든다 — 뒤에 붙은 것이 API 경로에 섞인다
 */
export function PR파일인자(prUrl: string): string[] | null {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)$/.exec(prUrl);
  if (m === null) return null;
  return [
    'api',
    '--paginate',
    `repos/${m[1]}/${m[2]}/pulls/${m[3]}/files?per_page=100`,
    '--jq',
    '.[] | [.filename, (.previous_filename // "")] | @tsv',
  ];
}

/** 줄 하나가 PR 의 파일 하나다(이름 바꾼 것도 한 줄). 판정에는 옛 경로까지 넣는다 — 올리기 전 판정의 `--no-renames` 와 같아진다 */
export function PR파일읽기(낸것: string): { 수: number; 파일들: string[] } {
  const 줄들 = 낸것.split('\n').filter((줄) => 줄 !== '');
  return { 수: 줄들.length, 파일들: 줄들.flatMap((줄) => 줄.split('\t').filter((f) => f !== '')) };
}
