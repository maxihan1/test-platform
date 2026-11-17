import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 봇골드주기, 봇이볼때까지, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 상단바골드 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-327',
  name: '길드 이름이 1자면 「길드 이름은 2~12자로 지어 주세요」가 뜬다',
  platforms: ['android'],
  precondition: ['골드 1000 을 가진 일반 회원이 길드 없이 길드 창을 열었다', '두 번째 플레이어 봇이 골드 1000 을 갖고 길드 없이 접속해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  try {
    await test.step('일반 회원과 두 번째 플레이어 계정을 처음 상태로 되돌리고 두 계정의 골드를 1000 으로 맞춘다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 골드맞추기(game, 1000);
      await 봇골드주기(admin, 둘째, 1000);
      await 길드창.열기(game);
    });
    await test.step('보유 골드를 확인한다', async () => {
      await verify('보유 골드가 1000 이다', await 상단바골드(game), 1000, { blocker: true });
    });
    await test.step('1자 이름으로 「만들기 · 500G」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기('가');
      await verify('길드 이름이 1자면 「길드 이름은 2~12자로 지어 주세요」가 뜬다', await 토스트떴나(game, '길드 이름은 2~12자로 지어 주세요'), true);
    });
    await test.step('봇이 13자 이름으로 길드 만들기를 요청한다', async () => {
      await 봇시키기(admin, 둘째, 'guild_create:가나다라마바사아자차카타파');
      await verify('13자 이름으로 만들기를 요청해도 「길드 이름은 2~12자로 지어 주세요」로 막힌다', await 봇이볼때까지(admin, 둘째, '길드 이름은 2~12자로 지어 주세요'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
