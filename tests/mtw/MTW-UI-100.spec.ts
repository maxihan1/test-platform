import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-100',
  name: '홈 · 알림 · 실시간 피드 머리말에 설정 버튼이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 알림 = new 알림머리말화면(page);
  const 피드 = new 실시간피드화면(page);
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈 · 알림 · 실시간 피드를 차례로 연다', async () => {
    await 홈.열기();
    const 홈설정 = await verify('홈 머리말에 설정 버튼이 보인다', await 홈.설정버튼.isVisible(), true);
    await 알림.열기();
    const 알림설정 = await verify('알림 머리말에 설정 버튼이 보인다', await 알림.설정버튼.isVisible(), true);
    await 피드.열기();
    const 피드설정 = await verify('실시간 피드 머리말에 설정 버튼이 보인다', await 피드.설정버튼.isVisible(), true);
    await verify('홈 · 알림 · 실시간 피드 머리말에 설정 버튼이 보인다', 홈설정 && 알림설정 && 피드설정, true);
  });

  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필.열기('hana_photo');
    await verify('프로필 같은 하위 화면 머리말에는 「돌아가기」가 보인다', await 프로필.돌아가기.isVisible(), true);
  });
});
