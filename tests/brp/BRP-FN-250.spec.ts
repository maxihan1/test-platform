import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글읽기, 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기, 지급회수 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-250',
  name: '첨부가 회수된 우편의 「받기」를 누르면 오류 알림 「받을 첨부가 없습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 우편함 창에 첨부 있는 우편이 보인다'],
  techniques: ['동등 분할'],
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

  const 제목 = '[QA] 회수될 우편';
  let 지급번호 = 0;
  await test.step('첨부 있는 우편이 우편함 창에 보이는 것을 확인한다', async () => {
    const { 창, 번호 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 1);
    지급번호 = 번호[0] ?? 0;
    const 줄 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 줄 >= 0, true, { blocker: true });
    await verify('지급한 우편 줄에 「받기」 버튼이 보인다', await 창.받기버튼있나(줄), true, { blocker: true });
  });

  await test.step('운영 API 로 그 첨부를 회수한 뒤 창에 남은 「받기」를 누른다', async () => {
    await 지급회수(admin, 지급번호);
    const 창 = await 우편함창.열기(game);
    await 창.받기누르기(await 창.줄찾기(제목));
    const 알림 = await 알림글읽기(game, '받을 첨부가 없습니다', 10_000);
    await verify('첨부가 회수된 우편의 「받기」를 누르면 오류 알림 「받을 첨부가 없습니다」가 뜬다', (알림 ?? '').includes('받을 첨부가 없습니다'), true);
  });
});
