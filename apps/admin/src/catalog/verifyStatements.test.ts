// 케이스 코드에서 읽는 확인 문장 — 옛 꼴은 test 본문 전체, 프로시저는 케이스마다 test.case 본문만 (카탈로그 §3.1 「확인 문장」)

import { describe, expect, it } from 'vitest';

import { 구간, 절차, 정상본문, 프로시저글 } from './procedure-fixture.js';
import { 케이스확인문장, 프로시저확인문장 } from './verifyLines.js';

const 옛꼴 = (본문: string): string => `import { test, verify } from '@platform/kit';\nconst spec = {};\ntest(spec, async ({ page }) => {\n${본문}\n});\n`;

describe('케이스확인문장 — 옛 꼴 파일', () => {
  it('판정 호출 첫 인자를 코드 차례대로 모으고 같은 문장은 한 번만 낸다', () => {
    const 글 = 옛꼴(`
  await test.step('열기', async () => {
    await verify('하단 「홈」 탭이 보인다', 1, 1);
    await verify.element('공격력이 같다', 'item:a', 1, 1);
  });
  await verify('하단 「홈」 탭이 보인다', 2, 2);
  await verify.rates('확률이 표대로다', { a: 1 }, { a: 1 }, 0.03);
  await verify.log('로그가 기준 안이다', [1], { max: 3 });`);
    expect(케이스확인문장(글)).toEqual(['하단 「홈」 탭이 보인다', '공격력이 같다', '확률이 표대로다', '로그가 기준 안이다']);
  });

  it('verify.note 와 글자 리터럴이 아닌 첫 인자와 verify 가 아닌 호출은 건너뛴다', () => {
    const 글 = 옛꼴(`
  const 문장 = '변수';
  verify.note('참고 기록', 1);
  await verify(문장, 1, 1);
  await verify(\`치환 \${문장}\`, 1, 1);
  await verify(\`치환 없는 템플릿\`, 1, 1);
  await other('남의 호출', 1, 1);`);
    expect(케이스확인문장(글)).toEqual(['치환 없는 템플릿']);
  });

  it('test.cleanup 콜백 안의 확인은 뺀다', () => {
    const 글 = 옛꼴(`
  await test.cleanup('글을 지운다', async () => { await verify('지워졌다', 1, 1); });
  await verify('글이 보인다', 1, 1);`);
    expect(케이스확인문장(글)).toEqual(['글이 보인다']);
  });

  it('확인이 하나도 없으면 빈 목록이고 test 호출이 없으면 못 읽은 것이라 null 이다', () => {
    expect(케이스확인문장(옛꼴(`  await page.goto('/');`))).toEqual([]);
    expect(케이스확인문장(`await verify('밖의 호출', 1, 1);`)).toBeNull();
  });
});

describe('프로시저확인문장 — 프로시저 파일', () => {
  it('케이스마다 자기 test.case 안의 문장만 갖고 케이스 사이 준비 구간의 확인은 어느 케이스에도 안 든다', () => {
    const 글 = 프로시저글(
      절차('글쓰기 화면을 연다', ` await verify('준비 화면이 열렸다', 1, 1); `) +
        구간('본문없음', '본문을 비운다', ` await verify('본문이 비었다', 1, 1); `) +
        구간('글자수초과', '501자를 넣는다', ` await verify('경고가 보인다', 1, 1); await verify('게시가 막힌다', 1, 1); `) +
        절차('게시를 누른다', ` await verify('준비 중 게시했다', 1, 1); `) +
        구간('게시확인', '타임라인을 연다', ` await verify('경고가 보인다', 1, 1); `),
    );
    expect(프로시저확인문장(글)).toEqual([['본문이 비었다'], ['경고가 보인다', '게시가 막힌다'], ['경고가 보인다']]);
  });

  it('정리 안의 확인은 뺀다', () => {
    const 글 = 프로시저글(`  await test.cleanup('올린 글을 지운다', async () => { await verify('지워졌다', 1, 1); });\n${정상본문}`);
    expect(프로시저확인문장(글)).toEqual([['맞다'], ['맞다'], ['맞다']]);
  });

  it('확인이 없는 케이스는 빈 목록이고 프로시저 파일이 아니면 null 이다', () => {
    const 글 = 프로시저글(구간('본문없음', '하나', '') + 구간('글자수초과', '둘') + 구간('게시확인', '셋'));
    expect(프로시저확인문장(글)).toEqual([[], ['맞다'], ['맞다']]);
    expect(프로시저확인문장(옛꼴(`  await verify('하나', 1, 1);`))).toBeNull();
  });
});
