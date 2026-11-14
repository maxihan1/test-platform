import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자들, 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-320',
  name: '첫 고정 글이 「Pinned」와 함께 맨 위에 보이고 고정 글이 둘 이상이면 「View all pinned posts」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필열기(driver, 'hana_photo');
    const 판정1 = await verify('맨 위 고정 글에 「Pinned」가 보인다', (await 글자들(driver, 프로필.배지들)).includes('Pinned'), true);
    const 판정2 = await verify('「View all pinned posts」 글자가 보인다', await 문구가보이나(driver, 'View all pinned posts'), true);
    await verify('첫 고정 글이 「Pinned」와 함께 맨 위에 보이고 고정 글이 둘 이상이면 「View all pinned posts」가 보인다', 판정1 && 판정2, true);
  }, { capture: true });
});
