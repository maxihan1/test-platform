import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로 } from './helpers/app.helper.js';
import { 탭주소글 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-442',
  name: '「Mastodon에 기여」는 GitHub 저장소, 「개인정보 정책」은 https://joinmastodon.org/privacy-policy를 연다',
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
  await test.step('설정에서 「Mastodon에 대해」를 연다', async () => {
    await 설정.열기();
    await 설정.줄누르기('Mastodon에 대해');
    await verify('「Mastodon에 대해」 화면에 「추가 설정」 줄이 보인다', await 정보.떴나(), true, { blocker: true });
  });
  await test.step('「Mastodon에 대해」에서 「Mastodon에 기여」와 「개인정보 정책」을 누른다', async () => {
    const 기여줄 = await verify('「Mastodon에 기여」 줄이 보인다', (await 정보.제목글들()).includes('Mastodon에 기여'), true);
    let 깃허브 = false;
    if (기여줄) {
      await 정보.줄누르기('Mastodon에 기여');
      깃허브 = (await 탭주소글(driver)).includes('github.com');
      await 뒤로(driver);
    }
    const 깃허브열림 = await verify('「Mastodon에 기여」가 GitHub 저장소를 연다', 깃허브, true);
    await 정보.줄누르기('개인정보 정책');
    const 개인정보 = await verify('「개인정보 정책」이 https://joinmastodon.org/privacy-policy 를 연다', (await 탭주소글(driver)).includes('joinmastodon.org'), true);
    await verify('「Mastodon에 기여」는 GitHub 저장소, 「개인정보 정책」은 https://joinmastodon.org/privacy-policy를 연다', 깃허브열림 && 개인정보, true);
    await 뒤로(driver);
  }, { capture: true });
});
