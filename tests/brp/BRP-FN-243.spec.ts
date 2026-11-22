import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 첨부비운우편만들기, 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-243',
  name: '우편함 창을 한 번 열었다 닫은 뒤 다시 열면 그 우편 제목 앞 「●」가 없다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  const 첫제목 = '[QA] 먼저 받은 우편';
  const 새제목 = '[QA] 새로 온 우편';
  await test.step('첨부 없는 우편이 될 때까지 받은 뒤 창을 닫고 새 우편을 지급해 창을 열었다 닫고 다시 연다', async () => {
    const 첫 = await 첨부비운우편만들기(game, admin, 아이디, [{ 제목: 첫제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }]);
    await verify('먼저 받은 우편이 첨부 없음으로 바뀐다', 첫.비웠음, true, { blocker: true });
    await 첫.창.닫기();
    const 새 = await 우편지급하고창열기(game, admin, 아이디, [{ 제목: 새제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 1);
    await 새.창.닫기();
    const 다시 = await 우편함창.열기(game);
    const 번호 = await 다시.줄기다리기(새제목);
    await verify('새로 지급한 우편 줄이 있다', 번호 >= 0, true, { blocker: true });
    await verify('우편함 창을 한 번 열었다 닫은 뒤 다시 열면 그 우편 제목 앞 「●」가 없다', (await 다시.제목원문(번호)).includes('●'), false);
  });
});
