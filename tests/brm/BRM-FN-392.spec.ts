import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-392',
  name: '접속 중에 쫓겨나면 오류 색 알림 「길드 「qa308」에서 추방되었습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드 「qa308」의 길드장이고 일반 회원이 길드원이다'],
  techniques: ['동등 분할'],
  elements: ['move:길드 길드원→없음'],
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
  await test.step('두 번째 플레이어 봇의 길드 「qa308」에 일반 회원이 길드원으로 들어간 뒤 로비에 들어간다', async () => {
    await verify('두 번째 플레이어 봇이 길드 「qa308」의 길드장이고 일반 회원이 길드원이다', await 길드미리만들기(admin, 나, { 장: 봇, 이름: 'qa308', 들어옴: [나] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('봇이 일반 회원을 추방한다', async () => {
    await 봇시키기(admin, 봇.아이디, `guild_kick:${나.아이디}`);
    await verify('접속 중에 쫓겨나면 오류 색 알림 「길드 「qa308」에서 추방되었습니다」가 뜬다', await new 공통HUD(game).알림뜸('길드 「qa308」에서 추방되었습니다'), true);
  });
});
