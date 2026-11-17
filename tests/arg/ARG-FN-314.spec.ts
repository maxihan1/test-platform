import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내가봇을파티에초대해수락시키기, 메인메뉴로나갔다돌아오기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-314',
  name: '파티에 있다가 다시 접속하면 친구 · 파티 창에 「파티 없음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 같은 파티다'],
  techniques: ['상태 전이'],
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
    await test.step('일반 회원이 두 번째 플레이어 봇과 같은 파티를 맺는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
    });
    await test.step('파티가 2명인지 확인한다', async () => {
      const 창 = await 친구파티창.다시열기(game);
      await verify('파티 머리줄에 「파티 2/4」가 보인다', (await 창.줄글들()).some((줄) => 줄.includes('파티 2/4')), true, { blocker: true });
    });
    await test.step('「메인 메뉴로」 나간 뒤 다시 로그인하고 친구 · 파티 창을 연다', async () => {
      await 친구파티창.지금(game).닫기누르기();
      await 메인메뉴로나갔다돌아오기(game, 아이디, 비밀번호);
      const 창 = await 친구파티창.열기(game);
      await verify('파티에 있다가 다시 접속하면 친구 · 파티 창에 「파티 없음」이 보인다', (await 창.줄글들()).some((줄) => 줄.includes('파티 없음')), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
