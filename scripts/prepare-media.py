"""Stage byte-identical 4K exports and native-resolution posters."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess
import json
import io
import sys
from PIL import Image
import shutil
import hashlib

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'public/media'
JOBS = [
    ('home-desktop', 'finalhomepage/valley-living-ascii-36s-4k-desktop.mp4'),
    ('home-tablet', 'finalhomepage/valley-living-ascii-36s-4k-tablet.mp4'),
    ('home-phone', 'finalhomepage/valley-living-ascii-36s-4k-phone.mp4'),
    ('about-desktop', 'finalabout/about-living-ascii-4k-v2-desktop.mp4'),
    ('about-tablet', 'finalabout/about-living-ascii-4k-v2-original.mp4'),
    ('about-phone', 'finalabout/about-living-ascii-4k-v2-phone.mp4'),
]

def prepare(job):
    name, source = job
    path = DEST / f'{name}.mp4'
    poster = DEST / f'{name}.webp'
    original = ROOT / source
    if not path.exists() or path.stat().st_size != original.stat().st_size or '--force' in sys.argv:
        shutil.copyfile(original,path)
    if not poster.exists() or '--force' in sys.argv:
        raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', '1', '-i', str(ROOT / source),
            '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True).stdout
        Image.open(io.BytesIO(raw)).save(poster, 'WEBP', quality=95, method=6)
    stream = json.loads(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(path)],capture_output=True,text=True,check=True).stdout)['streams'][0]
    assert max(stream['width'],stream['height']) >= 3840
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest == hashlib.sha256(original.read_bytes()).hexdigest()
    print(f'{name}: {path.stat().st_size / 1024**2:.1f} MB', flush=True)
    return dict(name=name, source=source, bytes=path.stat().st_size, width=stream['width'],height=stream['height'],sha256=digest,byteIdentical=True)

if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(prepare, JOBS))
    (DEST / 'manifest.json').write_text(json.dumps(results, indent=2) + '\n')
