import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터링된알림화면 } from './pages/notification-requests.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-267',
  name: '알림 요청 화면(제목 「필터링된 알림」) 행마다 아바타 · 이름 · @계정 · 개수 배지와 허용(체크) · 해제(X) 버튼이 보인다',
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
  const 요청 = new 필터링된알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('알림 화면에서 「필터링된 알림」 줄을 누른다', async () => {
    await 알림.열기();
    const 열림 = await 요청.열기();
    const 판정1 = await verify('알림 요청 화면이 열린다', 열림, true);
    const 판정2 = await verify('알림 요청 화면 제목 「필터링된 알림」이 보인다', await 문구가보이나(driver, '필터링된 알림'), true);
    const 판정3 = await verify('행마다 아바타가 보인다', await 요청.보이나(요청.아바타들), true);
    const 판정4 = await verify('행마다 이름이 보인다', await 요청.보이나(요청.이름들), true);
    const 판정5 = await verify('행마다 @계정이 보인다', await 요청.보이나(요청.계정들), true);
    const 판정6 = await verify('행마다 개수 배지가 보인다', await 요청.보이나(요청.개수배지들), true);
    const 판정7 = await verify('행마다 허용 버튼이 보인다', await 요청.보이나(요청.허용), true);
    const 판정8 = await verify('행마다 해제 버튼이 보인다', await 요청.보이나(요청.해제), true);
    await verify('알림 요청 화면(제목 「필터링된 알림」) 행마다 아바타 · 이름 · @계정 · 개수 배지와 허용(체크) · 해제(X) 버튼이 보인다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5 && 판정6 && 판정7 && 판정8, true);
  }, { capture: true });
});
