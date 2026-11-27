# Unity 빌드 zip 을 풀어 데이터 묶음(ScriptableObject) 타입의 칸 이름과 값을 꺼낸다 — authoring-game-build-data.ts 가 자리 uid · 빈 환경으로 부른다
# 쓰는 법: python3 -I authoring-game-build-data.py <zip 파일> <풀 폴더> <자료 폴더>   ·   자체 검사: python3 -I authoring-game-build-data.py --self-check
# 믿을 수 없는 고객 빌드를 읽는다. 게임 코드는 실행하지 않고 dll 은 칸 구조(타입 트리)를 만드는 데만 쓴다. 풀기 안전장치는 순수 함수라 자체 검사가 UnityPy 없이 돈다
# 끝 코드 — 0 꺼냈다(꺼낼 묶음이 없어도) · 2 zip 을 거절했다(열쇠를 안 남긴다) · 3 건너뛴다(IL2CPP 라 Managed 가 없다 · 열쇠는 남긴다) · 그 밖은 실패
import io
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile

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
# 풀린 크기 · 항목 수 상한 — 넘으면 거절한다(압축 폭탄). 풀 때 그림 · 소리 원본(resS · resource)과 StreamingAssets 는 안 푼다(값이 아니다)
풀기상한 = 3 * 1024 ** 3
항목상한 = 100_000


def 위험한이름인가(이름):
    # 자리 밖으로 새는 이름 — 역슬래시 · NUL · 절대 경로 · 드라이브 문자 · `..` 조각
    return '\\' in 이름 or '\0' in 이름 or 이름.startswith('/') or re.match(r'^[A-Za-z]:', 이름) is not None or '..' in 이름.split('/')


def 풀계획만들기(이름들):
    """zip 항목 이름들에서 풀 것을 고른다 — ('막힘', 까닭) · ('건너뜀', 까닭) · ('풀기', 뿌리, 항목).
    자리 밖으로 새는 항목이 하나라도 있으면 통째로 거절한다(정상 빌드에는 없다). Managed/*.dll 이 가장 많은 폴더가 뿌리다 —
    윈도우 `<X>_Data` · 맥 `Contents/Resources/Data` · 안드로이드 `assets/bin/Data`. dll 이 없으면 IL2CPP 빌드라 건너뛴다"""
    for 이름 in 이름들:
        if 위험한이름인가(이름):
            return ('막힘', 'zip 에 자리 밖으로 새는 항목이 있다: ' + 이름[:80])
    뿌리표 = {}
    for 이름 in 이름들:
        m = re.match(r'^(?:(.*)/)?Managed/[^/]+\.dll$', 이름, re.IGNORECASE)
        if m is not None:
            뿌리 = m.group(1) or ''
            뿌리표[뿌리] = 뿌리표.get(뿌리, 0) + 1
    if not 뿌리표:
        return ('건너뜀', 'Managed 폴더가 없다(IL2CPP 빌드)')
    뿌리 = sorted(뿌리표.items(), key=lambda kv: -kv[1])[0][0]
    앞 = '' if 뿌리 == '' else 뿌리 + '/'
    항목 = [
        이름 for 이름 in 이름들
        if 이름.startswith(앞) and not 이름.endswith('/') and not re.search(r'\.(resS|resource)$', 이름, re.IGNORECASE)
        and not 이름[len(앞):].startswith('StreamingAssets/')
    ]
    if len(항목) > 항목상한:
        return ('막힘', '풀 항목이 너무 많다(%d)' % len(항목))
    return ('풀기', 뿌리, 항목)


def 자리계산(대상절대, 이름, 앞길이):
    """항목이 풀릴 자리 — 대상 폴더 안이 아니면 None"""
    자리 = os.path.normpath(os.path.join(대상절대, 이름[앞길이:]))
    return 자리 if 자리.startswith(대상절대 + os.sep) else None


def 풀기(zf, 뿌리, 항목, 대상, 상한=풀기상한):
    """고른 항목을 대상 폴더에 일반 파일로만 푼다(링크를 안 만든다 · 있는 파일을 안 덮는다). 풀린 크기가 상한을 넘으면 ValueError"""
    os.makedirs(대상, mode=0o755, exist_ok=True)
    대상절대 = os.path.realpath(대상)
    앞길이 = 0 if 뿌리 == '' else len(뿌리) + 1
    쌓임 = 0
    for 이름 in 항목:
        자리 = 자리계산(대상절대, 이름, 앞길이)
        if 자리 is None:
            raise ValueError('자리 밖으로 새는 항목: ' + 이름[:80])
        os.makedirs(os.path.dirname(자리), mode=0o755, exist_ok=True)
        # 선언된 크기는 믿지 않는다 — 읽으면서 센다
        with zf.open(이름) as 원, open(자리, 'xb') as 새:
            while True:
                조각 = 원.read(1 << 20)
                if not 조각:
                    break
                쌓임 += len(조각)
                if 쌓임 > 상한:
                    raise ValueError('풀린 크기가 상한을 넘었다')
                새.write(조각)


def dll이름(어셈블리):
    # MonoScript 의 m_AssemblyName 이 이미 `.dll` 로 끝나는 빌드가 있다 — 또 붙이면 `.dll.dll` 을 찾는다
    return 어셈블리 if 어셈블리.lower().endswith('.dll') else 어셈블리 + '.dll'


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


def 읽기(데이터, 자료):
    관리 = os.path.join(데이터, 'Managed')
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
            칸들 = [(n.m_Name, n.m_Type) for n in gen.get_nodes(dll이름(어셈블리), 전체) if n.m_Level == 1 and n.m_Name not in 공통칸]
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


def main():
    압축파일, 풀곳, 자료 = sys.argv[1], sys.argv[2], sys.argv[3]
    try:
        zf = zipfile.ZipFile(압축파일)
    except (zipfile.BadZipFile, OSError) as e:
        print('zip 을 못 열었다', str(e)[:120])
        return 2
    with zf:
        계획 = 풀계획만들기([i.filename for i in zf.infolist() if not i.is_dir()])
        if 계획[0] == '막힘':
            print(계획[1])
            return 2
        if 계획[0] == '건너뜀':
            print(계획[1])
            return 3
        try:
            풀기(zf, 계획[1], 계획[2], 풀곳)
        except ValueError as e:
            print(str(e))
            return 2
    return 읽기(풀곳, 자료)


def 자체검사():
    assert all(위험한이름인가(x) for x in ('../evil', 'G_Data/../../evil', '/etc/passwd', 'C:/evil', 'G_Data\\..\\evil', 'a\0b')), '위험한 이름'
    assert not 위험한이름인가('G_Data/Managed/A..dll') and not 위험한이름인가('G_Data/a.b'), '..이 이름 안에 든 것은 괜찮다'

    계획 = 풀계획만들기([
        'Cats Go.exe', 'Cats Go_Data/Managed/A.dll', 'Cats Go_Data/globalgamemanagers', 'Cats Go_Data/level0', 'Cats Go_Data/level0.resS',
        'Cats Go_Data/sharedassets0.resource', 'Cats Go_Data/StreamingAssets/video.mp4', 'Cats Go_Data/', 'UnityPlayer.dll',
    ])
    assert 계획 == ('풀기', 'Cats Go_Data', ['Cats Go_Data/Managed/A.dll', 'Cats Go_Data/globalgamemanagers', 'Cats Go_Data/level0']), 계획
    assert 풀계획만들기(['assets/bin/Data/Managed/A.dll', 'assets/bin/Data/data.unity3d'])[1] == 'assets/bin/Data'
    assert 풀계획만들기(['G.app/Contents/Resources/Data/Managed/A.dll'])[1] == 'G.app/Contents/Resources/Data'
    assert 풀계획만들기(['Managed/A.dll', 'level0']) == ('풀기', '', ['Managed/A.dll', 'level0'])
    assert 풀계획만들기(['G_Data/il2cpp_data/Metadata/global-metadata.dat', 'GameAssembly.dll']) == ('건너뜀', 'Managed 폴더가 없다(IL2CPP 빌드)')
    assert 풀계획만들기(['G_Data/Managed/A.dll', '../evil'])[0] == '막힘'
    assert 풀계획만들기(['G_Data/Managed/A.dll'] + ['G_Data/f%d' % i for i in range(항목상한)])[0] == '막힘', '항목 상한'

    assert dll이름('Assembly-CSharp') == 'Assembly-CSharp.dll'
    assert dll이름('Assembly-CSharp.dll') == 'Assembly-CSharp.dll'
    assert dll이름('Game.DLL') == 'Game.DLL'

    대상 = tempfile.mkdtemp(prefix='build-data-check-')
    try:
        검사들(대상)
    finally:
        shutil.rmtree(대상, ignore_errors=True)
    print('자체 검사 통과')
    return 0


def 검사들(대상):
    assert 자리계산(대상, 'G_Data/../../evil', 7) is None and 자리계산(대상, 'G_Data/a/b', 7) == os.path.join(대상, 'a', 'b')
    바탕 = io.BytesIO()
    with zipfile.ZipFile(바탕, 'w') as z:
        z.writestr('G_Data/Managed/A.dll', 'dll')
        z.writestr('G_Data/sub/x.assets', 'assets')
        z.writestr('G_Data/big', 'x' * 100)
    with zipfile.ZipFile(바탕) as z:
        풀기(z, 'G_Data', ['G_Data/Managed/A.dll', 'G_Data/sub/x.assets'], os.path.join(대상, 'out'))
        assert open(os.path.join(대상, 'out', 'Managed', 'A.dll')).read() == 'dll'
        assert open(os.path.join(대상, 'out', 'sub', 'x.assets')).read() == 'assets'
        for 나쁜 in (lambda: 풀기(z, 'G_Data', ['G_Data/big'], os.path.join(대상, 'small'), 50), lambda: 풀기(z, 'G_Data', ['G_Data/sub/x.assets'], os.path.join(대상, 'out'))):
            try:
                나쁜()
            except (ValueError, FileExistsError):
                pass
            else:
                raise AssertionError('상한을 넘거나 있는 파일을 덮었다')
    # 자리 밖 항목은 쓰지 않고 던진다
    밖 = io.BytesIO()
    with zipfile.ZipFile(밖, 'w') as z:
        z.writestr('G_Data/../../evil.txt', 'x')
    with zipfile.ZipFile(밖) as z:
        try:
            풀기(z, 'G_Data', ['G_Data/../../evil.txt'], os.path.join(대상, 'out2'))
        except ValueError:
            pass
        else:
            raise AssertionError('자리 밖 항목을 풀었다')
    assert not os.path.exists(os.path.join(대상, 'evil.txt')) and not os.path.exists(os.path.join(os.path.dirname(대상), 'evil.txt'))


if __name__ == '__main__':
    sys.exit(자체검사() if sys.argv[1:] == ['--self-check'] else main())
