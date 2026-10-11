// 알림의 「읽음」을 이 브라우저에만 남기는 자리 (SPEC 공통/5-화면공통 §8 「알림」)
// 서버는 읽음을 모른다 — 사람마다 · 브라우저마다 따로 읽는다. 열쇠는 `run:{번호}` · `authoring:{번호}` 다

// 한국어 키를 쓰지 않는다. 화면 글자를 세는 그물(`messages.test.ts`)이 저장소 키까지 같이 센다
const 저장키 = 'notice-read';

/** 읽음이 바뀌었다는 신호. 같은 탭의 다른 컴포넌트(실행 결과의 완료 상자)가 적어도 알림 줄이 바로 따라오게 한다 */
export const 읽음바뀜 = 'notice-read-change';

export function 읽음들(): Set<string> {
  try {
    const 값 = localStorage.getItem(저장키);
    const 목록: unknown = 값 === null ? [] : JSON.parse(값);
    return new Set(Array.isArray(목록) ? 목록.filter((것): 것 is string => typeof 것 === 'string') : []);
  } catch {
    // 비공개 창에서는 접근이 던진다. 읽음을 못 남길 뿐 알림은 떠야 한다
    return new Set();
  }
}

function 쓴다(것들: ReadonlySet<string>): void {
  try {
    localStorage.setItem(저장키, JSON.stringify([...것들]));
  } catch {
    // 위와 같다 — 다시 열면 또 안 읽은 것으로 보일 뿐이다
  }
}

export function 읽음으로적는다(열쇠들: readonly string[]): void {
  const 것들 = 읽음들();
  for (const 열쇠 of 열쇠들) 것들.add(열쇠);
  쓴다(것들);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(읽음바뀜));
}

/**
 * 서버 목록(최근 7일)에 없는 열쇠를 지운다 — 읽음 목록이 끝없이 커지지 않게.
 * 바뀐 게 없으면 쓰지 않는다
 */
export function 읽음정리(남길: ReadonlySet<string>): void {
  const 것들 = 읽음들();
  const 남은것 = new Set([...것들].filter((열쇠) => 남길.has(열쇠)));
  if (남은것.size !== 것들.size) 쓴다(남은것);
}
