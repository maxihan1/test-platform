import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인부품 } from './components/login.component.js';
import { 홈부품 } from './components/home.component.js';

export const spec = defineCase({
  tcId: 'CDY-UI-004',
  name: '로그인 뒤 홈에 타일 넷과 「공지사항」, 「FAQ」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 이메일').optional().meta({ secret: true }),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈부품(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await new 로그인부품(page).로그인하기(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인 뒤 홈이 열린 것을 확인한다', async () => {
    const 보임 = await 홈.여정시작.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('로그인 뒤 홈에 「Journey Start!」가 보인다', 보임, true, { blocker: true });
  });

  await test.step('로그인 뒤 홈을 연다', async () => {
    await page.goto('/');

    let 보임 = await 홈.타일('교육과정').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에 「교육과정」 타일이 보인다', 보임, true);

    보임 = await 홈.타일('모집공고').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에 「모집공고」 타일이 보인다', 보임, true);

    보임 = await 홈.타일('교육 콘텐츠 알아보기').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에 「교육 콘텐츠 알아보기」 타일이 보인다', 보임, true);

    보임 = await 홈.타일('Codyssey 세계관').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에 「Codyssey 세계관」 타일이 보인다', 보임, true);

    보임 = await 홈.공지사항제목.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에 「공지사항」 제목이 보인다', 보임, true);

    보임 = await 홈.FAQ제목.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에 「FAQ」 제목이 보인다', 보임, true);
  });
});
