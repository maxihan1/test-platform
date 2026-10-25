import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-388',
  name: '알림 목록 API 는 알림 목록과 읽지 않은 수를 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('일회용 회원으로 로그인한다', async () => {
    회원 = await 일회용회원만들기(request);
    await API로그인(request, 회원.loginId, 회원.password);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(request), 회원.loginId, { blocker: true });
  });

  await test.step('GET /api/notifications 를 부른다', async () => {
    const 몸 = await 몸읽기<{ items?: unknown; unread?: unknown }>(await request.get('/api/notifications'));
    const 목록 = await verify('알림 목록이 있다', Array.isArray(몸.items), true);
    const 수 = await verify('읽지 않은 수가 숫자다', typeof 몸.unread, 'number');
    await verify('알림 목록 API 는 알림 목록과 읽지 않은 수를 돌려준다', 목록 && 수, true);
  });

  await test.step('POST /api/notifications/read 를 부른 뒤 알림 목록을 다시 부른다', async () => {
    await request.post('/api/notifications/read');
    const 몸 = await 몸읽기<{ unread?: number }>(await request.get('/api/notifications'));
    await verify('모두 읽음 API 를 부르면 읽지 않은 수가 0이 된다', 몸.unread, 0);
  });
});
