import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 와이파이 } from './helpers/device.helper.js';
import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-455',
  name: '와이파이를 끈 채 「게임 시작」을 누르면 「접속 실패」 창에 「서버에 연결하지 못했습니다. 네트워크를 확인해 주세요」가 보인다',
  platforms: ['android'],
  precondition: ['와이파이가 꺼져 있고 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    창제목: z.string().describe('접속 실패 창 제목').default('접속 실패'),
    본문: z.string().describe('접속 실패 창 본문').default('서버에 연결하지 못했습니다. 네트워크를 확인해 주세요'),
  }),
});

test(spec, async ({ game, driver, params, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  try {
    await test.step('와이파이를 끈 채 맞는 계정으로 「게임 시작」을 누른다', async () => {
      await 와이파이(driver, false);
      const 화면 = await 로그인화면.열기(game);
      await 화면.로그인(params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('접속 실패 창을 확인한다', async () => {
      const 화면 = 로그인화면.지금(game);
      const 제목 = await 화면.안내창.뜨는지(expected.창제목, 60_000);
      const 본문 = await 화면.안내창.본문이될때까지(expected.본문, 60_000);
      await verify('와이파이를 끈 채 「게임 시작」을 누르면 「접속 실패」 창에 「서버에 연결하지 못했습니다. 네트워크를 확인해 주세요」가 보인다', 제목 && 본문, true);
    });
  } finally {
    await 와이파이(driver, true);
  }
});
