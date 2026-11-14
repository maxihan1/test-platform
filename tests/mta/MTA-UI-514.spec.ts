import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 서버 } from './helpers/app.helper.js';
import { 탭주소글 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-514',
  name: '「이용 약관」은 https://<서버>/terms를 열고, 우리 서버는 약관 문서가 없어 빈 화면이나 안내가 나올 수 있다',
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
  try {
    await test.step('「Mastodon에 대해」에서 「이용 약관」을 누른다', async () => {
      await 정보.줄누르기('이용 약관');
      const 열림 = await verify('앱 안 웹 화면이 열린다', (await 탭주소글(driver)) !== '', true);
      const 도메인 = await verify('웹 화면 주소에 서버 도메인이 들어 있다', (await 탭주소글(driver)).includes(서버), true);
      await verify('「이용 약관」은 https://<서버>/terms를 열고, 우리 서버는 약관 문서가 없어 빈 화면이나 안내가 나올 수 있다', 열림 && 도메인, true);
    }, { capture: true });
  } finally {
    await 뒤로(driver);
  }
});
