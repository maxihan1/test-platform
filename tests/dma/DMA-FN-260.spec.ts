import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 결과줄뜰때까지, 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주소검색창 } from './pages/address-search.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 토스트글읽기, 토스트비우기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-260',
  name: '주소 검색어가 1자면 토스트가 보이고 2자면 검색 결과가 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주소 검색 창이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
    한글자검색어: z.string().describe('1자 주소 검색어 — 글자 한 개').default('역'),
    두글자검색어: z.string().describe('2자 주소 검색어 — 결과가 1건 이상인 글자 두 개').default('강남'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);
  const 창 = new 주소검색창(driver);
  const 상자 = new 토스트(driver);

  await test.step('일반 회원 계정으로 로그인해 주소 검색 창을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await 주문하기.주소검색열기();
  });

  await test.step('주소 검색 창을 확인한다', async () => {
    await verify('주소 검색 창이 떠 있다', await 창.보이나(), true, { blocker: true });
  });

  await test.step('1자 검색어 「역」으로 검색한다', async () => {
    await 토스트비우기(driver);
    await 창.주소찾기(params.한글자검색어);
    await verify(
      '주소 검색어가 1자면 토스트 「검색어를 2자 이상 입력하세요」가 보인다',
      await 토스트글읽기(driver),
      '검색어를 2자 이상 입력하세요',
    );
  });

  await test.step('2자 검색어 「강남」으로 검색한다', async () => {
    await 토스트비우기(driver);
    await 창.주소찾기(params.두글자검색어);
    await 결과줄뜰때까지(driver).catch(() => undefined);
    const 글 = (await 상자.보이나()) ? await 상자.글() : '';
    const 안내없음 = await verify('「검색어를 2자 이상 입력하세요」가 보이지 않는다', 글 !== '검색어를 2자 이상 입력하세요', true);
    const 줄있음 = await verify('검색 결과가 보인다', (await 창.결과줄글들()).length >= 1, true);
    await verify(
      '주소 검색어가 2자면 「검색어를 2자 이상 입력하세요」 없이 검색 결과가 보인다',
      안내없음 && 줄있음,
      true,
    );
  }, { capture: true });
});
