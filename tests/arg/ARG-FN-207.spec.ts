import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 알림글읽기, 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-207',
  name: '첨부를 받으면 「받음: 체력 물약x2, 녹슨 단검, 100 골드」 꼴 알림이 뜬다',
  platforms: ['android'],
  precondition: ['「체력 물약」 2개 · 「녹슨 단검」 1개 · 골드 100 을 첨부한 우편이 있는 일반 회원이 우편함 창을 열었다'],
  elements: ['item:health_potion', 'item:rusty_dagger', 'flow:골드-우편'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-207', [{ 이름: '체력 물약', 개수: 2 }, { 이름: '녹슨 단검', 개수: 1 }], 100);
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-207');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.받기(우편제목('ARG-FN-207'));
      const 글 = await 알림글읽기(game, '받음:');
      await verify('첨부를 받으면 「받음: 체력 물약x2, 녹슨 단검, 100 골드」 꼴 알림이 뜬다', 글, '받음: 체력 물약x2, 녹슨 단검, 100 골드');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
