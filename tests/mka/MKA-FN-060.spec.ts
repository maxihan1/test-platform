import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 아래에있나 } from './helpers/screen-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-060',
  name: '「아이디」를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('「아이디」를 비우고 「비밀번호」만 적어 「로그인」을 누른다', async () => {
    await 로그인.로그인('', params.loginPassword ?? '');
    const 글 = await verify('「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글(), '아이디와 비밀번호를 입력하세요');
    const 아래 = await verify('안내가 입력칸 아래에 있다', await 아래에있나(로그인.비밀번호칸, 로그인.오류), true);
    await verify('「아이디」를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다', 글 && 아래, true);
  });

  await test.step('앱을 다시 켜서 로그인 화면을 확인한다', async () => {
    await 앱다시켜기(driver);
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('「비밀번호」를 비우고 「아이디」만 적어 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.loginId ?? '', '');
    const 글 = await verify('「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글(), '아이디와 비밀번호를 입력하세요');
    const 아래 = await verify('안내가 입력칸 아래에 있다', await 아래에있나(로그인.비밀번호칸, 로그인.오류), true);
    await verify('「비밀번호」를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다', 글 && 아래, true);
  });
});
