// @vitest-environment jsdom
// 대상 서버 줄의 「테스트 데이터 준비」 칸 — 보낼 모양 · 끝 4자리 · 이어받기 · 실서비스 서버 막기 (도메인/인증 §7 envs[] prep · §8.8 · SEED-F1-02)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { EnvEditor, 보낼모양, 줄로 } from './SettingsEnvs.js';
import { 준비못보내는이유 } from './SettingsPrep.js';

afterEach(cleanup);

const 저장됨 = { env: 'qa', baseUrl: 'https://qa.example.com', isProd: false, prep: { url: 'https://qa.example.com/prep', header: 'X-Prep-Key', valueLast4: 'a91f', timeoutSec: 90 } };

describe('테스트 데이터 준비 칸', () => {
  it('저장된 준비는 값 없이 되돌려 보내고, 없는 줄 · 새 줄은 null 을 명시한다', () => {
    const [받음, 없음] = 줄로([저장됨, { env: 'dev', baseUrl: 'https://dev.example.com', prep: null }]);
    const 새줄 = { env: 'stage', baseUrl: 'https://stage.example.com', key: 'k', 원래키: null, 새비밀번호: '', 역할들: [], API인증들: [] };
    expect(보낼모양([받음!, 없음!, 새줄]).map((e) => e.prep)).toEqual([
      { url: 'https://qa.example.com/prep', header: 'X-Prep-Key', timeoutSec: 90 },
      null,
      null,
    ]);
    expect(준비못보내는이유(줄로([저장됨]), 'ko')).toBeNull();
  });

  it('값은 끝 4자리로만 보이고, 「변경」을 누르면 값 칸이 열려 새 값을 싣는다', () => {
    const onChange = vi.fn();
    const 줄들 = 줄로([저장됨]);
    render(<EnvEditor envs={줄들} onChange={onChange} />);
    expect(screen.getByText('•••• a91f')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 준비 헤더 값 변경' }));
    const 연줄 = onChange.mock.calls[0]![0];
    cleanup();
    render(<EnvEditor envs={연줄} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('대상 서버 1 준비 헤더 값'), { target: { value: 'seed-prep-secret-0001' } });
    expect(보낼모양(onChange.mock.calls[1]![0])[0]!.prep).toEqual({ url: 'https://qa.example.com/prep', header: 'X-Prep-Key', value: 'seed-prep-secret-0001', timeoutSec: 90 });
  });

  it('주소나 대상 서버 이름을 변경하면 값을 다시 넣어야 저장된다', () => {
    const [줄] = 줄로([저장됨]);
    expect(준비못보내는이유([{ ...줄!, 준비: { ...줄!.준비!, url: 'https://other.example.com/prep' } }], 'ko')).toBe(
      '신규 준비 주소는 헤더 값을 입력해 주세요. 준비 주소 · 헤더 이름이나 대상 서버 이름을 변경하면 다시 넣어야 합니다',
    );
    expect(준비못보내는이유([{ ...줄!, env: 'stage' }], 'ko')).not.toBeNull();
  });

  it('칸 규칙을 어기면 저장 전에 까닭을 보인다', () => {
    const [줄] = 줄로([저장됨]);
    const 고친줄 = (준비: object) => [{ ...줄!, 준비: { ...줄!.준비!, 새값: 'seed-prep-secret-0001', ...준비 } }];
    expect(준비못보내는이유(고친줄({ url: 'ftp://x/prep' }), 'ko')).toBe('준비 주소는 http(s) 주소로 1000자까지 입력해 주세요');
    expect(준비못보내는이유(고친줄({ header: 'X Prep' }), 'ko')).toBe('준비 헤더 이름은 영문 · 숫자 · - 로 100자까지입니다');
    expect(준비못보내는이유(고친줄({ 새값: 'short' }), 'ko')).not.toBeNull();
    expect(준비못보내는이유(고친줄({ timeoutSec: '5' }), 'ko')).toBe('준비 시간 한도를 10초에서 600초 사이의 정수로 입력해 주세요');
  });

  it('「실서비스 서버」를 켠 줄은 칸 대신 안내를 보이고 null 을 보낸다', () => {
    const 줄들 = 줄로([{ ...저장됨, isProd: true }]);
    render(<EnvEditor envs={줄들} onChange={vi.fn()} />);
    expect(screen.getByText('실서비스 서버에는 테스트 데이터 준비를 넣을 수 없습니다')).toBeTruthy();
    expect(screen.queryByLabelText('대상 서버 1 준비 주소')).toBeNull();
    expect(보낼모양(줄들)[0]!.prep).toBeNull();
  });

  it('− 를 누르면 저장 때 삭제된다고 알리고 null 을 보낸다', () => {
    const onChange = vi.fn();
    render(<EnvEditor envs={줄로([저장됨])} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 테스트 데이터 준비 삭제' }));
    const 뺀줄 = onChange.mock.calls[0]![0];
    expect(보낼모양(뺀줄)[0]!.prep).toBeNull();
    cleanup();
    render(<EnvEditor envs={뺀줄} onChange={onChange} />);
    expect(screen.getByText('이대로 저장하면 이 서버의 테스트 데이터 준비가 삭제됩니다')).toBeTruthy();
  });
});
