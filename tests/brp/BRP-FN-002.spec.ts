import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기, 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-002',
  name: '먼저 들어온 사람이 있으면 같은 로비에 들어가 로비 접속 인원이 「2명 접속 중」으로 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 로비에 있다', '일반 회원과 두 번째 플레이어 봇이 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  let 봇 = '';
  await test.step('두 번째 플레이어 봇을 켜 로비에 둔 것을 확인한다', async () => {
    봇 = await 봇켜기(admin, params.p2Id ?? '', params.p2Password ?? '');
    await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속상태(admin)).bots.includes(봇), true, { blocker: true });
  });

  await test.step('일반 회원으로 로그인해 로비 접속 인원을 읽는다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    const 둘이다 = await (await 로비화면.열림(game)).인원글될때까지('2명 접속 중');
    await verify('먼저 들어온 사람이 있으면 같은 로비에 들어가 로비 접속 인원이 「2명 접속 중」으로 보인다', 둘이다, true);
  });

  await test.step('둘 다 자리를 고르고 준비해 던전에 들어간다', async () => {
    await 봇시키기(admin, 봇, 'seat:2');
    await 봇시키기(admin, 봇, 'ready');
    const 로비 = await 로비화면.열림(game);
    await 로비.던전들어가기(로비화면.직업자리['탱커']);
    const 던전 = await 던전화면.안내창뜸(game);
    await 던전.안내창닫기();
    const 보인다 = await game.waitFor(던전화면.동료이름, { text: 봇, timeoutMs: 15_000 }).then(
      () => true,
      () => false,
    );
    await verify('둘이 모두 준비한 뒤 같은 던전에 들어가 던전 동료 초상화에 두 번째 플레이어가 보인다', 보인다, true);
  });
});
