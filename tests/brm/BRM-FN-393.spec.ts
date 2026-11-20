import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기 } from './helpers/social-tools.helper.js';
import { 게임다시켜기, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-393',
  name: '「메인 메뉴로」 나갔다 다시 로그인해 길드 창을 열면 다시 접속해도 길드 이름 · 길드장 · 길드원 목록이 그대로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드 「qa309」의 길드장이고 두 번째 플레이어 봇이 길드원이다'],
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
  await test.step('길드를 만든 일반 회원의 길드에 두 번째 플레이어 봇이 길드원으로 들어간다', async () => {
    await verify('일반 회원이 길드 「qa309」의 길드장이고 두 번째 플레이어 봇이 길드원이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa309', 들어옴: [봇] }), true, { blocker: true });
  });
  await test.step('「메인 메뉴로」 나갔다 다시 로그인해 길드 창을 연다', async () => {
    await 게임다시켜기(game, driver);
    await 로비로(game, driver, 나);
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('「qa309」');
    const 이름 = await verify('길드 이름이 「qa309」다', (await 길드.머리줄())?.includes('「qa309」') ?? false, true);
    const 장 = await verify('길드장이 일반 회원이다', (await 길드.길드원줄글(0))?.includes(`[길드장] ${나.아이디}`) ?? false, true);
    const 원 = await verify('길드원 목록에 두 번째 플레이어가 보인다', (await 길드.길드원줄번호(봇.아이디)) !== null, true);
    await verify('「메인 메뉴로」 나갔다 다시 로그인해 길드 창을 열면 다시 접속해도 길드 이름 · 길드장 · 길드원 목록이 그대로 보인다', 이름 && 장 && 원, true);
  });
});
