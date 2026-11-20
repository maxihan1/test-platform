import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 접속중인가 } from './helpers/social-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-303',
  name: '채팅 창을 열면 채널 탭이 「전체」 · 「파티」 · 「길드」다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '두 번째 플레이어가 봇으로 로비에 접속해 있다'],
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
  await test.step('두 번째 플레이어 봇을 켜고 일반 회원으로 로비에 들어간다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
  });
  await test.step('채팅 창을 열어 탭을 본다', async () => {
    const 채팅 = await 채팅창.열기(game);
    const 전체 = await verify('「전체」 탭 버튼의 글이 「전체」다', await 채팅.탭글('전체'), '전체');
    const 파티 = await verify('「파티」 탭 버튼의 글이 「파티」다', await 채팅.탭글('파티'), '파티');
    const 길드 = await verify('「길드」 탭 버튼의 글이 「길드」다', await 채팅.탭글('길드'), '길드');
    await verify('채팅 창을 열면 채널 탭이 「전체」 · 「파티」 · 「길드」다', 전체 && 파티 && 길드, true);
  });
  await test.step('일반 회원이 로그인해 채팅 창을 연다', async () => {
    await 로비로(game, driver, 나);
    const 채팅 = await 채팅창.열기(game);
    const 뜸 = await 채팅.글줄뜸('님이 접속했습니다');
    const 줄 = 뜸 ? await 채팅.글있는줄('님이 접속했습니다') : null;
    await verify('채팅 창에 「[알림]」 시스템 줄이 온다', 줄?.startsWith('[알림]') ?? false, true);
  });
});
