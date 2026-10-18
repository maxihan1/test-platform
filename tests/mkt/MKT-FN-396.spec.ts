import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 고유글자, 글만들기, 글지우기 } from './helpers/data.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-396',
  name: '좋아요 요청은 liked true 와 늘어난 likes 를, 다시 부르면 liked false 를 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원이 쓴 글이 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보; 글번호?: number } = {};

  try {
    await test.step('새로 가입한 회원이 글을 하나 쓴다', async () => {
      준비.회원 = await 새회원으로로그인(request);
      준비.글번호 = await 글만들기(request, { title: 고유글자('좋아요 글'), content: '좋아요 요청을 확인하는 글입니다' });
    });

    await test.step('쓴 글이 있는지 확인한다', async () => {
      const 응답 = await request.get(`/api/posts/${준비.글번호}`);
      await verify('쓴 글을 가져올 수 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('POST /api/posts/{id}/like 를 두 번 부른다', async () => {
      const 앞 = ((await (await request.get(`/api/posts/${준비.글번호}`)).json()) as { likes: number }).likes;
      const 처음 = (await (await request.post(`/api/posts/${준비.글번호}/like`)).json()) as { liked: boolean; likes: number };
      const 다시 = (await (await request.post(`/api/posts/${준비.글번호}/like`)).json()) as { liked: boolean };
      await verify(
        '좋아요 요청은 liked true 와 늘어난 likes 를, 다시 부르면 liked false 를 준다',
        { 처음: 처음.liked, 늘어난수: 처음.likes - 앞, 다시: 다시.liked },
        { 처음: true, 늘어난수: 1, 다시: false },
      );
    });
  } finally {
    if (준비.글번호 !== undefined) await 글지우기(request, 준비.글번호);
    await 회원과주문정리(request, 준비.회원);
  }
});
