import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 디스플레이설정화면 } from './pages/set-display.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-401',
  name: '「시스템 동적 색상 적용」은 Android 12(API 31) 이상에서만 보이고 기본값은 켜짐이다',
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
  const 디스플레이 = new 디스플레이설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('Android 12 이상 폰에서 설정 「디스플레이」를 연다', async () => {
    await 설정.줄누르기('디스플레이');
    await verify('디스플레이 화면이 열린다', await 디스플레이.떴나(), true);
    const 줄 = await verify('「시스템 동적 색상 적용」 줄이 보인다', await 디스플레이.줄보이나('시스템 동적 색상 적용'), true);
    const 켜짐 = await verify('「시스템 동적 색상 적용」이 켜져 있다', await 디스플레이.켜졌나('시스템 동적 색상 적용'), true);
    await verify('「시스템 동적 색상 적용」은 Android 12(API 31) 이상에서만 보이고 기본값은 켜짐이다', 줄 && 켜짐, true);
  }, { capture: true });
});
