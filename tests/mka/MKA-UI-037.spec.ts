import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 상품읽기 } from './helpers/api.helper.js';
import { 원 } from './helpers/app.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-037',
  name: '상품 상세 맨 위 줄에 「상품 상세」가 보이고 분류 · 상품명 · 판매가 · 요약 · 설명이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    할인상품번호: z.number().describe('할인 중인 상품 번호').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('할인 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.할인상품번호);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    const 제목 = await verify('「상품 상세」가 보인다', await new 머리줄(driver).제목글(), '상품 상세');
    const 분류 = await verify('분류가 보인다', (await 상세.화면글()).includes(상품.category), true);
    const 이름 = await verify('상품명이 보인다', await 상세.상품명.getText().catch(() => ''), 상품.name);
    const 판매가 = await verify('판매가가 보인다', await 상세.판매가.getText().catch(() => ''), 원(상품.salePrice));
    const 요약 = await verify('요약이 보인다', (await 상세.화면글()).includes(상품.summary), true);
    const 설명 = await verify('설명이 보인다', await 상세.설명.getText().catch(() => ''), 상품.description ?? '');
    await verify('상품 상세 맨 위 줄에 「상품 상세」가 보이고 분류 · 상품명 · 판매가 · 요약 · 설명이 보인다', 제목 && 분류 && 이름 && 판매가 && 요약 && 설명, true);
  });
});
