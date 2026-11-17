import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 지급목록 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-211',
  name: '받기가 끝나면 운영툴 지급 이력에서 그 우편이 받음 상태다',
  platforms: ['android'],
  precondition: ['「체력 물약」을 첨부한 우편이 있는 일반 회원이 우편함 창을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  let 지급번호 = 0;
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      지급번호 = await 우편넣기(admin, 아이디, 'ARG-FN-211', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-211');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누르고 운영툴 지급 이력을 읽는다', async () => {
      const 창 = 우편함창.지금(game);
      const 이력상태 = async (): Promise<string> => (await 지급목록(admin, 20)).find((지급) => 지급.id === 지급번호)?.mails[0]?.status ?? '';
      const 전 = await 이력상태();
      await 창.받기(우편제목('ARG-FN-211'));
      await 조건될때까지(async () => (await 이력상태()) !== 전, 20_000);
      const 후 = await 이력상태();
      await verify('받기가 끝나면 운영툴 지급 이력에서 그 우편이 받음 상태다', 후 !== 전 && 후 !== '', true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
