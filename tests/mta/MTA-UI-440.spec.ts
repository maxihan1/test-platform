import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-440',
  name: '「Mastodon에 대해」에 「추가 설정」 · 「Mastodon에 기여」 · 「이용 약관」 · 「개인정보 정책」 · 「미디어 캐시 지우기」와 맨 아래 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 정보 = new 앱정보화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 「Mastodon에 대해」를 연다', async () => {
    await 설정.줄누르기('Mastodon에 대해');
    await verify('「Mastodon에 대해」 화면이 열린다', await 정보.떴나(), true);
    const 제목들 = await 정보.제목글들();
    const 추가 = await verify('「추가 설정」이 보인다', 제목들.includes('추가 설정'), true);
    const 기여 = await verify('「Mastodon에 기여」가 보인다', 제목들.includes('Mastodon에 기여'), true);
    const 약관 = await verify('「이용 약관」이 보인다', 제목들.includes('이용 약관'), true);
    const 개인정보 = await verify('「개인정보 정책」이 보인다', 제목들.includes('개인정보 정책'), true);
    const 캐시 = await verify('「미디어 캐시 지우기」가 보인다', 제목들.includes('미디어 캐시 지우기'), true);
    const 버전 = await verify('맨 아래에 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다', await 정보.글보이나('안드로이드용 마스토돈 v2.13.5 (194)'), true);
    await verify('「Mastodon에 대해」에 「추가 설정」 · 「Mastodon에 기여」 · 「이용 약관」 · 「개인정보 정책」 · 「미디어 캐시 지우기」와 맨 아래 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다', 추가 && 기여 && 약관 && 개인정보 && 캐시 && 버전, true);
  }, { capture: true });
});
