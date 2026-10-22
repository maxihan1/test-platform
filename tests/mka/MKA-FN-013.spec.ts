import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-013',
  name: '로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다',
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다', '일반 회원으로 로그인해 상품 목록에 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 떴는지 확인한다', async () => {
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 기기의 뒤로 가기를 누른다', async () => {
    await 로그인.뒤로가기();
    await verify('로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', await 로그인.앱이닫힐때까지(), true);
  }, { capture: true });

  await test.step('앱을 다시 켜고 일반 회원 계정으로 로그인한다', async () => {
    await 로그인.앱다시켜기();
    await 로그인.로그인버튼보일때까지();
    await 로그인.로그인(계정.loginId, 계정.password);
  });

  await test.step('로그인해 상품 목록으로 갔는지 확인한다', async () => {
    await verify('로그인 화면이 사라진다', await 로그인.로그인화면사라질때까지(), true, { blocker: true });
  });

  await test.step('상품 목록에서 기기의 뒤로 가기를 누른다', async () => {
    await 로그인.뒤로가기();
    await verify('상품 목록에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', await 로그인.앱이닫힐때까지(), true);
  }, { capture: true });
});
