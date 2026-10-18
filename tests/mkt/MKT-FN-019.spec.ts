import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-019',
  name: '로그인 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['로그인 응답을 늦춰 두었다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 제출버튼 = page.locator('main').getByRole('button', { name: /^(로그인|처리 중)$/ });
  let 응답끝: Promise<unknown> = Promise.resolve();
  let 풀기!: () => void;
  const 신호 = new Promise<void>((끝) => {
    풀기 = 끝;
  });
  const 늦추기 = async (route: Route) => {
    await 신호;
    await route.continue();
  };

  try {
    await test.step('로그인 응답을 늦추고 로그인 화면을 연다', async () => {
      await 방해창막기(page);
      await page.context().route('**/api/auth/login', 늦추기);
      await 로그인.열기();
      await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 화면에서 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 로그인.채우기(params.loginId ?? '', params.loginPassword ?? '');
      const 요청 = page.waitForRequest((r) => r.url().includes('/api/auth/login'));
      응답끝 = page.waitForResponse((r) => r.url().includes('/api/auth/login')).catch(() => undefined);
      await 로그인.로그인버튼.click();
      await 요청;
      await verify('로그인 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 제출버튼.isDisabled(), true);
    });

    await test.step('응답을 기다리는 동안 「로그인」 버튼 글자를 확인한다', async () => {
      await verify(
        '응답을 기다리는 동안 버튼 글자 대신 로딩 표시가 보인다',
        { 로딩표시: await 나타났나(제출버튼.getByLabel('처리 중')), 글자: (await 제출버튼.innerText()).trim() },
        { 로딩표시: true, 글자: '' },
      );
    });
  } finally {
    풀기();
    await 응답끝;
    await page.context().unrouteAll({ behavior: 'ignoreErrors' });
  }
});
