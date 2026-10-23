// 지도 주소 틀을 러너 무늬로 바꾸는 순수 함수 — 서버 값 연결 제안과 화면 「요청 고르기」가 같이 쓴다 (도메인/시나리오 §3.7 결정 15)
// linkSuggest.ts 에 두면 화면 번들이 DB 모듈까지 끌고 와 vite 빌드가 깨진다

/**
 * 지도의 주소 틀(`:n` · `:id`)을 러너가 맞추는 glob 으로. 러너가 `*` 는 한 칸(`[^/]*`)으로 맞추고 `**` 로 시작하면 호스트를 가린다
 * (apps/runner/scenario/links.ts `globToRegexPattern`). 호스트가 달라도 맞게 `**` 를 앞에 붙인다
 */
export function 무늬로(path: string): string {
  // 지도의 주소는 물음표 뒤를 뗐다. 러너 무늬는 끝까지 맞춰야 해서 `?page=1` 이 붙은 요청도 맞게 물음표 꼬리를 열어 둔다
  return `**${path.replace(/:(?:n|id)(?=\/|$)/g, '*')}{,?*}`;
}
