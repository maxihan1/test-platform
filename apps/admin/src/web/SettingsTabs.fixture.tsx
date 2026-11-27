// 설정 화면 검사가 탭을 누르는 도우미 — 애플리케이션 설정은 칸이 탭 넷에 나뉘어 있어 칸을 찾기 전에 그 탭부터 연다

import { fireEvent, screen } from '@testing-library/react';

/** 탭 이름은 앞부분만 맞으면 된다 — 이름 아래 상태 글이 같은 단추 안에 같이 읽힌다 */
export function 탭열기(이름: string): void {
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${이름}`) }));
}
