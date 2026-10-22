import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기, 앱이닫혔나 } from './helpers/app.helper.js';
import { 기기뒤로가기 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-013',
  name: '로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 기기의 뒤로 가기를 누른다', async () => {
    await 기기뒤로가기(driver);
    await verify('로그인 화면에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', await 앱이닫혔나(driver), true);
  });

  await test.step('앱을 다시 켜고 일반 회원으로 로그인한다', async () => {
    await 앱다시켜기(driver);
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, {
      blocker: true,
    });
  });

  await test.step('상품 목록에서 기기의 뒤로 가기를 누른다', async () => {
    await 기기뒤로가기(driver);
    await verify('상품 목록에서 기기의 뒤로 가기를 누르면 앱이 닫힌다', await 앱이닫혔나(driver), true);
  });
});
