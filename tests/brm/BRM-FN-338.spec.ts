import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 초록인가, 친구미리맺기, 태그뗀글, 표시색, 회색인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-338',
  name: '친구 · 파티 창을 열면 접속 중인 친구 줄에는 초록 점과 「Lv.1 · 접속 중」, 오프라인 친구 줄에는 회색 점과 「Lv.1 · 오프라인」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원에게 접속 중인 친구 하나와 오프라인 친구 하나가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
  });
  await test.step('두 봇과 친구를 맺고 두 번째 플레이어 봇만 접속해 둔 채 일반 회원으로 로비에 들어간다', async () => {
    await verify('일반 회원에게 접속 중인 친구 하나와 오프라인 친구 하나가 있다', await 친구미리맺기(admin, 나, [{ 계정: 봇 }, { 계정: 봇3, 오프라인: true }]), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('친구 · 파티 창을 연다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.글줄뜸(봇3.아이디);
    const 접속줄 = await 창.줄원문((await 창.친구줄번호(봇.아이디)) ?? 0);
    const 오프줄 = await 창.줄원문((await 창.친구줄번호(봇3.아이디)) ?? 0);
    const 초록점 = await verify('접속 중인 친구 줄의 점이 초록이다', 초록인가(표시색(접속줄, '●')), true);
    const 접속글 = await verify('접속 중인 친구 줄에 「Lv.1 · 접속 중」이 보인다', 태그뗀글(접속줄)?.includes('Lv.1 · 접속 중') ?? false, true);
    const 회색점 = await verify('오프라인 친구 줄의 점이 회색이다', 회색인가(표시색(오프줄, '●')), true);
    const 오프글 = await verify('오프라인 친구 줄에 「Lv.1 · 오프라인」이 보인다', 태그뗀글(오프줄)?.includes('Lv.1 · 오프라인') ?? false, true);
    await verify('친구 · 파티 창을 열면 접속 중인 친구 줄에는 초록 점과 「Lv.1 · 접속 중」, 오프라인 친구 줄에는 회색 점과 「Lv.1 · 오프라인」이 보인다', 초록점 && 접속글 && 회색점 && 오프글, true);
  });
});
