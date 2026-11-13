import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-333',
  name: '길드가 없을 때 길드 창에 「아직 길드가 없습니다」, 안내 글 「길드 이름 (2~12자)」, 「만들기 · 500G」가 보인다',
  platforms: ['android'],
  precondition: ['길드가 없고 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내: z.string().describe('길드가 없을 때 안내 글 첫 줄').default('아직 길드가 없습니다'),
    이름안내: z.string().describe('이름 칸 안내 글').default('길드 이름 (2~12자)'),
    만들기: z.string().describe('만들기 버튼 글자').default('만들기 · 500G'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('길드 창을 연다', async () => {
    const 창 = await 길드창.열기(game);
    const 안내 = await verify('길드 창에 「아직 길드가 없습니다」가 보인다', (await 창.안내글()).split('\n')[0], expected.안내);
    const 이름안내 = await verify('이름 칸 안내 글 「길드 이름 (2~12자)」가 보인다', await 창.이름안내글(), expected.이름안내);
    const 만들기 = await verify('「만들기 · 500G」 버튼이 보인다', await 창.만들기글(), expected.만들기);
    await verify('길드가 없을 때 길드 창에 「아직 길드가 없습니다」, 안내 글 「길드 이름 (2~12자)」, 「만들기 · 500G」가 보인다', 안내 && 이름안내 && 만들기, true);
  });
});
