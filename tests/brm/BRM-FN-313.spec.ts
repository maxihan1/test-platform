import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자색, 길드미리만들기, 로비준비, 봇장파티만들기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-313',
  name: '전체 · 파티 · 길드 채팅과 알림 줄의 글자색을 읽으면 채팅 글자색이 전체 #F2ECE0 · 파티 #7FD7FF · 길드 #9BE37B · 알림 #FFD152 다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 한 파티 · 한 길드다'],
  elements: ['state:파티=있음', 'state:길드=길드원'],
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
  await test.step('두 번째 플레이어 봇의 길드와 파티에 일반 회원이 들어가 로비에 들어간다', async () => {
    await 길드미리만들기(admin, 나, { 장: 봇, 이름: 'qa313색', 들어옴: [나] });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('일반 회원과 두 번째 플레이어 봇이 한 파티다', await 봇장파티만들기(game, admin, 나, 봇, []), true, { blocker: true });
    const 길드 = await 길드창.열기(game);
    await verify('일반 회원과 두 번째 플레이어 봇이 한 길드다', await 길드.머리가될때까지('길드원 2명'), true, { blocker: true });
  });
  await test.step('전체 · 파티 · 길드 채팅과 알림 줄의 글자색을 읽는다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('전체');
    await 채팅.보내기('qa 색 전체');
    await 채팅.글줄뜸('qa 색 전체');
    await 채팅.탭누르기('파티');
    await 채팅.보내기('qa 색 파티');
    await 채팅.글줄뜸('qa 색 파티');
    await 채팅.탭누르기('길드');
    await 채팅.보내기('qa 색 길드');
    await 채팅.글줄뜸('qa 색 길드');
    await 채팅.탭누르기('전체');
    await 채팅.글줄뜸('qa 색 길드');
    const 전체색 = await verify('전체 채팅 글자색이 #F2ECE0 이다', 글자색(await 채팅.글있는줄원문('qa 색 전체')), '#F2ECE0');
    const 파티색 = await verify('파티 채팅 글자색이 #7FD7FF 이다', 글자색(await 채팅.글있는줄원문('qa 색 파티')), '#7FD7FF');
    const 길드색 = await verify('길드 채팅 글자색이 #9BE37B 이다', 글자색(await 채팅.글있는줄원문('qa 색 길드')), '#9BE37B');
    const 알림색 = await verify('알림 줄 글자색이 #FFD152 이다', 글자색(await 채팅.글있는줄원문('님이 접속했습니다')), '#FFD152');
    await verify('전체 · 파티 · 길드 채팅과 알림 줄의 글자색을 읽으면 채팅 글자색이 전체 #F2ECE0 · 파티 #7FD7FF · 길드 #9BE37B · 알림 #FFD152 다', 전체색 && 파티색 && 길드색 && 알림색, true);
  });
});
