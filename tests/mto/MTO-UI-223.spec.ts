import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 팔로우추천화면 } from './pages/follow-recommendations.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-223',
  name: '팔로우 추천 화면에 「활성」 · 「숨겨짐」과 「팔로우 추천 숨기기」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 추천 = new 팔로우추천화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「팔로우 추천」 화면을 연다', async () => {
    await 추천.열기();
    const 활성 = await verify('「활성」이 보인다', await 추천.활성.isVisible(), true);
    const 숨겨짐 = await verify('「숨겨짐」이 보인다', await 추천.숨겨짐.isVisible(), true);
    const 숨기기 = await verify('「팔로우 추천 숨기기」가 보인다', await 추천.추천숨기기.isVisible(), true);
    await verify('팔로우 추천 화면에 「활성」 · 「숨겨짐」과 「팔로우 추천 숨기기」가 보인다', 활성 && 숨겨짐 && 숨기기, true);
  });
});
