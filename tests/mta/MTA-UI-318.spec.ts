import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-318',
  name: '프로필 타임라인 머리에 「Posts and boosts」와 필터 버튼(「Show replies」 · 「Show boosts」 체크)이 보인다',
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
    try {
      await 프로필열기(driver, 'hana_photo');
      const 첫제목 = await 프로필.첫글자(프로필.필터제목);
      await 프로필.필터열기();
      const 필터항목 = await 프로필.메뉴.항목글자();
      const 판정1 = await verify('프로필 타임라인 머리에 「Posts and boosts」가 보인다', 첫제목, 'Posts and boosts');
      const 판정2 = await verify('필터 메뉴에 「Show replies」 체크가 보인다', 필터항목.includes('Show replies'), true);
      const 판정3 = await verify('필터 메뉴에 「Show boosts」 체크가 보인다', 필터항목.includes('Show boosts'), true);
      await verify('프로필 타임라인 머리에 「Posts and boosts」와 필터 버튼(「Show replies」 · 「Show boosts」 체크)이 보인다', 판정1 && 판정2 && 판정3, true);
    } finally {
      await 뒤로(driver);
    }
  }, { capture: true });
});
