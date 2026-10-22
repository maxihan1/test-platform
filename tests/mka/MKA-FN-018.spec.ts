import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 상품읽기, 서버로그인, 새주문모두취소, 주문목록읽기 } from './helpers/api.helper.js';
import { 화면아래에있나 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-018',
  name: '「받는 분」을 비우고 결제하면 서버가 돌려준 오류 문구가 화면 아래 토스트로 보인다',
  platforms: ['android'],
  precondition: ['주문하기의 다른 칸은 바르게 채웠다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('바로 구매할 상품 번호 — 품절이 아닌 상품').default(34),
    받는분: z.string().describe('받는 분 이름 — 비어 있지 않은 글자').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    상세주소: z.string().describe('상세 주소 — 비어 있지 않은 글자').default('4층'),
    주소검색어: z.string().describe('주소 검색어 — 결과가 있는 2자 이상 글자').default('테헤란'),
    결제수단: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단').default('계좌이체'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 주문하기 = new 주문하기화면(driver);
  const 알림 = new 토스트(driver);

  await 서버로그인(request, 아이디, 비밀번호);
  const 상품 = await 상품읽기(request, params.상품번호);
  const 앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('상품 상세에서 「바로 구매」를 눌러 주문하기를 연다', async () => {
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
      await 상세.바로구매누르기();
      await verify('주문하기 화면이 보인다', await 주문하기.열릴때까지(), true, { blocker: true });
    });

    await test.step('주문하기의 칸을 바르게 채운다', async () => {
      await 주문하기.다채우기(
        { 받는분: params.받는분, 연락처: params.연락처, 상세주소: params.상세주소 },
        params.주소검색어,
        params.결제수단,
      );
      await 주문하기.동의누르기();
      await verify('「결제하기」 버튼이 눌린다', await 주문하기.결제눌리나(), true, { blocker: true });
    });

    await test.step('주문하기에서 「받는 분」만 비우고 결제한다', async () => {
      await 주문하기.칸적기('receiver', '');
      await 주문하기.결제누르기();
      const 글 = await verify('토스트에 「받는 분을 입력하세요」가 보인다', await 알림.글(), '받는 분을 입력하세요');
      const 아래 = await verify('토스트가 화면 아래에 있다', await 화면아래에있나(driver, 알림.틀), true);
      await verify('「받는 분」을 비우고 결제하면 서버가 돌려준 오류 문구가 화면 아래 토스트로 보인다', 글 && 아래, true);
    });
  } finally {
    await 새주문모두취소(request, 앞번호들);
  }
});
