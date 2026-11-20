import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 봇장파티만들기, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-323',
  name: '전체 · 파티 채팅을 하나씩 보내고 「파티」 탭을 보면 「파티」 탭에는 파티 줄과 알림 줄만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 한 파티다'],
  elements: ['state:파티=있음'],
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
  await test.step('두 번째 플레이어 봇이 일반 회원을 파티에 초대해 한 파티로 만든다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('일반 회원과 두 번째 플레이어 봇이 한 파티다', await 봇장파티만들기(game, admin, 나, 봇, []), true, { blocker: true });
  });
  await test.step('전체 · 파티 채팅을 하나씩 보내고 「파티」 탭을 본다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('전체');
    await 채팅.보내기('qa 전체 248');
    await 채팅.탭누르기('파티');
    await 채팅.보내기('qa 파티 248');
    await 채팅.글줄뜸('qa 파티 248');
    const 파티줄 = await verify('「파티」 탭에 파티 줄이 보인다', (await 채팅.글있는줄('qa 파티 248'))?.startsWith('[파티]') ?? false, true);
    const 알림줄 = await verify('「파티」 탭에 알림 줄이 보인다', (await 채팅.글있는줄('님이 접속했습니다'))?.startsWith('[알림]') ?? false, true);
    const 전체줄 = await verify('「파티」 탭에 전체 줄이 보이지 않는다', await 채팅.글있는줄('qa 전체 248'), null);
    await verify('전체 · 파티 채팅을 하나씩 보내고 「파티」 탭을 보면 「파티」 탭에는 파티 줄과 알림 줄만 보인다', 파티줄 && 알림줄 && 전체줄, true);
  });
});
