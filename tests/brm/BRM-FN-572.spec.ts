import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 친구미리맺기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 캐릭터값넣기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-572',
  name: '접속 안 한 친구의 레벨이 바뀌면 1분 안팎에 친구 줄 「Lv.」가 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원과 세 번째 플레이어가 친구이고 세 번째 플레이어는 오프라인이다'],
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
  await test.step('세 번째 플레이어 봇과 친구를 맺은 뒤 접속을 끊고 일반 회원으로 로비에 들어간다', async () => {
    await verify('일반 회원과 세 번째 플레이어가 친구이고 세 번째 플레이어는 오프라인이다', await 친구미리맺기(admin, 나, [{ 계정: 봇3, 오프라인: true }]), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('세 번째 플레이어 레벨을 바꾼 뒤 1분 넘게 친구 · 파티 창을 본다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.글줄뜸(봇3.아이디);
    await 캐릭터값넣기(admin, 봇3, { level: 5 });
    const 바뀜 = await 창.줄글이될때까지(봇3.아이디, 'Lv.5', 70_000);
    await verify('접속 안 한 친구의 레벨이 바뀌면 1분 안팎에 친구 줄 「Lv.」가 바뀐다', 바뀜, true);
  });
});
