import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-525',
  name: '상점 상품 줄을 차례로 읽으면 상점 상품 줄이 9줄이고 기획서 상점 표 차례대로 보인다',
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

  await test.step('상점 상품 줄을 차례로 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    const 이름들 = (await 상점.줄들()).map((줄) => 줄.이름);
    await 상점.닫기();
    const 줄수 = await verify('상점 상품 줄이 9줄이다', 이름들.length, 9);
    const 차례 = await verify('상점 상품 줄이 기획서 상점 표 차례대로 보인다', 이름들.join(' · '), '녹슨 단검 · 강철 롱소드 · 룬 새김 도끼 · 가죽 갑옷 · 사슬 갑옷 · 행운의 반지 · 현자의 목걸이 · 체력 물약 · 조약돌');
    await verify('상점 상품 줄을 차례로 읽으면 상점 상품 줄이 9줄이고 기획서 상점 표 차례대로 보인다', 줄수 && 차례, true);
  });

  await test.step('상점 상품 줄을 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    const 줄들 = await 상점.줄들();
    const 버튼수 = await 상점.구매버튼있는줄수();
    await 상점.닫기();
    const 빠짐 = 줄들.filter((줄) => 줄.이름 === '' || 줄.설명.trim() === '' || !/^[\d,]+ G$/.test(줄.가격글.trim())).map((줄) => 줄.이름);
    const 글 = await verify('상품 줄마다 이름 · 설명 · 「 G」 가격이 보인다', 빠짐, []);
    const 버튼 = await verify('상품 줄마다 「구매」가 보인다', 버튼수, 줄들.length);
    await verify('상점 상품 줄마다 이름 · 설명 · 「 G」 가격 · 「구매」가 보인다', 글 && 버튼, true);
  });
});
