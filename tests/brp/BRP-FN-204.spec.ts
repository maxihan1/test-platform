import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아이템표읽기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-204',
  name: '상점 창을 열어 상품 이름을 읽으면 상점은 녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약 · 조약돌 9종을 판다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('상점 창을 열어 상품 이름을 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    const 이름들 = (await 상점.줄들()).map((줄) => 줄.이름);
    await 상점.닫기();
    await verify('상점 창을 열어 상품 이름을 읽으면 상점은 녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약 · 조약돌 9종을 판다', 이름들.join(' · '), '녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약 · 조약돌');
    const 표 = await 아이템표읽기(game);
    const 어긋남 = 이름들.filter((이름) => 표[이름]?.등급 === '전설' || (표[이름]?.분류 === '전리품' && 이름 !== '조약돌'));
    await verify('상점에 전설 장비와 「조약돌」 밖의 전리품이 없다', 어긋남, []);
  });
});
