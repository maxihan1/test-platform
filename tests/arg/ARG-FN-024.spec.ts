import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-024',
  name: '같은 계정이 이미 접속해 있을 때 로그인하면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 봇이 접속해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 같은 계정으로 봇을 접속시킨다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 봇켜기(admin, { user: 아이디, pass: 비밀번호 });
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('이미 접속한 계정으로 로그인한다', async () => {
      await 화면.로그인(아이디, 비밀번호);
      const 창 = await 접속안내창.제목이될때까지(game, '접속 실패');
      const 제목 = await verify('「접속 실패」 창이 보인다', (await 창?.제목글()) === '접속 실패', true);
      const 본문 = (await 창?.본문글()) ?? '';
      const 글1 = await verify('창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」 문구가 보인다', 본문.includes('같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요'), true);
      await verify('같은 계정이 이미 접속해 있을 때 로그인하면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 보인다', 제목 && 글1, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
