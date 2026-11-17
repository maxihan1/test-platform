import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 기록없는우편 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편제목, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-210',
  name: '기록에서 찾을 수 없는 첨부를 받으면 그 첨부가 「알 수 없는 아이템」으로 보이고 우편에 남는다',
  platforms: ['android'],
  precondition: ['기록에 없는 첨부와 골드를 단 우편이 있는 일반 회원이 우편함 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 기록에 없는 첨부 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 기록없는우편(admin, 아이디, 비밀번호, 우편제목('ARG-FN-210'));
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-210');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      const 이름 = await verify('첨부 아이템이 「알 수 없는 아이템」으로 보인다', (await 창.줄칸글(우편제목('ARG-FN-210'), 2)).includes('알 수 없는 아이템'), true);
      await 창.받기(우편제목('ARG-FN-210'));
      await 조건될때까지(async () => (await 창.hud.알림글들()).length > 0);
      await 창.닫기누르기();
      const 다시 = await 우편줄기다리기(game, 'ARG-FN-210');
      const 남음 = await verify('받은 뒤에도 우편이 우편함에 남는다', (await 다시.목록.이름줄(우편제목('ARG-FN-210'))) !== null, true);
      await verify('기록에서 찾을 수 없는 첨부를 받으면 그 첨부가 「알 수 없는 아이템」으로 보이고 우편에 남는다', 이름 && 남음, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
