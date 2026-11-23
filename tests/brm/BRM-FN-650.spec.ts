import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 고르기표시 } from './pages/target-reticule.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-650',
  name: '던전에서 내 초상화를 눌러 영웅을 고르면 내 영웅 발밑에 고르기 표시가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['state:장소=던전'],
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
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 행동 막대가 보인다', await 던전화면.열기(game).then(() => true, () => false), true, { blocker: true });
    await verify('고르기 표시가 아직 없다', await 고르기표시.있나(game), false, { blocker: true });
  });
  await test.step('던전에서 왼쪽 위 내 초상화를 누른다', async () => {
    await 고르기표시.내초상화누르기(game);
    await verify('던전에서 내 초상화를 눌러 영웅을 고르면 내 영웅 발밑에 고르기 표시가 뜬다', await 고르기표시.내영웅발밑에뜰때까지(game), true);
  });
});
