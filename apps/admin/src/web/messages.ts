// 영역별로 나눠 둔 영어 표 넷을 한 벌로 합친다 (SPEC §8 「다국어」)
// 나누는 이유는 둘이다 — 한 파일에 전부 넣으면 300줄을 넘고(CLAUDE.md §3),
// 옮기는 작업 넷이 같은 파일을 건드려 나란히 돌지 못한다

import { 작성말 } from './messages/authoring.js';
import { 케이스말 } from './messages/cases.js';
import { 오류영어 } from './messages/errors.js';
import { 실행말 } from './messages/runs.js';
import { 설정말 } from './messages/settings.js';
import { 껍데기말 } from './messages/shell.js';

export const 말: Record<string, string> = { ...껍데기말, ...케이스말, ...작성말, ...실행말, ...설정말, ...오류영어 };
