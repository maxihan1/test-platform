import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 아이템표읽기, 표값글 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-450',
  name: '「/gm data item」을 보내면 무기 · 갑옷 7종 값이 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:녹슨 단검', 'item:강철 롱소드', 'item:룬 새김 도끼', 'item:불꽃의 검', 'item:가죽 갑옷', 'item:사슬 갑옷', 'item:용비늘 갑옷'],
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
  await test.step('「/gm data item」을 보내 무기 · 갑옷 줄을 읽는다', async () => {
    const 표 = await 아이템표읽기(game);
    const 값 = (이름: string): string => 표값글(표.find((줄) => 줄.이름 === 이름));
    const a = await verify.element('녹슨 단검 표 값이 아이템 표와 같다', 'item:녹슨 단검', 값('녹슨 단검'), '무기 · 일반 · 상점가 80 · 판매가 20');
    const b = await verify.element('강철 롱소드 표 값이 아이템 표와 같다', 'item:강철 롱소드', 값('강철 롱소드'), '무기 · 희귀 · 상점가 350 · 판매가 87');
    const c = await verify.element('룬 새김 도끼 표 값이 아이템 표와 같다', 'item:룬 새김 도끼', 값('룬 새김 도끼'), '무기 · 영웅 · 상점가 900 · 판매가 225');
    const d = await verify.element('불꽃의 검 표 값이 아이템 표와 같다', 'item:불꽃의 검', 값('불꽃의 검'), '무기 · 전설 · 상점가 없음 · 판매가 500');
    const e = await verify.element('가죽 갑옷 표 값이 아이템 표와 같다', 'item:가죽 갑옷', 값('가죽 갑옷'), '갑옷 · 일반 · 상점가 100 · 판매가 25');
    const f = await verify.element('사슬 갑옷 표 값이 아이템 표와 같다', 'item:사슬 갑옷', 값('사슬 갑옷'), '갑옷 · 희귀 · 상점가 400 · 판매가 100');
    const h = await verify.element('용비늘 갑옷 표 값이 아이템 표와 같다', 'item:용비늘 갑옷', 값('용비늘 갑옷'), '갑옷 · 전설 · 상점가 없음 · 판매가 500');
    await verify('「/gm data item」을 보내면 무기 · 갑옷 7종 값이 아이템 표와 같다', a && b && c && d && e && f && h, true);
  });
});
