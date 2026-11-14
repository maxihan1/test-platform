import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-507',
  name: '컬렉션 알림은 「<이름> added you to a collection」(영어)이고 누르면 컬렉션이 열린다',
  platforms: ['android'],
  held: '보류 — 나를 컬렉션에 넣은 다른 계정',
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
  const 컬렉션 = new 컬렉션화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('컬렉션 알림을 누른다', async () => {
    await 알림.열기();
    const 판정1 = await verify('컬렉션 알림 「<이름> added you to a collection」이 보인다', await 문구가보이나(driver, '<이름> added you to a collection'), true);
    await 알림.글누르기('added you to a collection');
    const 판정2 = await verify('컬렉션 알림을 누르면 컬렉션이 열린다', await 컬렉션.떴나(), true);
    await verify('컬렉션 알림은 「<이름> added you to a collection」(영어)이고 누르면 컬렉션이 열린다', 판정1 && 판정2, true);
  }, { capture: true });
});
