// 작성 요청 자료의 피그마 주소 — 받은 주소를 다시 조립해 저장한다 (SPEC 도메인/작성 §7 「자료」)
// routes.ts 가 300줄에 닿아 뗐다 (2026-09-30)

/**
 * 피그마 주소를 **다시 조립해** 돌려준다. 모양이 아니면 null.
 *
 * **통과·거절로 보지 않는다** (2026-09-23 검토가 잡았다). 「Copy link」 주소에는 거의 항상 `&t=…` 가
 * 붙는데, 그 글자를 받으면 맥이 이 주소를 명령줄에 끼울 때 `&` 가 명령 구분자로 산다. 막으면 평범한 링크가 튕긴다.
 * 파일 키와 `node-id` 만 뽑아 새로 지으면 저장값에 셸 특수 글자가 원천적으로 없다.
 * FigJam(`/board`)은 화면 디자인이 아니라 안 받는다 (도메인/작성 §7 「자료」).
 */
export function 피그마주소정규화(주소: unknown): string | null {
  if (typeof 주소 !== 'string') return null;
  let url: URL;
  try {
    url = new URL(주소);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname !== 'figma.com' && url.hostname !== 'www.figma.com') return null;
  const [, 종류, 본키, 갈래, 갈래키] = url.pathname.split('/');
  if (종류 !== 'design' && 종류 !== 'file' && 종류 !== 'proto') return null;
  // 브랜치 링크는 본 파일 키로 줄이면 main 을 읽는다. 브랜치 키가 그 자체로 파일처럼 열린다.
  // 뒤에 키가 없으면 `branch` 는 브랜치가 아니라 파일 제목 조각이다
  const 키 = 갈래 === 'branch' && 갈래키 !== undefined ? 갈래키 : 본키;
  if (키 === undefined || !/^[A-Za-z0-9]{1,64}$/.test(키)) return null;
  const 노드 = url.searchParams.get('node-id');
  if (노드 === null) return `https://www.figma.com/design/${키}/`;
  const 맞음 = /^(\d{1,10})[-:](\d{1,10})$/.exec(노드);
  if (맞음 === null) return null;
  return `https://www.figma.com/design/${키}/?node-id=${맞음[1]}-${맞음[2]}`;
}
