"""Create smaller 4K delivery copies without changing the supplied masters.

This is an explicit asset preparation step, not a build dependency. Committed
delivery files let GitHub Pages build without ffmpeg or the local master folders.
"""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'public/media'
ENCODING = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
            '-pix_fmt', 'yuv420p', '-g', '120', '-movflags', '+faststart']


def inspect(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,avg_frame_rate,nb_frames:format=duration',
        '-of', 'json', str(path)]))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


if __name__ == '__main__':
    entries = []
    originals = json.loads((MEDIA / 'manifest.json').read_text())
    for original in originals:
        if not original['name'].startswith('home-'):
            continue
        source = MEDIA / f"{original['name']}.mp4"
        output = MEDIA / f"{original['name']}-playback.mp4"
        poster = MEDIA / f"{original['name']}-playback.webp"
        assert digest(source) == original['sha256'], 'The supplied master changed'
        if not output.exists():
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error',
                            '-i', str(source), *ENCODING, str(output)], check=True)
        before, after = inspect(source), inspect(output)
        assert before == after, 'Keep every original frame, dimension, and timestamp'
        Image.open(MEDIA / f"{original['name']}.webp").save(
            poster, 'WEBP', quality=80, method=6)
        stream = after['streams'][0]
        entries.append(dict(name=original['name'], file=output.name,
                            source=source.name, sourceSha256=original['sha256'],
                            sha256=digest(output), bytes=output.stat().st_size,
                            **stream, duration=after['format']['duration'],
                            poster=poster.name, posterSha256=digest(poster),
                            encoding=ENCODING))
        print(f"{output.name}: {output.stat().st_size / 1024**2:.1f} MiB "
              f"({100 * output.stat().st_size / original['bytes']:.0f}% of master)", flush=True)
    (MEDIA / 'playback-manifest.json').write_text(json.dumps(entries, indent=2) + '\n')
