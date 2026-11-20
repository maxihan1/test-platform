import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-632',
  name: '접속 중이 아닌 캐릭터를 길드에 초대하면 「접속 중인 캐릭터만 초대할 수 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇3);
  });
  await test.step('길드를 만든 일반 회원이 로비에 들어간다', async () => {
    await verify('일반 회원이 길드장이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa632', 들어옴: [] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('접속하지 않은 「qa_player3」를 길드에 초대한다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.초대하기(봇3.아이디);
    await verify('접속 중이 아닌 캐릭터를 길드에 초대하면 「접속 중인 캐릭터만 초대할 수 있습니다」가 뜬다', await 길드.hud.알림뜸('접속 중인 캐릭터만 초대할 수 있습니다'), true);
  });
});
