// 동시 실행 도구 — 반영은 서비스마다 한 줄 · 뒤에서 도는 일 · 자리 놓을지 (작성 §3.6 「★ 반영 때 겹침 검사」 「동시 실행」)
import { describe, expect, it } from 'vitest';

import { 도는일들, 반영줄들, 자리놓을까 } from './authoring-lanes.js';

const 잠깐 = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('반영줄들', () => {
  it('같은 서비스의 반영은 차례로, 다른 서비스는 나란히 돈다', async () => {
    const 줄 = 반영줄들();
    const 기록: string[] = [];
    const 일 = (이름: string, ms: number) => async () => {
      기록.push(`${이름} 시작`);
      await 잠깐(ms);
      기록.push(`${이름} 끝`);
    };
    await Promise.all([
      줄.걸기('PAY', async () => {}, 일('A', 40)),
      줄.걸기('PAY', async () => {}, 일('B', 5)),
      줄.걸기('MKT', async () => {}, 일('C', 5)),
    ]);
    expect(기록.indexOf('A 끝')).toBeLessThan(기록.indexOf('B 시작'));
    expect(기록.indexOf('C 시작')).toBeLessThan(기록.indexOf('A 끝'));
  });

  it('앞 반영을 기다리는 동안 알림을 몇 번 다시 보내고, 차례가 오면 멈춘다', async () => {
    const 줄 = 반영줄들(10);
    let 알림 = 0;
    const 첫째 = 줄.걸기('PAY', async () => {}, () => 잠깐(60));
    const 둘째 = 줄.걸기('PAY', async () => void (알림 += 1), async () => {});
    await Promise.all([첫째, 둘째]);
    const 끝난뒤 = 알림;
    expect(끝난뒤).toBeGreaterThanOrEqual(3);
    await 잠깐(40);
    expect(알림).toBe(끝난뒤);
  });

  it('앞 반영이 실패해도 다음 반영은 돈다', async () => {
    const 줄 = 반영줄들();
    const 첫째 = 줄.걸기('PAY', async () => {}, async () => Promise.reject(new Error('깨짐')));
    const 둘째 = 줄.걸기('PAY', async () => {}, async () => '됐다');
    await expect(첫째).rejects.toThrow('깨짐');
    await expect(둘째).resolves.toBe('됐다');
  });

  it('멈춤이 걸리면 줄에 서 있던 반영은 시작하지 않는다', async () => {
    let 멈춤 = false;
    const 줄 = 반영줄들(60_000, () => 멈춤);
    let 돌았다 = false;
    const 첫째 = 줄.걸기('PAY', async () => {}, async () => {
      await 잠깐(20);
      멈춤 = true;
    });
    const 둘째 = 줄.걸기('PAY', async () => {}, async () => void (돌았다 = true));
    await Promise.all([첫째, 둘째]);
    expect(돌았다).toBe(false);
  });

  it('알림이 실패해도 일은 돈다', async () => {
    const 줄 = 반영줄들(5);
    const 첫째 = 줄.걸기('PAY', async () => {}, () => 잠깐(30));
    const 둘째 = 줄.걸기('PAY', async () => Promise.reject(new Error('서버 끊김')), async () => '됐다');
    await 첫째;
    await expect(둘째).resolves.toBe('됐다');
  });
});

describe('도는일들', () => {
  it('끝날 때 도는 일을 모두 기다린다', async () => {
    const 일들 = 도는일들(() => {});
    let 끝 = 0;
    일들.더하기(잠깐(20).then(() => void (끝 += 1)));
    일들.더하기(잠깐(40).then(() => void (끝 += 1)));
    await 일들.다기다리기();
    expect(끝).toBe(2);
  });

  it('일이 던지면 오류를 넘기고 다른 일은 계속 센다', async () => {
    const 받은: unknown[] = [];
    const 일들 = 도는일들((e) => 받은.push(e));
    일들.더하기(Promise.reject(new Error('서버가 거절했다')));
    일들.더하기(잠깐(10));
    await 일들.다기다리기();
    expect(받은).toHaveLength(1);
    expect(String(받은[0])).toContain('서버가 거절했다');
  });

  it('도는 수를 센다', async () => {
    const 일들 = 도는일들(() => {});
    일들.더하기(잠깐(30));
    expect(일들.수()).toBe(1);
    await 일들.다기다리기();
    expect(일들.수()).toBe(0);
  });
});

describe('자리 놓을까', () => {
  it('보류 값이 없는 반영만 자리를 바로 놓는다', () => {
    expect(자리놓을까({ kind: 'MERGE' })).toBe(true);
    expect(자리놓을까({ kind: 'MERGE', held: {} })).toBe(true);
    expect(자리놓을까({ kind: 'MERGE', held: { 'PAY-001': { removed: true } } })).toBe(false);
    expect(자리놓을까({ kind: 'AUTHOR' })).toBe(false);
    expect(자리놓을까({ kind: 'EDIT' })).toBe(false);
    expect(자리놓을까({ kind: 'RERUN' })).toBe(false);
  });
});
