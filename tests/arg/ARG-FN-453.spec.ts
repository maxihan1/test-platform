import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-453',
  name: '점검 중에 허용 계정이 아닌 계정으로 로그인하면 「서버 점검 중」 창에 점검 안내 문구가 보인다',
  platforms: ['android'],
  precondition: ['허용 계정 없이 점검이 켜져 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 안내 = '자동 시험 점검 안내';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 허용 계정 없이 점검을 켠 뒤 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 점검켜기(admin, 안내);
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('점검 중에 일반 회원으로 로그인한다', async () => {
      await 화면.로그인(아이디, 비밀번호);
      const 창 = await 접속안내창.제목이될때까지(game, '서버 점검 중');
      const 제목 = await verify('「서버 점검 중」 창이 보인다', (await 창?.제목글()) === '서버 점검 중', true);
      const 본문 = (await 창?.본문글()) ?? '';
      const 글1 = await verify('창에 점검 안내 문구가 보인다', 본문.includes(안내), true);
      await verify('점검 중에 허용 계정이 아닌 계정으로 로그인하면 「서버 점검 중」 창에 점검 안내 문구가 보인다', 제목 && 글1, true);
    });
  } finally {
    await 점검끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
