// 알림의 「읽음」을 이 브라우저에만 남기는 자리 (SPEC 공통/5-화면공통 §8 「알림」)
// 서버는 읽음을 모른다 — 사람마다 · 브라우저마다 따로 읽는다. 열쇠는 `run:{번호}` · `authoring:{번호}` 다

// 한국어 키를 쓰지 않는다. 화면 글자를 세는 그물(`messages.test.ts`)이 저장소 키까지 같이 센다
const 저장키 = 'notice-read';

/** 읽음이 바뀌었다는 신호. 같은 탭의 다른 컴포넌트(실행 결과의 완료 상자)가 적어도 알림 줄이 바로 따라오게 한다 */
export const 읽음바뀜 = 'notice-read-change';

/** 열쇠 → 적은 시각(ms). 서버 목록(최근 7일)보다 조금 더 오래 두려고 8일이 지난 것만 정리한다 */
const 보관일 = 8 * 86_400_000;

type 기록 = Record<string, number>;

function 쓴다(것들: 기록): void {
  try {
    localStorage.setItem(저장키, JSON.stringify(것들));
  } catch {
    // 비공개 창에서는 접근이 던진다. 다시 열면 또 안 읽은 것으로 보일 뿐이다
  }
}

function 기록읽기(): 기록 {
  try {
    const 값 = localStorage.getItem(저장키);
    const 목록: unknown = 값 === null ? {} : JSON.parse(값);
    if (Array.isArray(목록)) {
      // 옛 꼴(열쇠 배열)은 지금 시각으로 옮겨 적는다 — 안 적으면 읽을 때마다 시각이 새로 돼 영영 정리되지 않는다
      const 지금 = Date.now();
      const 옮김: 기록 = {};
      for (const 것 of 목록) if (typeof 것 === 'string') 옮김[것] = 지금;
      쓴다(옮김);
      return 옮김;
    }
    if (typeof 목록 !== 'object' || 목록 === null) return {};
    return Object.fromEntries(Object.entries(목록).filter((쌍): 쌍 is [string, number] => typeof 쌍[1] === 'number'));
  } catch {
    // 비공개 창에서는 접근이 던진다. 읽음을 못 남길 뿐 알림은 떠야 한다
    return {};
  }
}

export function 읽음들(): Set<string> {
  return new Set(Object.keys(기록읽기()));
}

export function 읽음으로적는다(열쇠들: readonly string[]): void {
  const 것들 = 기록읽기();
  const 지금 = Date.now();
  for (const 열쇠 of 열쇠들) 것들[열쇠] = 지금;
  쓴다(것들);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(읽음바뀜));
}

/**
 * 서버 목록(최근 7일)에 없고 적은 지 8일이 지난 열쇠를 지운다 — 읽음 목록이 끝없이 커지지 않게.
 * 목록에 없다는 이유만으로 지우면, 그 응답이 출발한 뒤에 적은 읽음(막 끝난 실행의 결과 모달)을 늦게 온 응답이 지운다.
 * 바뀐 게 없으면 쓰지 않는다
 */
export function 읽음정리(남길: ReadonlySet<string>, 지금 = Date.now()): void {
  const 것들 = 기록읽기();
  const 남은것 = Object.fromEntries(Object.entries(것들).filter(([열쇠, 때]) => 남길.has(열쇠) || 지금 - 때 <= 보관일));
  if (Object.keys(남은것).length !== Object.keys(것들).length) 쓴다(남은것);
}
