import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 내가봇을길드에초대해수락시키기, 봇이볼때까지 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-345',
  name: '길드장이 「추방」을 누르면 쫓겨난 사람에게 「길드 「<길드>」에서 추방되었습니다」 오류 알림이 간다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드에 두 번째 플레이어 봇이 길드원으로 있다'],
  techniques: ['동등 분할'],
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
  const 길드이름 = '시험길드345';
  try {
    await test.step('일반 회원이 길드를 만들고 두 번째 플레이어 봇을 길드원으로 들인 뒤 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, 길드이름);
      await 내가봇을길드에초대해수락시키기(game, admin, 둘째);
      await 길드창.다시열기(game);
    });
    await test.step('길드원 줄에 두 번째 플레이어가 있는지 확인한다', async () => {
      await verify('길드원 줄에 두 번째 플레이어가 보인다', (await 길드창.지금(game).줄글들()).some((줄) => 줄.includes(둘째)), true, { blocker: true });
    });
    await test.step('봇 줄의 「추방」을 누르고 봇이 본 알림을 읽는다', async () => {
      const 창 = 길드창.지금(game);
      await 창.줄에서버튼누르기(둘째, '추방');
      await verify('길드장이 「추방」을 누르면 쫓겨난 사람에게 「길드 「<길드>」에서 추방되었습니다」 오류 알림이 간다', await 봇이볼때까지(admin, 둘째, `길드 「${길드이름}」에서 추방되었습니다`), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
