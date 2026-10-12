import type { APIRequestContext } from '@playwright/test';

import { 새회원으로로그인, 탈퇴, 회원가입 } from './account.helper.js';
import type { 회원정보 } from './account.helper.js';
import { 장바구니에상품담기 } from './common-tools.helper.js';
import { 주문만들기 } from './order-tools.helper.js';
import { 장바구니보기, 주문취소, 주문하기 } from './shop.helper.js';

export interface 주문있는회원 {
  정보: 회원정보;
  주문번호들: string[];
}

export async function 주문있는임시회원(api: APIRequestContext, 주문수 = 1): Promise<주문있는회원> {
  const 정보 = await 새회원으로로그인(api);
  const 주문번호들: string[] = [];
  for (let 번째 = 0; 번째 < 주문수; 번째 += 1) 주문번호들.push((await 주문만들기(api)).주문번호);
  return { 정보, 주문번호들 };
}

export async function 상품둘을한번에주문한임시회원(api: APIRequestContext): Promise<주문있는회원> {
  const 정보 = await 새회원으로로그인(api);
  await 장바구니에상품담기(api, 2);
  const 줄들 = await 장바구니보기(api);
  const { id } = await 주문하기(api, 줄들.map((줄) => 줄.id));
  return { 정보, 주문번호들: [id] };
}

export async function 임시회원정리(api: APIRequestContext, 주문번호들: string[]): Promise<void> {
  for (const 번호 of 주문번호들) await 주문취소(api, 번호);
  await 탈퇴(api);
}

export async function 관리자인가(api: APIRequestContext): Promise<boolean> {
  const 응답 = await api.get('/api/admin/users');
  return 응답.ok();
}

export async function 잠긴임시회원(api: APIRequestContext): Promise<회원정보> {
  const 정보 = await 회원가입(api);
  for (let 번째 = 0; 번째 < 5; 번째 += 1) await api.post('/api/auth/login', { data: { loginId: 정보.loginId, password: 'Wrong1234!', remember: false } });
  return 정보;
}
