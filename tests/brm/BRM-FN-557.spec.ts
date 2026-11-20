import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-557',
  name: '길드원 목록 차례를 읽으면 길드원 목록은 길드장이 맨 위이고 그다음 접속 중인 사람이다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드장이고 일반 회원 · 세 번째 플레이어 봇이 길드원이고 세 번째는 접속을 끊었다'],
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
  await test.step('두 번째 플레이어 봇의 길드에 세 번째 플레이어 봇과 일반 회원이 차례로 들어오고 세 번째 플레이어 봇이 접속을 끊은 뒤 일반 회원이 로비에 들어간다', async () => {
    await verify('두 번째 플레이어 봇이 길드장이고 일반 회원 · 세 번째 플레이어 봇이 길드원이고 세 번째는 접속을 끊었다', await 길드미리만들기(admin, 나, { 장: 봇, 이름: 'qa557', 들어옴: [봇3, 나], 끌사람: [봇3] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('길드원 목록 차례를 읽는다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 3명');
    const 이름들 = [봇.아이디, 나.아이디, 봇3.아이디];
    const 번호들: { 이름: string; 번호: number }[] = [];
    for (const 이름 of 이름들) 번호들.push({ 이름, 번호: (await 길드.길드원줄번호(이름)) ?? 99 });
    const 보인차례 = 번호들.sort((가, 나머지) => 가.번호 - 나머지.번호).map((x) => x.이름).join(', ');
    await verify('길드원 목록 차례를 읽으면 길드원 목록은 길드장이 맨 위이고 그다음 접속 중인 사람이다', 보인차례, 이름들.join(', '));
  });
});
