import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기, 적모두처치, 접속끊기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-112',
  name: '남은 사람이 모두 쓰러진 채 동료가 접속을 끊으면 결과 화면에 「다시 도전」이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇과 함께 던전에 있고 일반 회원이 쓰러져 있다'],
  elements: ['move:장소 던전→결과'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
  });
  let 봇 = '';
  await test.step('두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    봇 = await 봇과함께던전으로(game, driver, admin, 나, 두번째);
    await 적모두처치(game);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('일반 회원이 쓰러진다', async () => {
    await 쓰러뜨리기(game);
    const 상태 = await GM상태(game);
    await verify('체력이 0 이다', 상태['체력'], '0/1200', { blocker: true });
  });
  await test.step('두 번째 플레이어 봇의 접속을 끊는다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 접속끊기(admin, 봇);
    const 떴다 = await verify('결과 화면이 뜬다', await 던전.결과화면으로넘어갈때까지(60_000), true);
    const 결과 = await 결과화면.열기(game, 30_000);
    const 문구 = await verify('결과 화면에 「다시 도전」이 보인다', await 결과.패배글이될때까지(), true);
    await verify('남은 사람이 모두 쓰러진 채 동료가 접속을 끊으면 결과 화면에 「다시 도전」이 보인다', 떴다 && 문구, true);
  });
});
