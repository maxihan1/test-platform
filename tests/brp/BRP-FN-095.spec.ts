import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 색글떼기 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-095',
  name: '로비 정보 상자 스킬 아이콘에 마우스를 올리면 말풍선에 스킬 이름 「전투 망치」와 설명이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로비에서 탱커 카드를 골랐다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('탱커 카드를 고른 것을 확인한다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.직업고르기('탱커');
    await verify('정보 상자에 「탱커」가 보인다', await 로비.정보상자직업글될때까지('탱커'), '탱커', { blocker: true });
  });

  await test.step('정보 상자의 첫 스킬 아이콘에 마우스를 올린다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 글 = 색글떼기((await 로비.스킬아이콘말풍선(0)) ?? '');
    const 이름 = await verify('말풍선에 스킬 이름 「전투 망치」가 보인다', 글.startsWith('전투 망치'), true);
    const 설명 = await verify('말풍선에 스킬 이름 뒤 설명이 보인다', 글.replace('전투 망치', '').trim().length > 0, true);
    await verify('로비 정보 상자 스킬 아이콘에 마우스를 올리면 말풍선에 스킬 이름 「전투 망치」와 설명이 뜬다', 이름 && 설명, true);
  });
});
