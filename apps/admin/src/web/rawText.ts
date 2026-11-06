// 오류 원문(메시지 + 스택)에서 같은 문장이 겹친 문단을 걷는 함수 — 「원문 보기」가 쓴다

/**
 * 한 줄짜리 문단이 바로 뒤 문단의 첫 줄에 그대로 들어 있으면(메시지 `X` + 스택 `Error: X …`) 앞 한 줄을 뺀다.
 * 뒤 문단이 더 많이 말하고 있어서 그쪽을 남긴다. 여러 줄 문단은 건드리지 않는다
 */
export function 겹침걷기(글: string): string {
  const 문단들 = 글.split('\n\n');
  return 문단들
    .filter((문단, i) => {
      const 다음 = 문단들[i + 1];
      if (다음 === undefined || 문단.includes('\n') || 문단.trim() === '') return true;
      const 다음첫줄 = 다음.split('\n')[0] ?? '';
      return !다음첫줄.includes(문단.trim());
    })
    .join('\n\n');
}
