// 입력 — 폰 키 · 포커스 칸에 치기 · 칸 비우기 · 클립보드 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-07)
// 입력칸의 완료 · 검색은 키보드완료, 뒤로는 driver.back() 그대로다. 날짜 · 숫자 고르개는 요소안에서밀기 와 누르기로 쓴다

import type { AppDriver } from './app.js';
import type { 앱요소 } from './appParts.js';
import { 네이티브전용 } from './webview.js';

export type 폰키 = '홈' | '최근 앱' | '지우기' | '탭' | '붙여 넣기';
/** Android keycode — appium-cli press 와 같은 표라 CLI 로 미리 누른 키를 케이스가 그대로 되풀이한다 */
const 키코드: Record<폰키, number> = { 홈: 3, '최근 앱': 187, 지우기: 67, 탭: 61, '붙여 넣기': 279 };

/** 폰 키를 한 번 누른다 — 지우기는 포커스 칸의 글을 한 자 지우고, 붙여 넣기는 클립보드 글을 포커스 칸에 넣는다 */
export async function 키누르기(driver: AppDriver, 키: 폰키): Promise<void> {
  네이티브전용(driver, '키누르기');
  // 오타는 폰에 보내기 전에 막는다 — 타입을 우회한 값이 엉뚱한 키로 가지 않게
  if (!Object.hasOwn(키코드, 키)) throw new Error(`키누르기 — 키는 ${Object.keys(키코드).join(' · ')} 이다: ${String(키)}`);
  await driver.execute('mobile: pressKey', { keycode: 키코드[키] });
}

/**
 * 포커스가 있는 칸에 키를 하나씩 친다 — 인증번호 여섯 칸처럼 칠 때마다 다음 칸으로 넘어가는 화면 · 앱이 그린 키패드.
 * 칸을 먼저 누른다. 한 칸에 통째로 넣는 것은 칸에적기 다
 */
export async function 포커스칸에치기(driver: AppDriver, 글: string): Promise<void> {
  네이티브전용(driver, '포커스칸에치기');
  if (글 === '') throw new Error('포커스칸에치기 — 칠 글이 비었다');
  // UiAutomator2 는 보냈으면 true, 못 보냈으면 false 를 준다 — true 가 아니면 조용히 넘기지 않는다(빈 칸으로 다음 단계가 돈다)
  if ((await driver.execute('mobile: type', { text: 글 })) !== true) throw new Error('포커스칸에치기 — 폰이 글을 받지 않았다. 칸을 먼저 눌러 포커스를 준다');
}

/** 칸의 글을 지운다 — 지운 뒤 빈 칸인지는 케이스가 verify 로 본다 */
export async function 칸비우기(칸: 앱요소): Promise<void> {
  await 칸.clearValue();
}

/** 클립보드 글 — 복사 단추를 누른 뒤 무엇이 복사됐는지. 웹뷰 구간 안에서도 부른다(UiAutomator2 는 웹 맥락의 mobile: 명령도 직접 받는다) */
export async function 클립보드읽기(driver: AppDriver): Promise<string> {
  const 읽은 = await driver.execute('mobile: getClipboard', {});
  // 글이 아닌 답을 base64 로 풀면 엉뚱한 글이 되어 판정이 헷갈린다
  if (typeof 읽은 !== 'string') throw new Error(`클립보드읽기 — 폰이 클립보드 글 대신 다른 것을 줬다: ${JSON.stringify(읽은)}`);
  return Buffer.from(읽은, 'base64').toString('utf8');
}

/** 클립보드에 글을 넣는다 — 붙여 넣기 케이스의 준비. 팜은 폰을 놓을 때 클립보드를 비우지만 잡은 동안은 남아, 복사 단추를 보는 케이스는 누르기 전에 다른 글을 넣어 둔다(tpx-author app.md §3) */
export async function 클립보드쓰기(driver: AppDriver, 글: string): Promise<void> {
  await driver.execute('mobile: setClipboard', { content: Buffer.from(글, 'utf8').toString('base64'), contentType: 'plaintext' });
}
