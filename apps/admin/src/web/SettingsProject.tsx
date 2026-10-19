// 설정 화면의 프로젝트 하나 (SPEC 도메인/인증 §8.8). 새 프로젝트 만들기 · 이름 바꾸기 · 안에 든 애플리케이션 옮기기 · API 서버 이름
// 지우는 통로는 없다 — 애플리케이션을 모두 옮겨 비면 서버가 알아서 지운다

import { useState } from 'react';

import { api, type SettingsProject, type SettingsServiceRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 오류문장 } from './SettingsService.js';
import { ApiServers } from './SettingsApiServers.js';
import { 구획 } from './SettingsServiceParts.js';

/**
 * @param row 없으면 새 프로젝트를 만드는 칸이다
 * @param onDone 서버에 반영했다. 새로 만들었으면 그 프로젝트의 주소 조각(`project-<번호>`)을 넘겨 그리로 옮겨 간다
 */
export function ProjectPanel({
  row,
  projects,
  services,
  onDone,
}: {
  row?: SettingsProject;
  projects: SettingsProject[];
  services: SettingsServiceRow[];
  onDone: (옮길곳?: string) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 새것 = row === undefined;
  const [name, setName] = useState(row?.name ?? '');
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const 안의것 = row === undefined ? [] : services.filter((it) => it.projectId === row.id);

  async function 한다(일: () => Promise<string | undefined>) {
    set보내는중(true);
    setErr(null);
    try {
      onDone(await 일());
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">
        {새것 ? (
          t('새 프로젝트')
        ) : (
          <>
            {row.name}
            <span className="set-sub">{t('애플리케이션 {수}개', { 수: 안의것.length })}</span>
          </>
        )}
      </h2>

      <구획 제목={t('기본 정보')} 쓰임={t('프로젝트 하나에 애플리케이션 여럿이 들어갑니다. 권한은 프로젝트마다 줍니다')}>
        <div className="field">
          <label htmlFor="pf-name">{t('프로젝트 이름')}</label>
          <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('데모마켓')} />
        </div>
      </구획>

      {err === null ? null : <div className="err">{err}</div>}
      <div className="set-foot">
        <button
          className="btn"
          disabled={보내는중}
          onClick={() => {
            if (name.trim() === '') return;
            void 한다(async () => {
              if (새것) return `project-${(await api.createProject(name.trim())).id}`;
              await api.renameProject(row.id, name.trim());
              return undefined;
            });
          }}
        >
          {새것 ? t('프로젝트 추가') : t('저장')}
        </button>
      </div>
      {name.trim() === '' ? <div className="hint set-why">{t('이름을 입력해 주세요')}</div> : null}

      {새것 ? null : (
        <구획 제목={t('애플리케이션 옮기기')} 쓰임={t('옮기면 그 애플리케이션은 옮겨 간 프로젝트의 권한을 따릅니다. 모두 옮기면 빈 프로젝트는 저절로 사라집니다')}>
          {안의것.length === 0 ? <p className="hint">{t('아직 애플리케이션이 없습니다')}</p> : null}
          {안의것.map((it) => (
            <div key={it.id} className="set-row">
              <span className="set-name">{it.name}</span>
              <span className="set-sub">{it.prefix}</span>
              <label className="set-sub" htmlFor={`pf-move-${it.id}`}>
                {t('옮길 프로젝트')}
              </label>
              <select
                id={`pf-move-${it.id}`}
                value={row.id}
                disabled={보내는중}
                onChange={(e) => {
                  const projectId = Number(e.target.value);
                  void 한다(async () => {
                    await api.updateService(it.id, { projectId });
                    return undefined;
                  });
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </구획>
      )}

      {새것 ? null : <ApiServers key={row.id} 프로젝트={row.id} />}
    </div>
  );
}
