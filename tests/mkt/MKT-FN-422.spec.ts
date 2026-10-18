import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기, 댓글달기, 읽지않은알림수 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-422',
  name: '알림 목록은 읽지 않은 수를 주고 모두 읽음 뒤에는 0 이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원에게 읽지 않은 알림이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 다른회원요청 = page.request;
  const 준비: { 회원?: 회원정보; 댓글쓴이?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('새로 가입한 회원의 글에 다른 회원이 댓글을 단다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('알림 글'), content: '댓글이 달리면 알림이 생기는 글입니다' });
      준비.댓글쓴이 = await 새회원으로로그인(다른회원요청);
      await 댓글달기(다른회원요청, 준비.글번호, '알림을 만드는 댓글입니다');
    });

    await test.step('읽지 않은 알림이 하나 있는지 확인한다', async () => {
      await verify('읽지 않은 알림이 하나다', await 읽지않은알림수(request), 1, { blocker: true });
    });

    await test.step('알림 목록을 부르고 모두 읽음을 부른 뒤 다시 부른다', async () => {
      const 처음 = (await (await request.get('/api/notifications')).json()) as { unread: number };
      await request.post('/api/notifications/read');
      const 뒤 = (await (await request.get('/api/notifications')).json()) as { unread: number };
      await verify('알림 목록은 읽지 않은 수를 주고 모두 읽음 뒤에는 0 이다', { 처음: 처음.unread, 모두읽음뒤: 뒤.unread }, { 처음: 1, 모두읽음뒤: 0 });
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(request, 준비.글번호);
    await 회원과주문정리(request, 준비.회원);
    await 회원과주문정리(다른회원요청, 준비.댓글쓴이);
  }
});
