import { defineCase, test, verify } from '@platform/kit';

import { 로그인부품 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-001',
  name: '로그인 화면에 입력칸 둘과 버튼 둘, 링크 하나가 모두 보인다',
  platforms: ['desktop'],
  precondition: ['로그아웃 상태다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 부품 = new 로그인부품(page);
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 부품.열기();

    const 이메일칸보임 = await 부품.이메일칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 이메일 입력칸이 보인다', 이메일칸보임, true);

    const 비밀번호칸보임 = await 부품.비밀번호칸
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 비밀번호 입력칸이 보인다', 비밀번호칸보임, true);

    const 로그인버튼보임 = await 부품.로그인버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', 로그인버튼보임, true);

    const 회원가입버튼보임 = await 화면.회원가입버튼
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 「회원가입」 버튼이 보인다', 회원가입버튼보임, true);

    const 비밀번호찾기보임 = await 화면.비밀번호찾기링크
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('로그인 화면에 「비밀번호 찾기」 링크가 보인다', 비밀번호찾기보임, true);
  });
});
