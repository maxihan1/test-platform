import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필책자화면 } from './pages/directory.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-165',
  name: '프로필 책자에 「새로운 사람들」 · 「최근 활동」 · 「mastodon.maxihan.com에서만」 · 「알려진 연합우주로부터」 필터가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 책자 = new 프로필책자화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('프로필 책자를 연다', async () => {
    await 책자.열기();
    await verify('프로필 책자 화면이 열려 있다', new URL(page.url()).pathname, '/directory', { blocker: true });
    const 새로운 = await verify('「새로운 사람들」 필터가 보인다', await 책자.필터('새로운 사람들').isVisible(), true);
    const 최근 = await verify('「최근 활동」 필터가 보인다', await 책자.필터('최근 활동').isVisible(), true);
    const 로컬 = await verify('「mastodon.maxihan.com에서만」 필터가 보인다', await 책자.필터('mastodon.maxihan.com에서만').isVisible(), true);
    const 연합 = await verify('「알려진 연합우주로부터」 필터가 보인다', await 책자.필터('알려진 연합우주로부터').isVisible(), true);
    await verify('프로필 책자에 「새로운 사람들」 · 「최근 활동」 · 「mastodon.maxihan.com에서만」 · 「알려진 연합우주로부터」 필터가 보인다', 새로운 && 최근 && 로컬 && 연합, true);
    await verify('발견 가능한 hana_photo 계정 카드가 보인다', await 책자.계정카드('hana_photo').isVisible(), true);
  });
});
