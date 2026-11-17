import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드가될때까지, 골드맞추기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-322',
  name: '길드가 없는 사람이 「만들기 · 500G」를 누르면 「길드 창설 완료: 「<이름>」」이 뜬다',
  platforms: ['android'],
  precondition: ['골드 1000 을 가진 일반 회원이 길드 없이 길드 창을 열었다'],
  elements: ['flow:골드-길드만들기'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 길드이름 = '시험길드322';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드를 1000 으로 맞춘 뒤 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 1000 이다', await 상단바골드(game), 1000, { blocker: true });
    });
    await test.step('이름 칸에 길드 이름을 넣고 「만들기 · 500G」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      const 앞골드 = await 상단바골드(game);
      await 창.만들기(길드이름);
      const 창설 = await verify('「길드 창설 완료」가 뜬다', await 토스트떴나(game, '길드 창설 완료'), true);
      const 이름 = await verify('창설 알림에 길드 이름이 보인다', await 토스트떴나(game, `「${길드이름}」`), true);
      await verify('길드가 없는 사람이 「만들기 · 500G」를 누르면 「길드 창설 완료: 「<이름>」」이 뜬다', 창설 && 이름, true);
      const 화면골드 = await verify('화면의 골드가 500 줄어든다', 앞골드 - (await 골드가될때까지(game, 앞골드 - 500)), 500);
      const 서버골드 = await verify('서버에 저장된 골드가 500 줄어든다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 앞골드 - 500)).골드, 앞골드 - 500);
      await verify('골드가 500 줄어든다', 화면골드 && 서버골드, true);
      const 새창 = await 길드창.다시열기(game);
      await verify('만든 사람이 길드장이 되어 길드원 줄에 「[길드장]」이 보인다', (await 새창.줄글들()).some((줄) => 줄.includes('[길드장]')), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
