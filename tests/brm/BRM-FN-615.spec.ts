import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 봇들켜기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-615',
  name: '채팅 70줄을 보내면 기기에 남은 기록은 최근 60줄이다',
  platforms: ['android'],
  held: '보류 — 기기에 남은 채팅 기록 수를 읽을 주소를 모름',
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    기록수주소: z.string().describe('기기에 남은 채팅 기록 수를 읽는 오브젝트 주소'),
    기록수칸: z.string().describe('기록 수를 읽는 컴포넌트와 칸 (컴포넌트.칸)'),
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('채팅 70줄을 보낸다', async () => {
    await 봇들켜기(admin, [봇]);
    const 채팅 = await 채팅창.열기(game);
    for (let 번 = 1; 번 <= 70; 번 += 1) await 봇시키기(admin, 봇.아이디, `say:qa 줄 ${String(번)}`);
    await 채팅.글줄뜸('qa 줄 70', 30_000);
    await verify('채팅 70줄을 보내면 기기에 남은 기록은 최근 60줄이다', Number(await game.get(params.기록수주소, params.기록수칸)), 60);
  });
});
