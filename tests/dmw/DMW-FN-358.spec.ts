import { defineCase, test, verify } from '@platform/kit';

import { 글지우기 } from './helpers/data.helper.js';
import { 고유낱말, 글올리기, 요청로그인한일회용회원 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-358',
  name: 'category=질문 으로 부르면 공지 말고는 분류가 질문인 글만 온다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 글번호 = 0;

  try {
    await test.step('GET /api/posts?category=질문 을 부른다', async () => {
      const 응답 = await request.get(`/api/posts?category=${encodeURIComponent('질문')}`);
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 몸 = (await 응답.json()) as { items: { category: string }[] };
      await verify('category=질문 으로 부르면 공지 말고는 분류가 질문인 글만 온다', [...new Set(몸.items.map((글) => 글.category))], ['질문']);
    });

    await test.step('GET /api/posts?sort=views 를 부른다', async () => {
      const 응답 = await request.get('/api/posts?sort=views');
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 조회수들 = ((await 응답.json()) as { items: { views: number }[] }).items.map((글) => 글.views);
      await verify('sort=views 로 부르면 조회수가 많은 순으로 온다', 조회수들, [...조회수들].sort((앞, 뒤) => 뒤 - 앞));
    });

    await test.step('GET /api/posts?field=title&q=<내 글 제목 낱말> 을 부른다', async () => {
      await 요청로그인한일회용회원(request);
      const 낱말 = 고유낱말('제목낱말');
      글번호 = await 글올리기(request, { 제목: `${낱말} 제목글`, 본문: '제목 낱말로 찾아 볼 글의 본문입니다 열 글자가 넘습니다' });
      await 글올리기(request, { 제목: 고유낱말('다른글'), 본문: `본문에만 ${낱말} 낱말이 들어 있는 글입니다` }).then((번호) => 글지우기(request, 번호));
      const 응답 = await request.get(`/api/posts?field=title&q=${encodeURIComponent(낱말)}`);
      await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
      const 제목들 = ((await 응답.json()) as { items: { title: string }[] }).items.map((글) => 글.title);
      await verify('field=title 과 q 로 부르면 제목에 q 가 든 글만 온다', 제목들, [`${낱말} 제목글`]);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
