import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 가방채우기, 글자색, 아이템표읽기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-173',
  name: '「/gm data item」을 보내면 아이템 등급이 일반 · 희귀 · 영웅 · 전설 넷이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '일반 회원이 가방에 녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 불꽃의 검을 가지고 로비에 있다'],
  elements: ['item:녹슨 단검', 'item:강철 롱소드', 'item:룬 새김 도끼', 'item:불꽃의 검'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('「/gm data item」을 보낸다', async () => {
    const 표 = await 아이템표읽기(game);
    const 등급들 = ['일반', '희귀', '영웅', '전설'].filter((등급) => 표.some((줄) => 줄.값['등급'] === 등급));
    const 넷뿐 = await verify('아이템 등급이 넷 밖으로 나오지 않는다', 표.filter((줄) => !['일반', '희귀', '영웅', '전설'].includes(줄.값['등급'] ?? '')).length, 0);
    const 넷 = await verify('아이템 등급이 일반 · 희귀 · 영웅 · 전설이다', 등급들.join(' · '), '일반 · 희귀 · 영웅 · 전설');
    await verify('「/gm data item」을 보내면 아이템 등급이 일반 · 희귀 · 영웅 · 전설 넷이다', 넷뿐 && 넷, true);
  });
  await test.step('일반 회원이 가방에 녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 불꽃의 검을 갖춘다', async () => {
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '강철 롱소드', 개수: 1 }, { 이름: '룬 새김 도끼', 개수: 1 }, { 이름: '불꽃의 검', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 불꽃의 검 줄이 있다', await 가방.이름줄수('불꽃의 검'), 1, { blocker: true });
  });
  await test.step('가방 창을 열고 아이템 이름 글자색을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 일반 = await verify('일반 등급 녹슨 단검의 글자색이 「#E8E2D6」이다', 글자색((await 가방.줄이름색(await 가방줄(가방, '녹슨 단검'))) ?? ''), '#E8E2D6');
    const 희귀 = await verify('희귀 등급 강철 롱소드의 글자색이 「#5AB8FF」다', 글자색((await 가방.줄이름색(await 가방줄(가방, '강철 롱소드'))) ?? ''), '#5AB8FF');
    const 영웅 = await verify('영웅 등급 룬 새김 도끼의 글자색이 「#C77DFF」다', 글자색((await 가방.줄이름색(await 가방줄(가방, '룬 새김 도끼'))) ?? ''), '#C77DFF');
    const 전설 = await verify('전설 등급 불꽃의 검의 글자색이 「#FF9A3C」다', 글자색((await 가방.줄이름색(await 가방줄(가방, '불꽃의 검'))) ?? ''), '#FF9A3C');
    await verify('아이템 이름 글자색이 일반 #E8E2D6 · 희귀 #5AB8FF · 영웅 #C77DFF · 전설 #FF9A3C 다', 일반 && 희귀 && 영웅 && 전설, true);
  });
});
