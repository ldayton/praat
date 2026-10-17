#!/usr/bin/env python3
"""Requires activated Emscripten. Builds only the source list in sources.txt."""
import pathlib,subprocess,concurrent.futures,os,shutil,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
os.chdir(root)
build=root/'wasm/build';build.mkdir(parents=True,exist_ok=True)
if not shutil.which('em++'):raise SystemExit('Activate Emscripten first: source /path/to/emsdk/emsdk_env.sh')
includes=[arg for d in sorted({str(p.parent) for p in root.rglob('*.h') if '.git' not in p.parts}) for arg in ['-I',d]]
common=['-sUSE_ZLIB=1','-O2','-DUNIX','-Dlinux','-DNO_GRAPHICS','-D_FILE_OFFSET_BITS=64','-DWORDS_BIGENDIAN=0','-DPA_LITTLE_ENDIAN','-fexceptions',*includes]
signature=hashlib.sha256((' '.join(common)+pathlib.Path(__file__).read_text()).encode()).hexdigest()
stamp=build/'configuration.sha256'
if not stamp.exists() or stamp.read_text()!=signature:
 for old in build.glob('*.o'):old.unlink()
 stamp.write_text(signature)
header_mtime=max(p.stat().st_mtime for p in root.rglob('*.h') if 'build' not in p.parts)
sources=(root/'wasm/sources.txt').read_text().splitlines()+['wasm/spectrogram.cpp']
def compile(src):
 obj=build/(src.replace('/','_')+'.o')
 if not obj.exists() or obj.stat().st_mtime<max((root/src).stat().st_mtime,header_mtime):
  cpp=not src.endswith('.c')
  cmd=['em++' if cpp else 'emcc',*common,'-std=c++17' if cpp else '-std=gnu99','-c',src,'-o',str(obj)]
  result=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  if result.returncode:print(result.stdout,flush=True);raise RuntimeError(src)
 return str(obj)
with concurrent.futures.ThreadPoolExecutor(max_workers=int(os.getenv('JOBS','8'))) as pool:objects=list(pool.map(compile,sources))
subprocess.run(['em++',*objects,'-sUSE_ZLIB=1','-O2','-fexceptions','--no-entry','-sMODULARIZE=1','-sEXPORT_NAME=PraatSpectrogram','-sALLOW_MEMORY_GROWTH=1','-sENVIRONMENT=web,worker,node','-sEXPORTED_FUNCTIONS=["_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["HEAPF32","UTF8ToString"]','-o',str(build/'praat-spectrogram.js')],check=True)
