import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 상세열기, 일회용계정만들기 } from './helpers/account.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 계정정지하기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-095',
  name: '데이터를 지운 계정 상세를 열면 「이 계정의 데이터는 복구할 수 없도록 삭제되었습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만들어 데이터를 지운 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 계정: 일회용계정 | undefined;
  let 번호 = '';

  try {

    await test.step('Owner 계정으로 로그인하고 일회용 계정을 가입시켜 정지한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      계정 = await 일회용계정만들기(page);
      await 계정정지하기(page, 계정.아이디);
    });

    await test.step('정지한 계정의 데이터를 지운다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 상세열기(page, 아이디);
      번호 = new URL(page.url()).pathname.split('/').pop() ?? '';
      const 창 = 확인창받기(page, '확인');
      await 상세.데이터삭제.click();
      await 창;
      const 떴다 = await 상세.알림.글(`${아이디}의 데이터는 곧 삭제되도록 대기열에 들어갔습니다`).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('케이스가 만들어 데이터를 지운 계정이 있다', 떴다, true, { blocker: true });
    });

    await test.step('데이터를 지운 계정 상세를 다시 연다', async () => {
      await verify('데이터를 지운 계정 상세를 열면 「이 계정의 데이터는 복구할 수 없도록 삭제되었습니다」가 보인다', await 상세.삭제완료까지열기(번호), true);
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
