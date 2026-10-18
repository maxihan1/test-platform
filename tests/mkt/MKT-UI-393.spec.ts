import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-393',
  name: '상품 상세 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    productId: z.number().describe('열어 볼 상품 번호 — 색상과 사이즈 옵션이 있고 품절이 아닌 상품').default(5),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 알림 = new 토스트(page);
  const 로그인 = new 로그인화면(page);

  await test.step('회원으로 로그인하고 상품 상세를 연다', async () => {
    await 방해창막기(page);
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 상세.열기(params.productId);
  });

  await test.step('회원으로 로그인해 있는지 확인한다', async () => {
    await 상세.머리글.로그인꼴일때까지();
    const 세션 = (await (await page.request.get('/api/session')).json()) as { user: unknown };
    await verify('회원으로 로그인해 있다', 세션.user !== null, true, { blocker: true });
  });

  await test.step('상품 상세에서 「이미지 2」를 누른다', async () => {
    await 상세.썸네일(2).click();
    await 상세.선택된썸네일일때까지(2);
    await verify('상품 상세에서 「이미지 2」를 누르면 큰 이미지가 2번째 이미지로 바뀐다', await 상세.큰이미지.getAttribute('src'), await 상세.썸네일그림(2).getAttribute('src'));
    await 상세.썸네일(1).click();
  });

  await test.step('상품 상세에서 「크게 보기」를 누른다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대창.waitFor();
    await verify('상품 상세에서 「크게 보기」를 누르면 확대 보기 모달이 뜬다', await 상세.확대창.isVisible(), true);
    await page.keyboard.press('Escape');
    await 상세.확대보기닫힐때까지();
  });

  await test.step('상품 상세에서 「상품 문의」를 누른다', async () => {
    await 상세.문의탭.click();
    await 상세.문의패널.waitFor();
    await verify('상품 상세에서 「상품 문의」를 누르면 상품 문의 내용이 보인다', await 상세.문의패널.isVisible(), true);
    await 상세.설명탭.click();
  });

  await test.step('상품 상세에서 「수량 늘리기」를 누른다', async () => {
    await 상세.수량늘리기.click();
    await verify('상품 상세에서 「수량 늘리기」를 누르면 수량이 2가 된다', await 상세.수량칸.inputValue(), '2');
    await 상세.수량줄이기.click();
  });

  await test.step('상품 상세에서 「장바구니 담기」를 누른다', async () => {
    await 상세.담기.click();
    await 알림.모두.last().or(로그인.제목).first().waitFor();
    const 알림글 = (await 알림.모두.count()) > 0 ? await 알림.모두.last().innerText() : '토스트 없이 로그인 화면으로 감';
    await verify('상품 상세에서 「장바구니 담기」를 누르면 옵션 상품은 「옵션을 선택하세요」 토스트가 뜬다', 알림글, '옵션을 선택하세요');
    await 상세.열기(params.productId);
  });

  await test.step('상품 상세에서 「바로 구매」를 누른다', async () => {
    await 상세.바로구매.click();
    await 알림.모두.last().or(로그인.제목).first().waitFor();
    const 알림글 = (await 알림.모두.count()) > 0 ? await 알림.모두.last().innerText() : '토스트 없이 로그인 화면으로 감';
    await verify('상품 상세에서 「바로 구매」를 누르면 옵션 상품은 「옵션을 선택하세요」 토스트가 뜬다', 알림글, '옵션을 선택하세요');
  });
});
