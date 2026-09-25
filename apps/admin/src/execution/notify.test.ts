// Slack 알림 본문이 SPEC §8.9 의 모양대로 나오는지 본다. 웹훅 전송은 fetch 한 번이라 여기서 보지 않는다

import { describe, expect, it } from 'vitest';

import { 걸린시간, 본문 } from './notify.js';

const 실행 = {
  title: '결제 회귀',
  status: 'FINISHED',
  env: 'qa',
  service_name: '결제 서비스',
  triggered_by: 'kim',
  triggered_by_name: '김철수',
  slack_webhook: 'https://hooks.example.com/x',
  duration_ms: 724_000,
  pass: 8,
  fail: 1,
  na: 1,
  u_pass: 0,
  u_fail: 0,
  u_na: 0,
};

const 실패하나 = [{ tc_id: 'PAY-002', tc_name: '한도를 넘는 카드로 결제하면 거절 사유가 안내된다' }];

describe('걸린시간', () => {
  it('1분 미만은 초로만 적는다', () => {
    expect(걸린시간(45_000)).toBe('45초');
  });

  it('1분 이상은 분과 초로 적고 초를 두 자리로 맞춘다', () => {
    expect(걸린시간(724_000)).toBe('12분 04초');
  });

  it('값이 없으면 지어내지 않는다', () => {
    expect(걸린시간(null)).toBe('시간 미상');
  });
});

describe('본문', () => {
  it('머리에 판정을 글자로 적는다', () => {
    expect(본문(실행, 실패하나, '', 2111).split('\n')[0]).toBe('[실패] 결제 서비스 · RUN 2111 · 결제 회귀');
  });

  it('전부 통과했을 때만 통과로 적는다', () => {
    const 전부통과 = { ...실행, fail: 0, na: 0, pass: 10 };
    expect(본문(전부통과, [], '', 2111).split('\n')[0]).toContain('[통과]');
  });

  it('미실행만 남은 실행도 실패로 적는다', () => {
    // 러너가 전부 죽어 한 건도 못 돈 실행에 [통과]가 나가면 아무도 안 본다
    const 전부미실행 = { ...실행, pass: 0, fail: 0, na: 10 };
    expect(본문(전부미실행, [], '', 2111).split('\n')[0]).toContain('[실패]');
  });

  it('사람이 멈춘 실행은 중단으로 적는다', () => {
    const 멈춘것 = { ...실행, status: 'ABORTED' };
    expect(본문(멈춘것, [], '', 2111).split('\n')[0]).toContain('[중단]');
  });

  it('집계와 대상 서버와 실행자를 한 줄에 적는다', () => {
    const 둘째줄 = 본문(실행, 실패하나, '', 2111).split('\n')[1];
    expect(둘째줄).toBe('통과 8 · 실패 1 · 미실행 1 · 12분 04초 · 대상 서버 qa · 실행자 김철수');
  });

  it('박제된 이름이 없으면 로그인 아이디로 적는다', () => {
    const 이름없음 = { ...실행, triggered_by_name: null };
    expect(본문(이름없음, [], '', 2111)).toContain('실행자 kim');
  });

  it('실패한 케이스를 숫자 대신 이름으로 적는다', () => {
    const text = 본문(실행, 실패하나, '', 2111);
    expect(text).toContain('실패한 케이스');
    expect(text).toContain('PAY-002  한도를 넘는 카드로 결제하면 거절 사유가 안내된다');
  });

  it('다섯을 넘으면 앞의 다섯만 적고 나머지는 세어 준다', () => {
    const 여덟 = Array.from({ length: 8 }, (_, i) => ({ tc_id: `PAY-10${i}`, tc_name: `케이스 ${i}` }));
    const text = 본문(실행, 여덟, '', 2111);
    expect(text).toContain('외 3건');
    expect(text).toContain('PAY-104');
    expect(text).not.toContain('PAY-105');
  });

  it('실패가 없으면 실패 목록 자체를 만들지 않는다', () => {
    expect(본문({ ...실행, fail: 0, na: 0 }, [], '', 2111)).not.toContain('실패한 케이스');
  });

  it('바깥 주소를 알면 결과 화면 링크를 붙인다', () => {
    expect(본문(실행, 실패하나, 'https://qa.example.com', 2111)).toContain('결과 보기 https://qa.example.com/runs/2111');
  });

  it('주소 끝의 빗금은 두 번 들어가지 않는다', () => {
    expect(본문(실행, [], 'https://qa.example.com/', 2111)).toContain('https://qa.example.com/runs/2111');
  });

  it('바깥 주소를 모르면 링크 줄을 아예 뺀다', () => {
    expect(본문(실행, 실패하나, '', 2111)).not.toContain('결과 보기');
  });
});

describe('본문 — 미확정 항목 (SPEC 실행 §3.2)', () => {
  const 확정통과 = { ...실행, pass: 8, fail: 0, na: 0 };
  const 확정없음 = { ...실행, pass: 0, fail: 0, na: 0 };
  const 머리 = (run: typeof 실행): string => 본문(run, [], '', 2111).split('\n')[0] ?? '';

  it('확정은 통과인데 미확정 실패가 있으면 머리에 미확정 실패 수를 적고, 미확정 미실행도 실패로 센다', () => {
    expect(머리({ ...확정통과, u_pass: 3, u_fail: 1, u_na: 1 })).toBe('[통과 · 미확정 실패 2] 결제 서비스 · RUN 2111 · 결제 회귀');
  });

  it('확정 실패가 있으면 미확정과 상관없이 실패다', () => {
    expect(머리({ ...실행, u_fail: 2 })).toContain('[실패] ');
  });

  it('미확정만 돌린 실행은 판정 없이 미확정으로 적는다', () => {
    expect(머리({ ...확정없음, u_pass: 3 })).toContain('[미확정] ');
  });

  it('미확정만 돌린 실행에 실패나 미실행이 있으면 그 수를 붙인다', () => {
    expect(머리({ ...확정없음, u_pass: 1, u_fail: 1 })).toContain('[미확정 · 실패 1] ');
    expect(머리({ ...확정없음, u_na: 2 })).toContain('[미확정 · 실패 2] ');
  });

  it('사람이 멈춘 실행은 미확정이 있어도 중단이다', () => {
    expect(머리({ ...확정없음, status: 'ABORTED', u_fail: 1 })).toContain('[중단] ');
  });

  it('숫자 줄 뒤에 미확정 묶음을 붙이고 0 인 칸은 뺀다', () => {
    const 둘째줄 = 본문({ ...실행, u_pass: 4, u_fail: 1 }, [], '', 2111).split('\n')[1];
    expect(둘째줄).toBe('통과 8 · 실패 1 · 미실행 1 · 미확정 5(통과 4 · 실패 1) · 12분 04초 · 대상 서버 qa · 실행자 김철수');
  });

  it('실패 목록은 확정 실패를 먼저 적고 미확정 실패에는 꼬리를 붙인다', () => {
    const 섞임 = [
      { tc_id: 'PAY-001', tc_name: '화면 기준 케이스', unconfirmed: true },
      { tc_id: 'PAY-002', tc_name: '한도 초과 거절', unconfirmed: false },
    ];
    const 줄 = 본문({ ...실행, u_fail: 1 }, 섞임, '', 2111).split('\n');
    const 시작 = 줄.indexOf('실패한 케이스');
    expect(줄.slice(시작 + 1, 시작 + 3)).toEqual(['  PAY-002  한도 초과 거절', '  PAY-001  화면 기준 케이스  (미확정)']);
  });
});
