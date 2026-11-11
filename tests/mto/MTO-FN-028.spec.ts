import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-028',
  name: 'Moderator 가 대시보드를 열면 「아직 서버 규칙을 정하지 않았습니다.」가 보이지 않는다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다', '서버 규칙이 하나도 없다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    modId: z.string().describe('중재자 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('중재자 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 창에서 서버 규칙이 하나도 없는지 확인한다', async () => {
    const 확인창 = await 새창으로로그인(page, params.loginId, params.loginPassword);
    try {
      await new 서버규칙화면(확인창).열기();
      await verify('서버 규칙이 하나도 없다', await new 서버규칙화면(확인창).빈목록.isVisible(), true, { blocker: true });
    } finally {
      await 확인창.context().close();
    }
  });
  await test.step('Moderator 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.modId, params.modPassword);
    await 프로필.열기();
    await verify('Moderator(qa_mod) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「대시보드」 화면을 연다', async () => {
    await 대시보드.열기();
    await verify('Moderator 가 대시보드를 열면 「아직 서버 규칙을 정하지 않았습니다.」가 보이지 않는다', await 대시보드.규칙경고.isVisible(), false);
  });
});
