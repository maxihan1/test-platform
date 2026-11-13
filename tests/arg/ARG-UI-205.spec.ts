import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-205',
  name: '창의 「닫기」를 누르면 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    가방제목: z.string().describe('가방 창 제목').default('가방'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('가방 창을 열고 「닫기」를 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('가방 창 제목이 「가방」이다', await 가방.제목글(), expected.가방제목, { blocker: true });
    await 가방.닫기버튼누르기();
    await verify('창의 「닫기」를 누르면 창이 닫힌다', await 가방.닫히는지(), true);
  });

  await test.step('가방 창을 열고 메뉴 「가방」을 다시 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('가방 창이 열려 있다', await 가방.제목글(), expected.가방제목, { blocker: true });
    await 가방.hud.메뉴누르기('가방');
    await verify('같은 메뉴 버튼을 다시 누르면 창이 닫힌다', await 가방.닫히는지(), true);
  });
});
