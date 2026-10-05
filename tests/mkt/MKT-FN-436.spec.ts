import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-436',
  name: 'category=질문 이면 공지를 뺀 items 의 분류가 모두 「질문」이다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

interface 글줄 {
  category: string;
  title: string;
  views: number;
}

const 많은순 = (수들: number[]) => 수들.length > 1 && 수들.every((수, 자리) => 자리 === 0 || (수들[자리 - 1] ?? 0) >= 수);

test(spec, async ({ request }) => {
  await test.step('게시글 목록을 category=질문 으로 부른다', async () => {
    const res = await request.get('/api/posts', { params: { category: '질문' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 글줄[] };
    await verify('category=질문 이면 공지를 뺀 items 의 분류가 모두 「질문」이다', [...new Set(items.map((글) => 글.category))].join(', '), '질문');
  });

  await test.step('게시글 목록을 field=title · q=백팩 으로 부른다', async () => {
    const res = await request.get('/api/posts', { params: { field: 'title', q: '백팩' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 글줄[] };
    await verify('field=title · q=백팩 이면 공지를 뺀 items 의 제목에 모두 「백팩」이 든다', items.length > 0 && items.every((글) => 글.title.includes('백팩')), true);
  });

  await test.step('게시글 목록을 sort=views 로 부른다', async () => {
    const res = await request.get('/api/posts', { params: { sort: 'views' } });
    await verify('응답 코드가 200이다', res.status(), 200, { blocker: true });
    const { items } = (await res.json()) as { items: 글줄[] };
    await verify('sort=views 면 items 가 조회수 많은 순이다', 많은순(items.map((글) => 글.views)), true);
  });
});
