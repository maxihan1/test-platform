import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 길드없애고골드주기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-325',
  name: '길드 이름이 2자면 길드가 만들어진다',
  platforms: ['android'],
  precondition: ['골드 1000 을 가진 일반 회원이 길드 없이 길드 창을 열었다'],
  techniques: ['경계값 분석'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 1000 으로 맞춘 뒤 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 1000 이다', await 상단바골드(game), 1000, { blocker: true });
    });
    await test.step('2자 이름으로 길드를 만든다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('가나');
      await verify('길드 이름이 2자면 길드가 만들어진다', await 토스트떴나(game, '길드 창설 완료'), true);
      await 길드없애고골드주기(game, 1000);
    });
    await test.step('12자 이름으로 길드를 만든다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('가나다라마바사아자차카타');
      await verify('12자 이름도 길드가 만들어진다', await 토스트떴나(game, '길드 창설 완료'), true);
      await 길드없애고골드주기(game, 1000);
    });
    await test.step('이름 칸에 13자를 넣는다', async () => {
      const 창 = 길드창.지금(game);
      const 들어간글 = await 창.이름넣기('가나다라마바사아자차카타파');
      await verify('이름 칸에 13자를 넣어도 12자까지만 들어간다', 들어간글.length, 12);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
