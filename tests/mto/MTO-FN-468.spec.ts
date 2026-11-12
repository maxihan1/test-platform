import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 상세열기, 일회용계정만들기 } from './helpers/account.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 이메일바꾸기화면 } from './pages/change-email.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-468',
  name: '「새 이메일」을 적고 「이메일 바꾸기」를 누르면 계정 상세로 돌아가 「이메일이 성공적으로 변경되었습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 이메일 미확인 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 이메일 = new 이메일바꾸기화면(page);
  let 계정: 일회용계정 | undefined;
  let 새이메일 = '';

  try {

    await test.step('일회용 계정을 가입시키고 Owner 계정으로 로그인한다', async () => {
      계정 = await 일회용계정만들기(page);
      await 로그인하기(page, params.loginId, params.loginPassword);
    });

    await test.step('이메일 미확인 계정 상세를 열어 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 상세열기(page, 아이디);
      await verify('케이스가 만든 이메일 미확인 계정이 있다', await 상세.확인링크다시보내기.isVisible(), true, { blocker: true });
    });

    await test.step('그 계정의 「이메일 바꾸기」 화면에서 새 이메일을 적고 「이메일 바꾸기」를 누른다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 상세.이메일바꾸기.click();
      await 이메일.그려질때까지();
      새이메일 = `${아이디}b@maxihan.com`;
      await 이메일.이메일바꾸기(새이메일);
      const 떴다 = await verify('「이메일이 성공적으로 변경되었습니다!」가 보인다', await 이메일.알림.글('이메일이 성공적으로 변경되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 돌아옴 = await verify('계정 상세로 돌아간다', await 상세.카운터.isVisible(), true);
      await verify('「새 이메일」을 적고 「이메일 바꾸기」를 누르면 계정 상세로 돌아가 「이메일이 성공적으로 변경되었습니다!」가 보인다', 떴다 && 돌아옴, true);
    });

    await test.step('돌아온 계정 상세에서 「확인되지 않은 이메일 주소」를 확인한다', async () => {
      const 보임 = await verify('「확인되지 않은 이메일 주소」 줄이 보인다', await 상세.미확인이메일칸.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 글 = 보임 ? (await 상세.미확인이메일칸.innerText()).trim() : '';
      await verify('「확인되지 않은 이메일 주소」에 새 이메일이 보인다', 글, 새이메일);
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
