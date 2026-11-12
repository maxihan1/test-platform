import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 웹훅만들기, 웹훅정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 웹훅화면 } from './pages/webhooks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-511',
  name: '웹훅이 없을 때 「웹훅」 화면을 열면 「아직 설정한 웹훅 엔드포인트가 없습니다.」와 「엔드포인트 추가」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '웹훅이 하나도 없다', '케이스가 만든 웹훅이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 웹훅화면(page);
  const 주소 = `https://${고유이름('mto')}.example.com/hook`;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('웹훅이 하나도 없는지 확인한다', async () => {
      await 목록.열기();
      await verify('웹훅이 하나도 없다', await 목록.웹훅줄들.count(), 0, { blocker: true });
    });

    await test.step('「웹훅」 화면을 연다', async () => {
      await 목록.열기();
      const 안내 = await verify('「아직 설정한 웹훅 엔드포인트가 없습니다.」가 보인다', await 목록.빈목록.isVisible(), true);
      const 추가 = await verify('「엔드포인트 추가」가 보인다', await 목록.엔드포인트추가.isVisible(), true);
      await verify('웹훅이 없을 때 「웹훅」 화면을 열면 「아직 설정한 웹훅 엔드포인트가 없습니다.」와 「엔드포인트 추가」가 보인다', 안내 && 추가, true);
    });

    await test.step('케이스 웹훅을 만든다', async () => {
      await 웹훅만들기(page, 주소, ['account.created']);
    });

    await test.step('케이스가 만든 웹훅이 있는지 확인한다', async () => {
      await 목록.열기();
      await verify('케이스가 만든 웹훅이 있다', await 목록.웹훅줄(주소).count(), 1, { blocker: true });
    });

    await test.step('웹훅을 만든 뒤 「웹훅」 화면을 다시 연다', async () => {
      await 목록.열기();
      const 줄 = await verify('목록에 그 URL 줄이 보인다', await 목록.웹훅줄(주소).isVisible(), true);
      const 활성 = await verify('「활성화됨」이 보인다', await 목록.활성화표시(주소).isVisible(), true);
      const 이벤트 = await verify('「1개의 이벤트가 활성화되어 있습니다」가 보인다', await 목록.이벤트수안내(주소).isVisible(), true);
      await verify('웹훅이 하나 있는 목록에는 그 URL 줄과 「활성화됨」 · 「1개의 이벤트가 활성화되어 있습니다」가 보인다', 줄 && 활성 && 이벤트, true);
    });
  } finally {
    await 웹훅정리(page, 주소);
  }
});
