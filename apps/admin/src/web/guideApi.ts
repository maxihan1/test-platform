// 「서비스 가이드」 화면이 서버를 부르는 호출 모음 (도메인/작성 §7 「서비스 가이드 통로」). 모양은 kit 의 ServiceGuide · GuideVersionRow 다

import type { GuideSection, GuideVersionRow, ServiceGuide } from '@platform/kit';

import { call, json } from './api.js';

export type 가이드글 = Pick<ServiceGuide, GuideSection>;

const 꼬리 = (service: string) => `?service=${encodeURIComponent(service)}`;

export const guideApi = {
  now: (service: string) => call<ServiceGuide>(`/guide${꼬리(service)}`),
  versions: (service: string) => call<GuideVersionRow[]>(`/guide/versions${꼬리(service)}`),
  version: (service: string, version: number) => call<ServiceGuide>(`/guide/versions/${version}${꼬리(service)}`),
  save: (service: string, baseVersion: number, 글: 가이드글) =>
    call<{ version: number }>(`/guide${꼬리(service)}`, { ...json({ baseVersion, ...글 }), method: 'PUT' }),
  /** 파일 바이트를 그대로 보낸다. 이름 · 구획 · 판은 본문에 자리가 없어 주소에 싣는다 (자료 올리기와 같다) */
  addFile: (service: string, section: GuideSection, baseVersion: number, file: File) =>
    call<{ version: number; fileId: number }>(
      `/guide/files${꼬리(service)}&section=${section}&baseVersion=${baseVersion}&name=${encodeURIComponent(file.name)}`,
      { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file },
    ),
  removeFile: (service: string, fileId: number, baseVersion: number) =>
    call<{ version: number }>(`/guide/files/${fileId}${꼬리(service)}&baseVersion=${baseVersion}`, { method: 'DELETE' }),
  text: (service: string, fileId: number) => call<{ text: string }>(`/guide/files/${fileId}/text${꼬리(service)}`),
  fileUrl: (service: string, fileId: number) => `/api/guide/files/${fileId}${꼬리(service)}`,
  pdfUrl: (service: string, fileId: number) => `/api/guide/files/${fileId}/pdf${꼬리(service)}`,
};
