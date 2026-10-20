// @vitest-environment jsdom
// E2E 조립 화면 API 호출 단계의 「API 인증」 · 「값 주입」 · 「응답 값 확인」 칸 검사 (도메인/시나리오 §3.7 결정 14 · §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';

afterEach(cleanup);

type ApiPart = Extract<ScenarioPart, { kind: 'api' }>;

const 가입: ScenarioPart = { kind: 'case', tcId: 'MKT-FN-001', params: {}, expected: {}, skipSteps: [] };
const api = (덮: Partial<ApiPart> = {}): ApiPart => ({ kind: 'api', method: 'GET', path: '/v1/pushes?userId={아이디}', expectStatus: 200, service: 'NTF', ...덮 });
const 앱들 = [
  { prefix: 'MKT', name: '쇼핑몰', envs: [{ env: 'stg' }] },
  { prefix: 'NTF', name: '알림', envs: [{ env: 'stg', apiAuthNames: ['데모마켓'] }, { env: 'qa', apiAuthNames: ['데모마켓', '고객사 B'] }] },
];

function 그리기(단계: ApiPart, 쓰나 = true) {
  const on바꿈 = vi.fn();
  render(<ScenarioOtherPanel 번호={2} 단계={단계} 단계들={[가입, 단계]} 앱들={앱들} 시작="MKT" 쓰나={쓰나} on바꿈={on바꿈} />);
  return on바꿈;
}
const 마지막 = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)?.[0] as ApiPart;

describe('API 호출 단계 — API 인증', () => {
  it('부를 애플리케이션 대상 서버들의 인증 이름을 겹치지 않게 보이고, 고르면 칸이 생기고 「인증 없이」면 칸이 빠진다', () => {
    const on바꿈 = 그리기(api());
    const 고르개 = screen.getByLabelText('API 인증') as HTMLSelectElement;

    expect([...고르개.options].map((o) => o.text)).toEqual(['인증 없이', '데모마켓', '고객사 B']);
    fireEvent.change(고르개, { target: { value: '데모마켓' } });
    expect(마지막(on바꿈)).toEqual({ ...api(), auth: '데모마켓' });

    cleanup();
    const 다시 = 그리기(api({ auth: '데모마켓' }));
    fireEvent.change(screen.getByLabelText('API 인증'), { target: { value: '' } });
    expect(마지막(다시)).toEqual(api());
  });

  it('지금 설정에 없는 저장된 이름도 고른 채 보이고, 인증이 하나도 없으면 안내한다', () => {
    그리기(api({ service: undefined, auth: '옛 인증' }));

    expect((screen.getByLabelText('API 인증') as HTMLSelectElement).value).toBe('옛 인증');
    cleanup();
    그리기(api({ service: undefined }));
    expect(screen.getByText('이 애플리케이션 대상 서버에 등록한 API 인증이 없습니다')).toBeTruthy();
  });
});

describe('API 호출 단계 — 값 주입 · 응답 값 확인', () => {
  it('값 주입을 더하면 바로 앞 단계를 가리키는 빈 줄이 생기고, 이름 · JSON 경로를 적으면 그 줄이 바뀐다', () => {
    const on바꿈 = 그리기(api());
    fireEvent.click(screen.getByRole('button', { name: '+ 값 주입 추가' }));
    expect(마지막(on바꿈).values).toEqual([{ name: '', value: { fromSeq: 1, method: 'POST', urlPattern: '**', jsonPath: '' } }]);

    cleanup();
    const 다시 = 그리기(api({ values: [{ name: '', value: { fromSeq: 1, method: 'POST', urlPattern: '**', jsonPath: '' } }] }));
    expect(screen.getByText('이름은 영문 · 숫자 · 한글 · _ 1~20자여야 합니다')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '아이디' } });
    expect(마지막(다시).values?.[0]?.name).toBe('아이디');
    fireEvent.change(screen.getByLabelText('JSON 경로'), { target: { value: 'loginId' } });
    expect(마지막(다시).values?.[0]?.value.jsonPath).toBe('loginId');
    fireEvent.click(screen.getByRole('button', { name: '값 주입 삭제' }));
    expect(마지막(다시)).not.toHaveProperty('values');
  });

  it('응답 값 확인의 기대 값은 JSON 으로 읽히면 그 값, 아니면 적은 글자 그대로다', () => {
    const on바꿈 = 그리기(api({ expectJson: [{ jsonPath: 'items.0.title', equals: '' }] }));
    const 기대 = screen.getByLabelText('기대 값');

    fireEvent.change(기대, { target: { value: '주문이 완료되었습니다' } });
    expect(마지막(on바꿈).expectJson).toEqual([{ jsonPath: 'items.0.title', equals: '주문이 완료되었습니다' }]);
    fireEvent.change(기대, { target: { value: '3' } });
    expect(마지막(on바꿈).expectJson).toEqual([{ jsonPath: 'items.0.title', equals: 3 }]);
    fireEvent.change(기대, { target: { value: '"3"' } });
    expect(마지막(on바꿈).expectJson).toEqual([{ jsonPath: 'items.0.title', equals: '3' }]);
  });

  it('본문을 고쳐도 인증 · 값 주입 · 응답 값 확인 칸이 남는다', () => {
    const 단계 = api({ method: 'POST', auth: '데모마켓', values: [{ name: '아이디', value: { fromSeq: 1, method: 'POST', urlPattern: '**/signup', jsonPath: 'loginId' } }], expectJson: [{ jsonPath: 'id', equals: 1 }] });
    const on바꿈 = 그리기(단계);

    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '{"userId":"{아이디}"}' } });
    expect(마지막(on바꿈)).toEqual({ ...단계, body: { userId: '{아이디}' } });
  });

  it('읽기만 하는 사람에게는 더하기 · 삭제 단추가 없다', () => {
    그리기(api({ values: [{ name: '아이디', value: { fromSeq: 1, method: 'POST', urlPattern: '**', jsonPath: 'loginId' } }] }), false);

    expect(screen.queryByRole('button', { name: '+ 값 주입 추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '값 주입 삭제' })).toBeNull();
    expect(screen.queryByRole('button', { name: '+ 응답 값 확인 추가' })).toBeNull();
  });
});
