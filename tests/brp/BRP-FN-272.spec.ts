import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 첨부비운우편만들기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-272',
  name: '첨부 없는 우편의 「삭제」를 누르면 확인 창 없이 바로 지워진다',
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

  const 제목 = '[QA] 바로 지울 우편';
  await test.step('첨부 없는 우편 하나를 만든 것을 확인한다', async () => {
    const 결과 = await 첨부비운우편만들기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }]);
    await verify('우편 줄이 「첨부 없음」이다', 결과.비웠음, true, { blocker: true });
  });

  await test.step('첨부 없는 우편 줄의 「삭제」를 누른다', async () => {
    const 창 = await 우편함창.열기(game);
    await 창.삭제누르기(await 창.줄찾기(제목));
    const 지워짐 = await verify('우편 줄이 목록에서 사라진다', await 창.제목사라질때까지(제목, 10_000), true);
    const 창없음 = await verify('확인 창이 뜨지 않는다', await new 안내창(game).보이나(), false);
    await verify('첨부 없는 우편의 「삭제」를 누르면 확인 창 없이 바로 지워진다', 지워짐 && 창없음, true);
  });
});
