// 설정 > 애플리케이션의 API 종류 칸 — 「종류」 칸과 「API 문서」 구획 (도메인/API §3.8 · 도메인/인증 §8.8 「종류」)
// SettingsService.tsx 가 300줄에 닿지 않게 뗐다

import type { 앱종류 } from './api.js';
import { t as 말, use말, use언어, type 언어 } from './i18n.js';
import { 종류이름 } from './kind.js';
import { 구획 } from './SettingsServiceParts.js';

/** 「종류」 — 만들 때 마법사에서만 고른다. 엔진과 화면이 종류마다 달라서, 접두사처럼 나중에 못 바꾼다(서버 400 KIND_IMMUTABLE) */
export function 종류칸({ 값 }: { 값: 앱종류 }) {
  const t = use말();
  const 언어 = use언어();
  return (
    <div className="field">
      <span className="field-label">{t('종류')}</span>
      <div>
        <span>{종류이름(값, 언어)}</span>
        <div className="hint">{t('만든 뒤에는 바꿀 수 없습니다')}</div>
      </div>
    </div>
  );
}

/** 「API 문서」 구획 — 문서 경로와 기준 서버. 화면 종류에는 그리지 않는다(서버가 400 NOT_API_SERVICE 로 막는다) */
export function API문서구획(p: { 경로: string; 바꾼경로: (v: string) => void; 기준: string; 바꾼기준: (v: string) => void; 서버들: string[] }) {
  const t = use말();
  return (
    <구획 제목={t('API 문서')} 쓰임={t('Swagger 문서를 받아 오는 곳입니다. 테스트 작성과 응답 형식 검사에 사용합니다')}>
      <div className="field">
        <label htmlFor="sf-apidoc">{t('문서 경로')}</label>
        <div>
          <input id="sf-apidoc" type="text" value={p.경로} placeholder="/openapi.json" onChange={(e) => p.바꾼경로(e.target.value)} />
          <div className="hint">{t('대상 서버 주소 뒤에 붙여 받습니다')}</div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="sf-apidoc-env">{t('기준 서버')}</label>
        <div>
          <select id="sf-apidoc-env" value={p.기준} onChange={(e) => p.바꾼기준(e.target.value)}>
            <option value="">{t('고르지 않음')}</option>
            {p.서버들.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
            {/* 고른 줄의 이름을 고쳤거나 뺐으면 그대로 보여 준다 — 조용히 비우면 모르고 저장한다. 저장은 아래 까닭이 막는다 */}
            {p.기준 === '' || p.서버들.includes(p.기준) ? null : <option value={p.기준}>{p.기준}</option>}
          </select>
          <div className="hint">{t('이 서버의 문서가 바뀔 때만 새 버전으로 저장합니다')}</div>
        </div>
      </div>
    </구획>
  );
}

/** 서버가 400 BAD_API_DOC_URL 로 막을 것을 먼저 짚는다. 어느 칸이 틀렸는지 응답에 안 담겨 온다 */
export function API문서못보내는이유(입력: { 경로: string; 기준: string; 서버들: string[] }, 언어: 언어): string | null {
  if (입력.경로 !== '' && (!입력.경로.startsWith('/') || 입력.경로.length > 500)) return 말('문서 경로는 / 로 시작하고 500자까지 적을 수 있습니다', 언어);
  if (입력.기준 !== '' && !입력.서버들.includes(입력.기준)) return 말('API 문서의 기준 서버를 대상 서버 목록에서 고릅니다', 언어);
  return null;
}
