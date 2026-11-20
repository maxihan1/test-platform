import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 친구미리맺기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-337',
  name: '친구 · 파티 창을 열면 친구 목록은 접속 중인 친구가 맨 위이고 그다음 이름 차례다',
  platforms: ['android'],
  precondition: ['일반 회원에게 접속 중인 친구 하나와 오프라인 친구 둘이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p4Id: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    p4Password: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  const 봇4 = 계정꺼내기(params.p4Id, params.p4Password, '네 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
    await 계정되돌리기(admin, 봇4);
  });
  await test.step('세 봇과 친구를 맺고 네 번째 플레이어 봇만 접속해 둔 채 일반 회원으로 로비에 들어간다', async () => {
    await verify('일반 회원에게 접속 중인 친구 하나와 오프라인 친구 둘이 있다', await 친구미리맺기(admin, 나, [{ 계정: 봇, 오프라인: true }, { 계정: 봇3, 오프라인: true }, { 계정: 봇4 }]), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('친구 · 파티 창을 연다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.글줄뜸(봇3.아이디);
    const 이름들 = [봇4.아이디, 봇.아이디, 봇3.아이디];
    const 번호들: { 이름: string; 번호: number }[] = [];
    for (const 이름 of 이름들) 번호들.push({ 이름, 번호: (await 창.친구줄번호(이름)) ?? 99 });
    const 보인차례 = 번호들.sort((가, 나머지) => 가.번호 - 나머지.번호).map((x) => x.이름).join(', ');
    await verify('친구 · 파티 창을 열면 친구 목록은 접속 중인 친구가 맨 위이고 그다음 이름 차례다', 보인차례, 이름들.join(', '));
  });
});
