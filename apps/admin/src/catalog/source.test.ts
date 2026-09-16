// 실패한 줄 둘레를 ±5줄로 잘라 주는지, 파일 밖으로 나가지 않는지 검사한다

import { describe, expect, it } from 'vitest';

import { excerpt } from './source.js';

const 소스 = Array.from({ length: 20 }, (_, i) => `${i + 1}번째 줄`).join('\n');

describe('excerpt', () => {
  it('지정한 줄을 가운데 두고 앞뒤 5줄씩 돌려준다', () => {
    const { lines, focus } = excerpt(소스, 10);
    expect(focus).toBe(10);
    expect(lines[0]).toEqual({ no: 5, text: '5번째 줄' });
    expect(lines.at(-1)).toEqual({ no: 15, text: '15번째 줄' });
    expect(lines).toHaveLength(11);
  });

  it('파일 첫머리에서는 1번 줄보다 앞으로 가지 않는다', () => {
    const { lines } = excerpt(소스, 2);
    expect(lines[0]?.no).toBe(1);
    expect(lines.at(-1)?.no).toBe(7);
  });

  it('파일 끝에서는 마지막 줄을 넘지 않는다', () => {
    const { lines } = excerpt(소스, 19);
    expect(lines.at(-1)?.no).toBe(20);
  });

  it('줄 번호를 안 주면 파일 첫머리를 보여준다', () => {
    const { lines, focus } = excerpt(소스, undefined);
    expect(focus).toBe(1);
    expect(lines[0]?.no).toBe(1);
    expect(lines.at(-1)?.no).toBe(6);
  });

  it('파일 범위를 벗어난 줄 번호는 가장 가까운 줄로 당긴다', () => {
    expect(excerpt(소스, 999).focus).toBe(20);
    expect(excerpt(소스, 0).focus).toBe(1);
  });
});
