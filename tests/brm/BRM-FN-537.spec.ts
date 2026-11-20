import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 퀘스트처음으로 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-537',
  name: '일일 퀘스트 창의 진행 줄을 읽으면 퀘스트 줄마다 금색 진행 막대와 「0/30」 꼴 진행 글이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 금색막대 = ([r = 0, g = 0, b = 0]: number[]): boolean => r > 0.8 && g > 0.6 && b < 0.55;

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어가 퀘스트를 처음으로 돌린다', async () => {
    await 로비로(game, driver, 나);
    await 퀘스트처음으로(game);
    const 창 = await 퀘스트창.열기(game);
    await verify('퀘스트 줄이 3줄이다', await 창.줄수(), 3, { blocker: true });
  });
  await test.step('일일 퀘스트 창의 진행 줄을 읽는다', async () => {
    const 창 = await 퀘스트창.열기(game);
    const 막대0 = await verify('첫째 줄 진행 막대가 금색이다', 금색막대(await 창.진행막대색(0)), true);
    const 글0 = await verify('첫째 줄 진행 글이 「0/30」 꼴이다', /^\d+\/\d+$/.test((await 창.줄진행(0)) ?? ''), true);
    const 막대1 = await verify('둘째 줄 진행 막대가 금색이다', 금색막대(await 창.진행막대색(1)), true);
    const 글1 = await verify('둘째 줄 진행 글이 「0/30」 꼴이다', /^\d+\/\d+$/.test((await 창.줄진행(1)) ?? ''), true);
    const 막대2 = await verify('셋째 줄 진행 막대가 금색이다', 금색막대(await 창.진행막대색(2)), true);
    const 글2 = await verify('셋째 줄 진행 글이 「0/30」 꼴이다', /^\d+\/\d+$/.test((await 창.줄진행(2)) ?? ''), true);
    await verify('일일 퀘스트 창의 진행 줄을 읽으면 퀘스트 줄마다 금색 진행 막대와 「0/30」 꼴 진행 글이 보인다', 막대0 && 글0 && 막대1 && 글1 && 막대2 && 글2, true);
  });
});
