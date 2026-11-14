import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 동작설정화면 } from './pages/set-behavior.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-394',
  name: '설정 「동작」 「링크 열기」 기본값은 「앱내 브라우저 」이고 「앱내 브라우저 」 · 「시스템 브라우저」 중 고른다',
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
  const 설정 = new 설정화면(driver);
  const 동작 = new 동작설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정 「동작」을 연다', async () => {
    await 설정.줄누르기('동작');
    await verify('동작 화면이 열린다', await 동작.떴나(), true);
    const 기본 = await verify('「링크 열기」 기본값이 「앱내 브라우저」다', await 동작.부제글('링크 열기'), '앱내 브라우저');
    await 동작.줄누르기('링크 열기');
    const 시스템 = await verify('선택지에 「시스템 브라우저」가 있다', await 동작.선택지보이나('시스템 브라우저'), true);
    const 앱내 = await verify('선택지에 「앱내 브라우저」가 있다', (await 동작.글수('앱내 브라우저')) >= 2, true);
    await verify('설정 「동작」 「링크 열기」 기본값은 「앱내 브라우저 」이고 「앱내 브라우저 」 · 「시스템 브라우저」 중 고른다', 기본 && 시스템 && 앱내, true);
    await 동작.선택창닫기();
  }, { capture: true });
});
