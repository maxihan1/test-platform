import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-389',
  name: '마지막 1명이 탈퇴하면 길드가 지워져 같은 이름 「qa306」으로 다시 만들 수 있다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자인 길드 「qa306」의 길드장이다'],
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
    await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa306', 들어옴: [] });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const 길드 = await 길드창.열기(game);
    await verify('일반 회원이 혼자인 길드 「qa306」의 길드장이다', await 길드.머리가될때까지('길드원 1명'), true, { blocker: true });
  });
  await test.step('「길드 탈퇴」를 누른 뒤 같은 이름으로 다시 만든다', async () => {
    await 골드맞추기(game, 600);
    const 길드 = await 길드창.열기(game);
    await 길드.탈퇴누르기();
    await 길드.글줄뜸('아직 길드가 없습니다');
    await 길드.이름넣기('qa306');
    await 길드.만들기누르기();
    await 길드.머리가될때까지('길드원 1명');
    await verify('마지막 1명이 탈퇴하면 길드가 지워져 같은 이름 「qa306」으로 다시 만들 수 있다', (await 길드.머리줄())?.includes('「qa306」') ?? false, true);
  });
});
