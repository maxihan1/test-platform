import { 로그인화면 } from '../pages/login.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import type { 앱 } from './app.helper.js';

let 들어온아이디: string | undefined;

export async function 로그인하기(driver: 앱, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  const 로그인 = new 로그인화면(driver);
  const 목록 = new 상품목록화면(driver);
  const 뒤로 = driver.$('id=back_button');
  await driver.waitUntil(async () => (await 로그인.보이나()) || (await driver.$('id=screen_title').isDisplayed()), {
    timeout: 30000,
    timeoutMsg: '앱 화면이 30초 안에 뜨지 않았다',
  });
  for (let 번 = 0; 번 < 8 && (await 뒤로.isDisplayed()); 번 += 1) await 뒤로.click();
  if (await 목록.로그아웃버튼.isDisplayed()) {
    if (process.env.PLATFORM_SCENARIO_MODE === '1' && 들어온아이디 !== undefined && 들어온아이디 === 아이디) {
      await 목록.열릴때까지();
      return;
    }
    await 목록.로그아웃누르기();
  }
  들어온아이디 = undefined;
  await 로그인.열릴때까지();
  await 로그인.로그인(아이디 ?? '', 비밀번호 ?? '');
  await 목록.열릴때까지();
  들어온아이디 = 아이디;
}
