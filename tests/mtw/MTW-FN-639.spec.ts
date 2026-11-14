import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션만들기화면 } from './pages/collection-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-639',
  name: '컬렉션 이름을 비우고 「계속」을 누르면 둘째 단계로 가지 않는다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 컬렉션만들기화면(page);

  await test.step('일반 회원으로 로그인하고 새 컬렉션 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('새 컬렉션 화면에 「새 컬렉션」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
  });

  await test.step('새 컬렉션 첫 단계에서 이름을 비우고 「계속」을 누른다', async () => {
    const 계속있음 = await 화면.계속.waitFor({ timeout: 5_000 }).then(() => true, () => false);
    await verify('새 컬렉션 첫 단계에 「계속」이 보인다', 계속있음, true);
    if (계속있음) await 화면.계속.click();
    const 둘째 = 계속있음 && (await 화면.기본정보.waitFor({ timeout: 5_000 }).then(() => true, () => false));
    await verify('컬렉션 이름을 비우고 「계속」을 누르면 둘째 단계로 가지 않는다', 둘째, false);
  });
});
