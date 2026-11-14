import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-260',
  name: '일반 회원 설정 메뉴에서 「초대」를 누르면 초대 링크 만들기 화면이 열린다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('일반 회원으로 로그인하고 설정 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 설정.열기('/settings/preferences/other');
    await verify('설정 왼쪽 메뉴에 「초대」가 보인다', await 설정.틀.메뉴('초대').isVisible(), true, { blocker: true });
  });

  await test.step('설정 메뉴에서 「초대」를 누른다', async () => {
    await 설정.틀.메뉴('초대').click();
    const 떴다 = await 설정.버튼('초대 링크 생성하기').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('일반 회원 설정 메뉴에서 「초대」를 누르면 초대 링크 만들기 화면이 열린다', 떴다, true);
  });
});
