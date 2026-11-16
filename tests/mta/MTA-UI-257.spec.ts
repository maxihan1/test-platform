import { defineCase, test, verify } from '@platform/kit';
import { 먼저뜨는것, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-257',
  name: '멘션 알림 글 카드 위에 「멘션」 · 「답장」 · 「개인 멘션」 · 「개인 답변」 가운데 하나가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    멘션: z.string().describe('멘션 알림 구분 글').default('멘션'),
    답장: z.string().describe('답장 알림 구분 글').default('답장'),
    개인멘션: z.string().describe('개인 멘션 알림 구분 글').default('개인 멘션'),
    개인답변: z.string().describe('개인 답변 알림 구분 글').default('개인 답변'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('「멘션」 탭의 멘션 알림을 확인한다', async () => {
    await 알림.멘션탭누르기();
    await verify('멘션 알림 글 카드가 보인다', await 뜰때까지(driver, 알림.글카드답장, 15_000), true, { blocker: true });
    const 뜬것 = await 먼저뜨는것(
      driver,
      {
        멘션: 알림.멘션라벨(expected.멘션),
        답장: 알림.멘션라벨(expected.답장),
        개인멘션: 알림.멘션라벨(expected.개인멘션),
        개인답변: 알림.멘션라벨(expected.개인답변),
      },
      15_000,
    );
    await verify('멘션 알림 글 카드 위에 「멘션」 · 「답장」 · 「개인 멘션」 · 「개인 답변」 가운데 하나가 보인다', 뜬것 !== undefined, true);
  });
});
