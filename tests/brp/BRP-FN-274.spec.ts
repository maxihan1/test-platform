import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 첨부비운우편만들기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-274',
  name: '하나뿐인 첨부 없는 우편을 「삭제」하면 목록이 비어 「받은 우편이 없습니다」가 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 우편함에 첨부 없는 우편 하나만 있다', '두 번째 플레이어 우편함에 첨부 없는 우편 둘이 있다'],
  techniques: ['경계값 분석'],
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

  const 남길제목 = '[QA] 남길 우편';
  const 삭제제목 = '[QA] 삭제할 우편';
  await test.step('첨부 없는 우편 둘을 만든 것을 확인한다', async () => {
    const 결과 = await 첨부비운우편만들기(game, admin, 아이디, [{ 제목: 남길제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }, { 제목: 삭제제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }]);
    await verify('우편 줄 둘이 모두 「첨부 없음」이다', 결과.비웠음, true, { blocker: true });
  });

  await test.step('한 우편 줄의 「삭제」를 누른다', async () => {
    const 우편함 = await 우편함창.열기(game);
    await 우편함.삭제누르기(await 우편함.줄찾기(삭제제목));
    await 우편함.제목사라질때까지(삭제제목, 10_000);
    await verify('첨부 없는 우편 둘 가운데 하나만 「삭제」한 뒤 그 우편만 목록에서 사라지고 우편 줄이 하나 남는다', (await 우편함.제목들()).join(', '), 남길제목);
  });

  await test.step('그 우편 줄의 「삭제」를 누른다', async () => {
    const 우편함 = await 우편함창.열기(game);
    await 우편함.삭제누르기(await 우편함.줄찾기(남길제목));
    await verify('하나뿐인 첨부 없는 우편을 「삭제」하면 목록이 비어 「받은 우편이 없습니다」가 보인다', await 우편함.빈안내뜰때까지(10_000), true);
  });
});
