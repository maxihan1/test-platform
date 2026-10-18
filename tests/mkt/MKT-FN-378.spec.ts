import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품정보 } from './helpers/data.helper.js';
import { 상품상세_담기버튼, 상품상세_로딩표시, 상품상세_제목, 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-378',
  name: '응답이 1.5초 늦어도 기다리는 동안 버튼이 눌리지 않고 로딩 표시가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['응답을 1.5초 늦춰 두었다'],
  params: z.object({
    상품번호: z.number().int().min(1).describe('열어 볼 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 알림 = new 토스트(page);
  const 담기주소 = /\/api\/cart$/;
  const 준비: { 회원?: 회원정보 } = {};
  let 응답풀기: () => void = () => undefined;
  const 확인끝 = new Promise<void>((끝) => {
    응답풀기 = 끝;
  });

  try {
    await test.step('장바구니 담기 응답을 1.5초 늦춘다', async () => {
      await 방해창막기(page);
      await page.context().route(담기주소, async (경로) => {
        if (경로.request().method() === 'POST') {
          await Promise.all([new Promise((끝) => setTimeout(끝, 1500)), Promise.race([확인끝, new Promise((끝) => setTimeout(끝, 20000))])]);
        }
        await 경로.fallback();
      });
    });

    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('상품 상세 화면을 연다', async () => {
      const 상품 = await 상품정보(page.request, params.상품번호);
      await page.goto(`/shop/${params.상품번호}`);
      await 상품상세_제목(page, 상품.name).waitFor();
    });

    await test.step('상품 상세 화면이 열렸는지 확인한다', async () => {
      await verify('장바구니 담기 버튼이 눌린다', await 상품상세_담기버튼(page).isEnabled(), true, { blocker: true });
    });

    await test.step('늦은 응답 동안 장바구니 담기 버튼을 확인한다', async () => {
      const 화면오류 = new Promise<'화면 오류'>((끝) => page.once('pageerror', () => 끝('화면 오류')));
      await 상품상세_담기버튼(page).click();
      const 먼저 = await Promise.race([
        상품상세_로딩표시(page)
          .waitFor()
          .then(() => '로딩' as const)
          .catch(() => '로딩 없음' as const),
        화면오류,
      ]);
      const 눌리지않음 = await 상품상세_담기버튼(page).isDisabled();
      const 로딩표시 = await 상품상세_로딩표시(page).isVisible();
      await verify(
        '응답이 1.5초 늦어도 기다리는 동안 버튼이 눌리지 않고 로딩 표시가 보인다',
        { 눌리지않음, 로딩표시 },
        { 눌리지않음: true, 로딩표시: true },
      );
      응답풀기();
      if (먼저 === '로딩') await 알림.뜰때까지('장바구니에 담았습니다');
    });
  } finally {
    응답풀기();
    await page.context().unroute(담기주소);
    await 회원과주문정리(page.request, 준비.회원);
  }
});
