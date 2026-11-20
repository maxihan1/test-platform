import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 금색인가, 길드미리만들기, 로비준비, 초록인가, 태그뗀글, 표시색 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-556',
  name: '길드원 줄을 읽으면 길드원 줄에 접속 점 · 금색 「[길드장]」 · 이름 · 「Lv.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 번째 플레이어 봇이 접속한 길드원이다'],
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
  await test.step('길드를 만든 일반 회원의 길드에 두 번째 플레이어 봇이 길드원으로 들어간 뒤 로비에 들어간다', async () => {
    await verify('일반 회원이 길드장이고 두 번째 플레이어 봇이 접속한 길드원이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa556', 들어옴: [봇] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('길드원 줄을 읽는다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 2명');
    const 줄 = await 길드.길드원줄원문(0);
    const 점 = await verify('길드원 줄의 접속 점이 초록이다', 초록인가(표시색(줄, '●')), true);
    const 표시 = await verify('길드원 줄의 「[길드장]」가 금색이다', 금색인가(표시색(줄, '[길드장]')), true);
    const 이름 = await verify('길드원 줄에 이름이 보인다', 태그뗀글(줄)?.includes(나.아이디) ?? false, true);
    const 레벨 = await verify('길드원 줄에 「Lv.」가 보인다', 태그뗀글(줄)?.includes('Lv.') ?? false, true);
    await verify('길드원 줄을 읽으면 길드원 줄에 접속 점 · 금색 「[길드장]」 · 이름 · 「Lv.」가 보인다', 점 && 표시 && 이름 && 레벨, true);
  });
});
