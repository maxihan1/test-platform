import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-257',
  name: '멘션 알림은 글 카드 위 줄 「멘션」(내 글에 대한 답이면 「답장」, 개인이면 「개인 멘션」 · 「개인 답변」)이고 누르면 글 상세가 열린다',
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
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('알림 「멘션」 탭에서 멘션 알림을 누른다', async () => {
    try {
      await 알림.열기();
      await 알림.멘션탭열기();
      const 판정1 = await verify('알림 카드 위 줄 「멘션」이 보인다', await 알림.줄글에있나('멘션'), true);
      const 판정2 = await verify('알림 카드 위 줄 「답장」이 보인다', await 알림.줄글에있나('답장'), true);
      const 판정3 = await verify('알림 카드 위 줄 「개인 멘션」이 보인다', await 알림.줄글에있나('개인 멘션'), true);
      await 알림.글누르기('지난번에 말한 테스트 도구');
      const 판정4 = await verify('멘션 알림을 누르면 글 상세가 열린다', await 알림.글상세떴나(), true);
      await verify('멘션 알림은 글 카드 위 줄 「멘션」(내 글에 대한 답이면 「답장」, 개인이면 「개인 멘션」 · 「개인 답변」)이고 누르면 글 상세가 열린다', 판정1 && 판정2 && 판정3 && 판정4, true);
    } finally {
      await 뒤로(driver);
      await 알림.모든것탭열기();
    }
  }, { capture: true });
});
