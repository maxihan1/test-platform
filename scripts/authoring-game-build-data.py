# Unity 빌드에서 데이터 묶음(ScriptableObject) 타입의 칸 이름과 값을 꺼낸다 — authoring-game-build-data.ts 가 자리 uid · 빈 환경으로 부른다
# 쓰는 법: python3 -I authoring-game-build-data.py <_Data 폴더> <자료 폴더>
# 믿을 수 없는 고객 빌드를 읽는다. 게임 코드는 실행하지 않고 dll 은 칸 구조(타입 트리)를 만드는 데만 쓴다
import json
import os
import sys

# 게임이 아닌 엔진 · 패키지 어셈블리 — 데이터 묶음이 있어도 게임 값이 아니다
엔진접두사 = (
    'UnityEngine', 'Unity.RenderPipelines', 'Unity.TextMeshPro', 'Unity.InputSystem', 'Unity.Cinemachine', 'Unity.Timeline',
    'Unity.Postprocessing', 'Unity.Mathematics', 'Unity.Burst', 'Unity.Collections', 'Unity.Netcode', 'Unity.Multiplayer.Tools',
    'Unity.Services', 'Unity.Splines', 'Unity.AI.Navigation', 'Unity.Tutorials', 'Unity.Addressables', 'Unity.ResourceManager',
    'Unity.ScriptableBuildPipeline', 'Unity.VisualScripting', 'System', 'mscorlib', 'netstandard', 'Mono.',
)
# 타입 트리 맨 앞 공통 칸 — 게임 값이 아니다
공통칸 = ('m_GameObject', 'm_Enabled', 'm_Script', 'm_Name', 'm_EditorHideFlags', 'm_EditorClassIdentifier')
값상한 = 40_000_000


def 쓰기(폴더, 이름, 글):
    # 임시 파일에 쓰고 바꿔 읽는 쪽이 반쪽 파일을 보지 않게
    임시 = os.path.join(폴더, '.' + 이름 + '.tmp')
    with open(임시, 'w', encoding='utf-8') as f:
        f.write(글)
    os.replace(임시, os.path.join(폴더, 이름))


def 스크립트찾기(o, 파일들, 캐시):
    d = o.read_typetree(check_read=False)
    sp = d['m_Script']
    af = o.assets_file
    if sp['m_FileID'] != 0:
        af = 파일들.get(os.path.basename(af.externals[sp['m_FileID'] - 1].path))
        if af is None:
            return d, None
    열쇠 = (id(af), sp['m_PathID'])
    if 열쇠 not in 캐시:
        s = af.objects.get(sp['m_PathID'])
        t = s.read_typetree(check_read=False) if s is not None else None
        캐시[열쇠] = None if t is None else (t['m_AssemblyName'], t['m_Namespace'], t['m_ClassName'])
    return d, 캐시[열쇠]


def main():
    데이터, 자료 = sys.argv[1], sys.argv[2]
    관리 = os.path.join(데이터, 'Managed')
    if not os.path.isdir(관리):
        print('Managed 폴더가 없다(IL2CPP 빌드) — 데이터 묶음을 안 꺼낸다')
        return 0
    import UnityPy
    from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator

    env = UnityPy.load(데이터)
    파일들 = {os.path.basename(k): v for k, v in env.files.items()}
    묶음 = {}
    캐시 = {}
    for o in env.objects:
        if o.type.name != 'MonoBehaviour':
            continue
        try:
            d, 이름표 = 스크립트찾기(o, 파일들, 캐시)
        except Exception:
            continue
        # 게임 오브젝트가 없는 것이 데이터 묶음(ScriptableObject)이다
        if 이름표 is None or d['m_GameObject']['m_PathID'] != 0 or 이름표[0].startswith(엔진접두사):
            continue
        묶음.setdefault(이름표, []).append(o)
    if not 묶음:
        print('게임의 데이터 묶음이 없다')
        return 0

    gen = TypeTreeGenerator(str(env.objects[0].assets_file.unity_version))
    gen.load_local_dll_folder(관리)
    줄들 = []
    값들 = {}
    for (어셈블리, 이름공간, 클래스), 오브젝트들 in sorted(묶음.items()):
        전체 = (이름공간 + '.' if 이름공간 else '') + 클래스
        try:
            nodes = gen.get_nodes_up(어셈블리, 전체)
            칸들 = [(n.m_Name, n.m_Type) for n in gen.get_nodes(어셈블리 + '.dll', 전체) if n.m_Level == 1 and n.m_Name not in 공통칸]
        except Exception as e:
            print('구조 못 만듦', 전체, str(e)[:120])
            continue
        줄들.append(클래스 + ' ' + ' '.join(n + ':' + t.replace(' ', '') for n, t in 칸들))
        읽음 = {}
        for o in 오브젝트들:
            try:
                t = o.read_typetree(nodes=nodes, check_read=True)
            except Exception:
                continue
            이름 = t.get('m_Name') or str(o.path_id)
            if 이름 in 읽음:
                이름 += '#' + str(o.path_id)
            읽음[이름] = {k: v for k, v in t.items() if k not in 공통칸}
        if 읽음:
            값들[클래스] = 읽음
    글 = json.dumps(값들, ensure_ascii=False, default=str)
    if len(글) > 값상한:
        print('값이 너무 커서 안 쓴다', len(글))
        return 0
    쓰기(자료, 'game-types.txt', '\n'.join(줄들) + '\n')
    쓰기(자료, 'game-build-data.json', 글)
    print('타입', len(줄들), '묶음 종류', len(값들))
    return 0


if __name__ == '__main__':
    sys.exit(main())
