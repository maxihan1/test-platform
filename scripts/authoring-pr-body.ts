// 작성 PR 본문 조립 — GitHub 상한 안에 맞추되 명세가 싣게 한 셈 머리 · 관문 3 기록 · 단계 시각은 지킨다 (작성 §3.6 · §7)
// 2026-10-03 MKT 11201 이 요구사항 표 117,745자를 통째로 실어 「Body is too long」으로 중단됐다

/**
 * UTF-8 바이트 상한. GitHub 은 65,536자를 받지만 본문은 `gh --body` 인자로 넘어가고
 * Linux 는 인자 하나를 131,072바이트까지만 받는다 — 한글은 3바이트라 글자 수로 세면 서버(author)에서 E2BIG 이 난다.
 * 바이트가 글자 수보다 늘 크거나 같아 둘 다 지켜진다. 반영 때 덧붙는 겹침 처리 줄(최대 200건 · 약 6,000자)이 들어갈 자리를 남긴다
 */
export const 본문상한 = 55_000;

const 크기 = (글: string) => Buffer.byteLength(글, 'utf8');
const 줄임 = '…(줄임)…';
// 글자(코드 포인트) 단위로 잘라 이모지를 반으로 가르지 않는다
const 줄자르기 = (줄: string, 상한: number) => {
  const 자 = Array.from(줄);
  return 자.length > 상한 ? `${자.slice(0, 상한).join('')}${줄임}` : 줄;
};

function 조립(표절: string | null, 요약: string, 단계?: string): string {
  const 절들: string[] = [];
  if (표절 !== null) 절들.push(`## 요구사항 표\n\n${표절}`);
  if (요약.trim() !== '') 절들.push(`## 작성 요약\n\n${요약.trim()}`);
  if (단계?.trim()) 절들.push(`## 단계 시각 (이번 실행)\n\n${단계.trim()}`); // 이어하기는 본문을 갈아 써 앞 실행 표는 로그에만 남는다
  절들.push('관문 3 의 3회 실행 결과가 병합 근거다 — 가벼운 길의 CI 는 새 케이스를 돌리지 않는다.');
  return 절들.join('\n\n');
}

/**
 * 초안 PR 본문. 가벼운 길의 CI 는 새 케이스를 **실행하지 않는다** — 병합 근거는 관문 3 기록이라
 * 그 사실을 본문에 못박는다 (게이트 1 결정). 비밀값은 인자에 없으니 실릴 수가 없다.
 * 넘치면 표 → 요약 가운데 순으로 줄인다. 단계 시각은 수 KB 라 안 뺀다(명세가 싣게 했다)
 */
export function PR본문(입력: { 표경로: string; 표: string; 요약: string; 단계?: string }): string {
  const 표 = 입력.표.trim();
  const 원본 = 조립(표 === '' ? null : 표, 입력.요약, 입력.단계);
  if (크기(원본) <= 본문상한) return 원본;
  const 표절 = 표 === '' ? null : `표는 \`${입력.표경로}\` 에 있다 — ${표.length}자라 본문에 못 싣는다.`;
  const 표뺌 = 조립(표절, 입력.요약, 입력.단계);
  if (크기(표뺌) <= 본문상한) return 표뺌;
  // 머리글(첫 빈 줄 앞 — 셈 · 빠짐 · UI 로만 덮음)은 통째로 둔다. 자식 출력은 줄마다 1,000자로 먼저 자르고 줄 단위로 가운데를 줄인다 —
  // 관문 3 줄 뒤에도 관문 4 · 보류 줄이 와서, 긴 꼬리 줄을 안 자르고 줄 수부터 줄이면 관문 3 기록(병합 근거)이 빠진다
  const 요약 = 입력.요약.trim();
  const 틈 = 요약.indexOf('\n\n');
  const 머리 = 틈 < 0 ? '' : 요약.slice(0, 틈);
  const 줄들 = (틈 < 0 ? 요약 : 요약.slice(틈 + 2)).split('\n').map((l) => 줄자르기(l, 1000));
  const 합쳐 = (남김: string[]) => 조립(표절, [머리, 남김.join('\n')].filter((s) => s !== '').join('\n\n'), 입력.단계);
  let 글 = 합쳐(줄들);
  for (let n = 줄들.length - 1; n >= 1 && 크기(글) > 본문상한; n = Math.floor(n / 2))
    글 = 합쳐([...줄들.slice(0, Math.floor(n / 2)), 줄임, ...줄들.slice(줄들.length - Math.ceil(n / 2))]);
  // ponytail: 그래도 넘으면(머리글 · 단계표가 수만 자) 바이트로 끝을 자른다 — PR 을 못 여는 것보다 낫다. 그런 실행은 아직 없었다
  if (크기(글) > 본문상한) 글 = Buffer.from(글, 'utf8').subarray(0, 본문상한 - 3).toString('utf8').replace(/\uFFFD$/, '') + '…';
  return 글;
}
