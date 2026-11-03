import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { API로그인, 회원가입 } from './helpers/account.helper.js';
import type { 일회용회원 } from './helpers/account.helper.js';
import { 길이별비밀번호, 세션읽기 } from './helpers/users-flow.helper.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-432',
  name: '새 비밀번호를 7자로 바꾸면 「회원의 비밀번호를 바꿨습니다」 토스트가 뜨지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['관리자 계정으로 로그인해 있고 일회용 회원이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    미달길이: z.number().int().describe('미달 줄의 새 비밀번호 글자 수 — 4~7자').default(7),
    최소길이: z.number().int().describe('하한 줄의 새 비밀번호 글자 수 — 8~20자').default(8),
    최대길이: z.number().int().describe('상한 줄의 새 비밀번호 글자 수 — 8~20자').default(20),
    초과길이: z.number().int().describe('초과 줄의 새 비밀번호 글자 수 — 21~30자').default(21),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 회원 = new 회원관리화면(page);
  const 토스트들 = new 토스트(page);
  let 일회용: 일회용회원;

  const 비밀번호바꾸기 = async (길이: number) => {
    await 토스트들.목록.first().waitFor({ state: 'detached' });
    await 회원.줄버튼(일회용.loginId, '비밀번호 바꾸기').click();
    await 회원.새비밀번호.fill(길이별비밀번호(길이));
    await 회원.바꾸기.click();
    await 토스트들.목록.first().waitFor();
  };

  await test.step('일회용 회원을 만든다', async () => {
    일회용 = await 회원가입(request);
  });

  await test.step('관리자 계정으로 로그인해 있고 일회용 회원이 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 회원.열기();
    await 회원.검색하기(일회용.loginId);
    await verify('일회용 회원 줄이 보인다', await 회원.회원줄(일회용.loginId).count(), 1, { blocker: true });
  });

  await test.step('새 비밀번호를 7자로 적고 「바꾸기」를 누른다', async () => {
    await 비밀번호바꾸기(params.미달길이);
    await verify('새 비밀번호를 7자로 바꾸면 「회원의 비밀번호를 바꿨습니다」 토스트가 뜨지 않는다', await 토스트들.글자('회원의 비밀번호를 바꿨습니다').isVisible(), false);
  });

  await test.step('새 비밀번호를 8자로 적고 「바꾸기」를 누른다', async () => {
    await 비밀번호바꾸기(params.최소길이);
    await verify('새 비밀번호를 8자로 바꾸면 「회원의 비밀번호를 바꿨습니다」 토스트가 뜬다', await 토스트들.글자('회원의 비밀번호를 바꿨습니다').isVisible(), true);
  });

  await test.step('새 비밀번호를 20자로 적고 「바꾸기」를 누른다', async () => {
    await 비밀번호바꾸기(params.최대길이);
    await verify('새 비밀번호를 20자로 바꾸면 「회원의 비밀번호를 바꿨습니다」 토스트가 뜬다', await 토스트들.글자('회원의 비밀번호를 바꿨습니다').isVisible(), true);
  });

  await test.step('새 비밀번호를 21자로 적고 「바꾸기」를 누른다', async () => {
    await 비밀번호바꾸기(params.초과길이);
    await verify('새 비밀번호를 21자로 바꾸면 「회원의 비밀번호를 바꿨습니다」 토스트가 뜨지 않는다', await 토스트들.글자('회원의 비밀번호를 바꿨습니다').isVisible(), false);
  });
});
