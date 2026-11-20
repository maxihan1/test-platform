import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드가값이될때까지, 로비준비, 봇길드만들기, 봇들켜기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-379',
  name: '이미 있는 길드와 같은 이름으로 만들면 「이미 있는 길드 이름입니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드 「qa296중복」을 만들었다'],
  techniques: ['동등 분할'],
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
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
  });
  await test.step('두 번째 플레이어 봇이 길드 「qa296중복」을 만들고 일반 회원이 골드 600 으로 로비에 들어간다', async () => {
    await 봇들켜기(admin, [봇]);
    await verify('두 번째 플레이어 봇이 길드 「qa296중복」을 만들었다', await 봇길드만들기(admin, 봇, 'qa296중복'), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const hud = new 공통HUD(game);
    await 골드맞추기(game, 600);
    await verify('일반 회원의 골드가 600 이다', await 골드가값이될때까지(hud, 600), true, { blocker: true });
  });
  await test.step('일반 회원이 길드 이름 「qa296중복」으로 「만들기 · 500G」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.이름넣기('qa296중복');
    await 길드.만들기누르기();
    await verify('이미 있는 길드와 같은 이름으로 만들면 「이미 있는 길드 이름입니다」가 뜬다', await 길드.hud.알림뜸('이미 있는 길드 이름입니다'), true);
  });
});
