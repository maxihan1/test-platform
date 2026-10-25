import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기뒤로가기, 앱이닫혔나, 앱켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-013',
  name: '로그인 화면과 상품 목록에서 기기의 뒤로 가기를 누르면 앱이 닫힌다',
  platforms: ['android'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다', '일반 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 기기의 뒤로 가기를 누른다', async () => {
    await 기기뒤로가기(driver);
    await verify('로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', await 앱이닫혔나(driver), true);
  });

  await test.step('앱을 다시 켜고 일반 회원으로 로그인한다', async () => {
    await 앱켜기(driver);
    await 로그인.로그인하기(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인해 로그인 화면이 닫혔는지 확인한다', async () => {
    await verify('로그인 화면이 닫힌다', await 로그인.닫혔나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 기기의 뒤로 가기를 누른다', async () => {
    await 기기뒤로가기(driver);
    await verify('상품 목록에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', await 앱이닫혔나(driver), true);
  });
});
