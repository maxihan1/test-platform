import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-324',
  name: '상점 창에 제목 「상점」, 「보유 골드 <골드>」, 상품 줄마다 이름 · 설명 · 가격 · 「구매」, 「닫기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('상점 창 제목').default('상점'),
    닫기: z.string().describe('닫기 버튼 글자').default('닫기'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('상점 창을 연다', async () => {
    const 상점 = await 상점창.열기(game);
    const 제목 = await verify('상점 창 제목이 「상점」이다', await 상점.제목글(), expected.제목);
    const 보유골드 = await verify('상점 창에 「보유 골드 <골드>」가 보인다', /^보유 골드 \d[\d,]*$/.test((await 상점.보유골드글()).trim()), true);
    const 줄들 = await verify('상품 줄마다 이름 · 설명 · 가격 · 「구매」가 보인다', await 상점.온전하지않은줄들(), []);
    const 닫기 = await verify('상점 창에 「닫기」가 보인다', await 상점.닫기글(), expected.닫기);
    await verify('상점 창에 제목 「상점」, 「보유 골드 <골드>」, 상품 줄마다 이름 · 설명 · 가격 · 「구매」, 「닫기」가 보인다', 제목 && 보유골드 && 줄들 && 닫기, true);
  });
});
