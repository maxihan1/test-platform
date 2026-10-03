import { defineCase, test, verify } from '@platform/kit';

type 글요약 = { id: number; category: string; title: string; likes: number; views: number };

export const spec = defineCase({
  tcId: 'MKT-FN-094',
  name: '글 목록 API 는 조건에 맞는 글만 돌려주고 글 상세 API 는 부를 때마다 조회수가 1 오른다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('글 목록 API 를 category · field · q · sort · page · size 로 부른다', async () => {
    const 응답 = await request.get(`/api/posts?category=${encodeURIComponent('후기')}&field=title&q=${encodeURIComponent('후기')}&sort=likes&page=1&size=5`);
    const 글들 = ((await 응답.json()) as { items: 글요약[] }).items;
    await verify(
      '글 목록 API 는 조건에 맞는 글만 돌려준다',
      [
        글들.length > 0,
        글들.length <= 5,
        글들.every((글) => 글.category === '후기'),
        글들.every((글) => 글.title.includes('후기')),
        글들.every((글, 순서) => 순서 === 0 || (글들[순서 - 1]?.likes ?? 0) >= 글.likes),
      ],
      [true, true, true, true, true],
    );
  });

  await test.step('글 상세 API 를 두 번 부른다', async () => {
    const 목록 = ((await (await request.get('/api/posts?size=40')).json()) as { items: 글요약[] }).items;
    const 대상 = 목록[Math.floor(목록.length / 2)]?.id ?? 0;
    const 첫째 = (await (await request.get(`/api/posts/${대상}`)).json()) as 글요약;
    const 둘째 = (await (await request.get(`/api/posts/${대상}`)).json()) as 글요약;
    await verify('글 상세 API 는 부를 때마다 조회수가 1 오른다', 둘째.views - 첫째.views, 1);
  });
});
