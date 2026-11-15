import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-253',
  name: '팔로우 요청 알림에 「님이 나에게 팔로우 요청을 보냄」과 「확정」 · 「삭제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    요청글: z.string().describe('팔로우 요청 알림 글').default('님이 나에게 팔로우 요청을 보냄'),
    확정: z.string().describe('확정 버튼 글자').default('확정'),
    삭제: z.string().describe('삭제 버튼 글자').default('삭제'),
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

  await test.step('req_yoon 의 팔로우 요청 알림을 찾는다', async () => {
    const 요청 = await verify('팔로우 요청 알림이 보인다', await 뜰때까지(driver, 알림.목록글자포함(expected.요청글), 15_000), true);
    const 확정 = await verify('확정 버튼 글자가 기대값과 같다', await driver.$(알림.확정버튼).getText(), expected.확정);
    const 삭제 = await verify('삭제 버튼 글자가 기대값과 같다', await driver.$(알림.삭제버튼).getText(), expected.삭제);
    await verify('팔로우 요청 알림에 「님이 나에게 팔로우 요청을 보냄」과 「확정」 · 「삭제」가 보인다', 요청 && 확정 && 삭제, true);
  });
});
