import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기, 우편함비었음뜰때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-280',
  name: '첨부 0건인 우편을 「삭제」하면 목록에서 사라지고 「받은 우편이 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 첨부 0건인 우편 한 통만 와 있다', '두 번째 플레이어에게 첨부 1건인 우편 한 통만 와 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어에게 첨부 0건인 우편 한 통만 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 280' }]);
    await verify('우편 줄에 「받기」 버튼이 없다', await 함.받기버튼있나(0), false, { blocker: true });
  });
  await test.step('그 우편의 「삭제」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.삭제(0);
    await 우편함비었음뜰때까지(game);
    const 사라짐 = await verify('목록에 「QA 우편 280」 줄이 없다', await 함.줄찾기('QA 우편 280'), null);
    const 안내 = await verify('「받은 우편이 없습니다」가 보인다', await 함.비었음글(), '받은 우편이 없습니다');
    await verify('첨부 0건인 우편을 「삭제」하면 목록에서 사라지고 「받은 우편이 없습니다」가 보인다', 사라짐 && 안내, true);
  });
  await test.step('두 번째 플레이어에게 첨부 1건인 우편 한 통만 와 있다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 280 첨부', 아이템: [{ 이름: '체력 물약', 개수: 1 }] }]);
    await verify('우편 줄에 「받기」 버튼이 있다', await 함.받기버튼있나(0), true, { blocker: true });
  });
  await test.step('첨부 1건인 우편 한 통만 있는 우편함에서 그 우편의 「삭제」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.삭제(0);
    await hud.알림뜸('첨부를 먼저 받아 주세요');
    await verify('목록에 그대로 남는다', (await 함.줄찾기('QA 우편 280 첨부')) !== null, true);
  });
});
