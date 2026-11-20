import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비, 알림이모두사라질때까지 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-629',
  name: '초대 칸이 빈 채 「초대」를 누르면 초대 알림이 뜨지 않고 게임이 멈추지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이다'],
  techniques: ['오류 추정'],
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
  await test.step('길드를 만든 일반 회원이 로비에 들어간다', async () => {
    await verify('일반 회원이 길드장이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa629', 들어옴: [] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('초대할 캐릭터 이름 칸을 비우고 「초대」를 누른다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 1명');
    await 알림이모두사라질때까지(game);
    await 길드.초대누르기();
    const 알림 = await verify('초대 알림이 뜨지 않는다', await 길드.hud.알림뜸('초대', 3_000), false);
    const 멈춤 = await verify('게임이 멈추지 않는다', await 길드.제목(), '길드');
    await verify('초대 칸이 빈 채 「초대」를 누르면 초대 알림이 뜨지 않고 게임이 멈추지 않는다', 알림 && 멈춤, true);
  });
});
