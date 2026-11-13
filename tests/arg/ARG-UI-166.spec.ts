import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-166',
  name: '일일 퀘스트 창에 수락 버튼 없이 줄마다 진행 「<진행>/<목표>」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['quest:kill_imps', 'quest:kill_boss', 'quest:shop_buy'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('일일 퀘스트 창을 연다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 수락없음 = await verify('일일 퀘스트 창에 수락 버튼이 없다', await 퀘스트.수락버튼있는지(), false);
    const 맞지않는진행 = (await 퀘스트.진행들()).filter((글) => !/^\d+\/\d+$/.test(글.trim()));
    const 진행꼴 = await verify('퀘스트 줄마다 진행이 「<진행>/<목표>」 꼴이다', 맞지않는진행, []);
    await verify('일일 퀘스트 창에 수락 버튼 없이 줄마다 진행 「<진행>/<목표>」가 보인다', 수락없음 && 진행꼴, true);
  });
});
