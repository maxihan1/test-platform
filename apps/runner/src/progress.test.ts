// 자식 프로세스의 stdout 조각에서 완성된 진행 줄만 골라내는 규칙을 검사한다. 청크 경계와 줄 경계는 무관하다 (SPEC §5.2)

import { describe, expect, it } from 'vitest';

import { createProgressCollector } from './progress.js';

const line = (payload: unknown) => `@@PROGRESS@@${JSON.stringify(payload)}`;

describe('createProgressCollector', () => {
  it('한 줄이 청크 셋으로 쪼개져 와도 완성된 한 건만 내놓는다', () => {
    const collector = createProgressCollector();

    expect(collector.push('@@PROG')).toEqual([]);
    expect(collector.push('RESS@@{"historyId":1,"seq":2,"tit')).toEqual([]);
    expect(collector.push('le":"로그인"}\n')).toEqual([{ historyId: 1, seq: 2, title: '로그인' }]);
  });

  it('개행이 아직 안 온 부분 줄은 내놓지 않는다', () => {
    const collector = createProgressCollector();

    expect(collector.push(line({ historyId: 1, seq: 1, title: '화면을 연다' }))).toEqual([]);
  });

  it('진행 줄이 아닌 보통 출력은 무시하고 뒤따르는 진행 줄은 그대로 읽는다', () => {
    const collector = createProgressCollector();

    expect(collector.push('Running 1 test using 1 worker\n브라우저를 띄우는 중\n')).toEqual([]);
    expect(collector.push(`${line({ historyId: 1, seq: 1, title: '화면을 연다' })}\n`)).toEqual([
      { historyId: 1, seq: 1, title: '화면을 연다' },
    ]);
  });

  it('한 청크에 두 줄이 붙어 와도 둘 다 낸다', () => {
    const collector = createProgressCollector();

    const chunk = `${line({ historyId: 1, seq: 1, title: '화면을 연다' })}\n${line({ historyId: 1, seq: 2, title: '로그인' })}\n`;

    expect(collector.push(chunk)).toEqual([
      { historyId: 1, seq: 1, title: '화면을 연다' },
      { historyId: 1, seq: 2, title: '로그인' },
    ]);
  });

  it('줄이 \\r\\n 으로 끝나도 읽는다', () => {
    const collector = createProgressCollector();

    expect(collector.push(`${line({ historyId: 1, seq: 3, title: '주문한다' })}\r\n`)).toEqual([
      { historyId: 1, seq: 3, title: '주문한다' },
    ]);
  });

  it('\\r 과 \\n 이 다른 청크로 갈라져 와도 읽는다', () => {
    const collector = createProgressCollector();

    expect(collector.push(`${line({ historyId: 1, seq: 4, title: '결제한다' })}\r`)).toEqual([]);
    expect(collector.push('\n')).toEqual([{ historyId: 1, seq: 4, title: '결제한다' }]);
  });

  it('같은 stdout 에 섞여 오는 결과 줄을 진행으로 오해하지 않는다', () => {
    const collector = createProgressCollector();

    const chunk = `@@RESULT@@${JSON.stringify({ historyId: 1, status: 'PASS', durationMs: 12, steps: [] })}\n`;

    expect(collector.push(chunk)).toEqual([]);
  });

  it('JSON 이 깨진 진행 줄은 던지지 않고 그 줄만 버린다', () => {
    const collector = createProgressCollector();

    const chunk = `@@PROGRESS@@{망가진\n${line({ historyId: 1, seq: 5, title: '로그아웃' })}\n`;

    expect(collector.push(chunk)).toEqual([{ historyId: 1, seq: 5, title: '로그아웃' }]);
  });
});
