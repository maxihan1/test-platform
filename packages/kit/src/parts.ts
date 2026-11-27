// 서비스 도우미 · 화면 객체가 값으로 가져올 수 있는 kit 의 유일한 입구 — 공용 부품만 둔다 (공통/2-명세선언 「Page Object 파일」 가져오기 제한)
// 판정(verify) · 절차(test · test.step) · 선언(defineCase)을 여기로 내보내지 않는다 — 도우미에 판정을 숨길 길이 생기고 E2E 「만들기」 판별이 그 금지를 믿는다

export {
  권한상태에서,
  권한창답하기,
  글자들,
  길게누르기,
  될때까지,
  두번누르기,
  뜰때까지,
  먼저뜨는것,
  보이나,
  사라질때까지,
  스크롤해서찾기,
  알림창열기,
  앱다시켜기,
  움직이는화면에서,
  칸에적기,
  키보드완료,
  토스트글,
  type 권한답,
  type 바꿀권한,
  type 앱요소,
} from './runtime/appParts.js';
export { 끌어놓기, 벌리기, 오므리기, 요소안에서밀기, 요소위에그리기, type 미는방향, type 요소안점 } from './runtime/gestureParts.js';
export { 칸비우기, 클립보드쓰기, 클립보드읽기, 키누르기, 포커스칸에치기, type 폰키 } from './runtime/inputParts.js';
export { 딥링크열기, 뒤로보냈다오기, 앱다시깔기, 앱비우기, 옛판에서올리기, 인자로켜기, 화면껐다켜기, type 실행인자 } from './runtime/lifecycleParts.js';
export { type 손 as 게임손, type 판상태 as 게임판상태 } from './gameplay/follow.js';
export { 순서대로, type 순서자료 } from './gameplay/play.js';
export { 폰파일있나 } from './runtime/phoneMedia.js';
export { 폰상태에서, 폰시각, type 폰상태 } from './runtime/phoneState.js';
export { 웹뷰에서 } from './runtime/webview.js';
export { 로그인이어쓰기, type 로그인이어쓰기설정 } from './runtime/webParts.js';
