import { 로그인화면 } from '../pages/login.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import type { 앱 } from './app.helper.js';

export async function 로그인하기(driver: 앱, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  const 로그인 = new 로그인화면(driver);
  const 목록 = new 상품목록화면(driver);
  const 닫기 = driver.$('id=dialog_cancel');
  const 뒤로 = driver.$('id=back_button');
  await driver.waitUntil(
    async () => {
      if ((await 로그인.보이나()) || (await 목록.로그아웃버튼.isDisplayed())) return true;
      if (await 닫기.isDisplayed()) await 닫기.click();
      else if (await 뒤로.isDisplayed()) await 뒤로.click();
      return false;
    },
    { timeout: 30000, interval: 500, timeoutMsg: '30초 안에 로그인 화면이나 상품 목록으로 돌아오지 못했다' },
  );
  if (await 목록.로그아웃버튼.isDisplayed()) {
    if (process.env.PLATFORM_SCENARIO_MODE === '1' && 아이디 !== undefined && 로그인화면.들어온아이디() === 아이디) {
      await 목록.열릴때까지();
      return;
    }
    await 목록.로그아웃누르기();
  }
  await 로그인.열릴때까지();
  await 로그인.로그인(아이디 ?? '', 비밀번호 ?? '');
  await 목록.열릴때까지();
}
