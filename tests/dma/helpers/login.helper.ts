import { 로그인화면 } from '../pages/login.page.js';
import { 상품목록화면 } from '../pages/product-list.page.js';
import type { 앱 } from './app.helper.js';

export async function 로그인하기(driver: 앱, 아이디: string | undefined, 비밀번호: string | undefined): Promise<void> {
  const 로그인 = new 로그인화면(driver);
  await 로그인.열릴때까지();
  await 로그인.로그인(아이디 ?? '', 비밀번호 ?? '');
  await new 상품목록화면(driver).열릴때까지();
}
