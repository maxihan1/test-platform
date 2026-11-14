import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { type 새계정, 확인된새계정만들기 } from './helpers/signup.helper.js';
import { 이메일알림화면 } from './pages/email-notifications.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-724',
  name: '새 계정으로 이메일 알림 설정을 열면 팔로우 · 팔로우 요청 · 언급 · 인용이 켜져 있다',
  precondition: ['가입하고 관리자가 이메일 확인을 마친 새 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 이메일알림화면(page);
  let 계정: 새계정 | undefined;

  await test.step('새 계정을 만들고 관리자가 이메일 확인을 마친다', async () => {
    계정 = await 확인된새계정만들기(page, params.adminId, params.adminPassword);
  });

  await test.step('새 계정으로 로그인해 있는지 확인한다', async () => {
    await 로그인하기(page, 계정?.이메일, 계정?.암호);
    await 설정.열기();
    await verify('이메일 알림 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
  });

  await test.step('새 계정으로 이메일 알림 설정을 연다', async () => {
    const 팔로우 = await verify('「팔로우」 알림이 켜져 있다', await 설정.팔로우.isChecked(), true);
    const 요청 = await verify('「팔로우 요청」 알림이 켜져 있다', await 설정.팔로우요청.isChecked(), true);
    const 언급 = await verify('「언급」 알림이 켜져 있다', await 설정.언급.isChecked(), true);
    const 인용 = await verify('「인용」 알림이 켜져 있다', await 설정.인용.isChecked(), true);
    await verify('새 계정으로 이메일 알림 설정을 열면 팔로우 · 팔로우 요청 · 언급 · 인용이 켜져 있다', 팔로우 && 요청 && 언급 && 인용, true);
    const 부스트 = await verify('「부스트」 알림이 꺼져 있다', await 설정.부스트.isChecked(), false);
    const 마음에듦 = await verify('「마음에 들어함」 알림이 꺼져 있다', await 설정.마음에듦.isChecked(), false);
    const 항상 = await verify('「항상 보내기」가 꺼져 있다', await 설정.항상보내기.isChecked(), false);
    await verify('부스트 · 마음에 들어함 · 항상 보내기는 꺼져 있다', 부스트 && 마음에듦 && 항상, true);
  });
});
