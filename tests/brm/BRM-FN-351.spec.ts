import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 금색인가, 로비와봇준비, 접속중인가, 태그뗀글, 파티에초대해맺기, 표시색 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-351',
  name: '친구 · 파티 창의 파티 목록을 보면 파티 목록에서 파티장 「qa_player1」 이름 앞에 금색 「★」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 파티장이고 두 번째 플레이어 봇이 파티원이다'],
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
  await test.step('두 번째 플레이어 봇을 켜고 일반 회원이 초대해 파티를 만든다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('일반 회원이 파티장이고 두 번째 플레이어 봇이 파티원이다', await 파티에초대해맺기(game, admin, 나, 봇), true, { blocker: true });
  });
  await test.step('친구 · 파티 창의 파티 목록을 본다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.파티머리가될때까지('파티 2/4');
    const 장줄 = await 창.글있는줄원문('★');
    const 금색 = await verify('파티장 줄의 「★」가 금색이다', 금색인가(표시색(장줄, '★')), true);
    const 앞 = await verify('「★」가 파티장 「qa_player1」 이름 앞에 보인다', 태그뗀글(장줄)?.startsWith(`★ ${나.아이디}`) ?? false, true);
    await verify('친구 · 파티 창의 파티 목록을 보면 파티 목록에서 파티장 「qa_player1」 이름 앞에 금색 「★」가 보인다', 금색 && 앞, true);
  });
});
