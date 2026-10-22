import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 바로구매로열기 } from './helpers/checkout-flow.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-067',
  name: '주문하기 맨 위 줄에 「주문하기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('열어 볼 상품 번호 — 색상과 사이즈 옵션이 있는 품절 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  let 줄글 = '';
  let 상품명 = '';

  await test.step('일반 회원으로 로그인한다', async () => {
    await 서버로그인(request, params.loginId ?? '', params.loginPassword ?? '');
    const 상품 = await 상품읽기(request, params.상품번호);
    상품명 = 상품.name;
    줄글 = `${상품.name} (${상품.colors?.[0] ?? ''} / ${상품.sizes?.[0] ?? ''}) × 1 ${원(상품.salePrice)}`;
    const 열림 = await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상품 목록이 보인다', 열림, true, { blocker: true });
  });

  await test.step('옵션 상품으로 「바로 구매」를 누른다', async () => {
    const 열림 = await 바로구매로열기(driver, 상품명);
    await verify('주문하기 화면이 보인다', 열림, true, { blocker: true });
    await verify('주문하기 맨 위 줄에 「주문하기」가 보인다', await new 머리줄(driver).제목글(), '주문하기');
    await verify('「주문 상품」 아래 줄이 「{상품명} ({옵션}) × {수량} {금액}」 꼴로 보인다', (await new 주문하기화면(driver).주문상품줄들()).join(', '), 줄글);
  });
});
