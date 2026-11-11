import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-357',
  name: 'Moderator 의 대시보드에도 대기 중인 신고 · 사용자 · 해시태그 · 이의 제기 바로가기 넷이 보인다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다'],
  params: z.object({
    modId: z.string().describe('중재자 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('중재자 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Moderator 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.modId, params.modPassword);
    await 프로필.열기();
    await verify('Moderator(qa_mod) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    const 신고 = await verify('대기 중인 신고 바로가기가 보인다', await 대시보드.대기신고.isVisible(), true);
    const 사용자 = await verify('대기 중인 사용자 바로가기가 보인다', await 대시보드.대기사용자.isVisible(), true);
    const 해시태그 = await verify('대기 중인 해시태그 바로가기가 보인다', await 대시보드.대기해시태그.isVisible(), true);
    const 이의제기 = await verify('대기 중인 이의 제기 바로가기가 보인다', await 대시보드.대기이의제기.isVisible(), true);
    await verify('Moderator 의 대시보드에도 대기 중인 신고 · 사용자 · 해시태그 · 이의 제기 바로가기 넷이 보인다', 신고 && 사용자 && 해시태그 && 이의제기, true);
  });
});
