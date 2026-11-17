import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-068',
  name: '로비 정보 상자의 스킬 아이콘에 손가락을 올리면 「전투 망치」와 그 설명이 말풍선으로 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 로비에서 탱커 카드를 골랐다'],
  elements: ['class:tank', 'skill:war_hammer'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 탱커 카드를 고른다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      const 로비 = await 로비로(game, 아이디, 비밀번호);
      await 로비.카드누르기(로비화면.카드차례.탱커);
    });
    await test.step('로비에서 탱커 카드를 골랐는지 확인한다', async () => {
      await verify('정보 상자의 직업 이름이 「탱커」다', await 로비화면.지금(game).직업이름읽기(), '탱커', { blocker: true });
    });

    await test.step('정보 상자의 첫 스킬 아이콘에 손가락을 올려 둔다', async () => {
      const 글 = await 로비화면.지금(game).스킬말풍선읽기(로비화면.스킬아이콘1);
      const 이름 = await verify('말풍선에 「전투 망치」가 보인다', 글.includes('전투 망치'), true);
      const 설명 = await verify('말풍선에 스킬 설명이 보인다', 글.replace('전투 망치', '').trim().length > 0, true);
      await verify('로비 정보 상자의 스킬 아이콘에 손가락을 올리면 「전투 망치」와 그 설명이 말풍선으로 뜬다', 이름 && 설명, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
