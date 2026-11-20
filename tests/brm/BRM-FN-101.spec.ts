import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 자리고르기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 색뗀글 } from './components/hud.component.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-101',
  name: '정보 상자의 스킬 아이콘에 손가락을 올려 두면 말풍선에 스킬 이름과 설명이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['skill:전투 망치'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어가 탱커를 고른다', async () => {
    await 로비로(game, driver, 나);
    await 자리고르기(game, 0);
    await verify('정보 상자에 「탱커」가 보인다', await new 로비화면(game).현재직업(), '탱커', { blocker: true });
  });
  await test.step('탱커를 고른 뒤 정보 상자의 스킬 아이콘에 손가락을 올려 둔다', async () => {
    const 로비 = new 로비화면(game);
    const 손가락 = await 로비.스킬아이콘눌러두기(1);
    let 글 = '';
    try {
      글 = 색뗀글((await 로비.말풍선글()) ?? '');
    } finally {
      await 로비.손가락떼기(손가락);
    }
    const 이름 = await verify('말풍선에 「전투 망치」가 보인다', 글.includes('전투 망치'), true);
    const 설명 = await verify('말풍선에 스킬 설명 글이 있다', 글.replace('전투 망치', '').trim().length > 0, true);
    await verify('정보 상자의 스킬 아이콘에 손가락을 올려 두면 말풍선에 스킬 이름과 설명이 뜬다', 이름 && 설명, true);
  });
});
