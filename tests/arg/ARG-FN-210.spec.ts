import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-210',
  name: '첨부 있는 우편이 없을 때 「모두 받기」를 누르면 「받을 첨부가 없습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['우편함에 첨부가 남은 우편이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('받을 첨부가 없을 때 알림 문구').default('받을 첨부가 없습니다'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ game, params, expected }) => {
  let 창: 우편함창;

  await test.step('일반 회원으로 로비에 들어가 우편함 첨부를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    창 = await 우편함창.열기(game);
    await 창.목록이뜰때까지();
    await verify('우편함 어느 줄에도 「받기」 버튼이 보이지 않는다', await 창.받기있는지(), false, { blocker: true });
  });

  await test.step('우편함 창의 「모두 받기」를 누른다', async () => {
    await 창.모두받기누르기();
    await verify('첨부 있는 우편이 없을 때 「모두 받기」를 누르면 「받을 첨부가 없습니다」 알림이 뜬다', await 창.hud.알림.뜨는지(expected.알림글), true);
  });
});
