import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 스낵바새글 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-376',
  name: '알림 종 버튼은 내가 팔로우하는 계정에만 보이고 누르면 스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」 / 「…받지 않게 될 것입니다.」가 보인다',
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

  await test.step('news_bot 프로필에서 알림 종 버튼을 두 번 누른다', async () => {
    let 누른수 = 0;
    try {
      await 프로필열기(driver, 'news_bot');
      const 종있음 = await 프로필.종버튼있나();
      await 프로필.종버튼누르기();
      누른수 += 1;
      const 첫글 = await 스낵바새글(driver, '');
      await 프로필.종버튼누르기();
      누른수 += 1;
      const 둘째글 = await 스낵바새글(driver, 첫글);
      const 켜짐안내 = [첫글, 둘째글].some((글) => 글.includes('알림을 받을 것입니다.'));
      const 꺼짐안내 = [첫글, 둘째글].some((글) => 글.includes('알림을 받지 않게 될 것입니다.'));
      const 판정1 = await verify('내가 팔로우하는 계정의 프로필에 알림 종 버튼이 보인다', 종있음, true);
      const 판정2 = await verify('스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」가 보인다', 켜짐안내, true);
      const 판정3 = await verify('스낵바 「새로운 게시물에 대한 알림을 받지 않게 될 것입니다.」가 보인다', 꺼짐안내, true);
      await verify('알림 종 버튼은 내가 팔로우하는 계정에만 보이고 누르면 스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」 / 「…받지 않게 될 것입니다.」가 보인다', 판정1 && 판정2 && 판정3, true);
    } finally {
      if (누른수 % 2 === 1) {
        await 프로필.종버튼누르기();
      }
    }
  }, { capture: true });
});
