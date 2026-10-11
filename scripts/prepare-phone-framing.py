"""Fit the full supplied valley into a 4K portrait scene without side cropping."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'public/media'
sources = {entry['name']: entry for entry in json.loads((MEDIA / 'manifest.json').read_text())}
output = MEDIA / 'home-phone-full.mp4'

with tempfile.TemporaryDirectory() as temporary:
    # Blend the existing sky into the top edge; keep the complete valley width.
    mask = Image.new('L', (2160, 1620), 255)
    for y in range(100):
        mask.paste(round(255 * y / 100), (0, y, 2160, y + 1))
    mask_path = Path(temporary) / 'sky-blend.png'
    mask.save(mask_path)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y',
        '-i', str(MEDIA / 'home-tablet.mp4'),
        '-i', str(MEDIA / 'home-phone.mp4'),
        '-loop', '1', '-framerate', '30', '-i', str(mask_path),
        '-filter_complex_threads', '2', '-filter_complex',
        '[0:v]scale=2160:1620:flags=lanczos,setsar=1,format=yuv420p[art];'
        '[2:v]format=gray[mask];[art][mask]alphamerge[valley];'
        '[1:v]crop=2160:850:0:0,split=5[s0][s1][s2][s3][s4];'
        '[s0][s1][s2][s3][s4]vstack=inputs=5,crop=2160:3840:0:0[sky];'
        '[sky][valley]overlay=0:2220:format=yuv420:shortest=1,setsar=1[out]',
        '-map', '[out]', '-an', '-t', '36', '-r', '30',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '4',
        '-profile:v', 'high', '-level:v', '5.1', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', str(output),
    ], check=True)

poster = MEDIA / 'home-phone-full.webp'
with tempfile.TemporaryDirectory() as temporary:
    frame = Path(temporary) / 'poster.png'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-ss', '1', '-i', str(output), '-frames:v', '1', str(frame)], check=True)
    Image.open(frame).save(poster, 'WEBP', quality=95, method=6)

stream = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,avg_frame_rate', '-of', 'json', str(output),
]))['streams'][0]
assert (stream['width'], stream['height']) == (2160, 3840)
assert stream['avg_frame_rate'] == '30/1'
metadata = {
    'name': 'home-phone-full', 'width': 2160, 'height': 3840, 'fps': 30,
    'bytes': output.stat().st_size,
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'source': 'home-tablet', 'sourceSha256': sources['home-tablet']['sha256'],
    'skySource': 'home-phone', 'skySourceSha256': sources['home-phone']['sha256'],
    'composition': {'x': 0, 'y': 2220, 'width': 2160, 'height': 1620},
    'posterSha256': hashlib.sha256(poster.read_bytes()).hexdigest(),
}
(MEDIA / 'phone-framing.json').write_text(json.dumps(metadata, indent=2) + '\n')
Image.open(MEDIA / 'home-phone.webp').crop((0, 0, 2160, 850)).save(MEDIA / 'home-sky.webp', 'WEBP', quality=95, method=6)
print(f'Full valley phone animation: 2160 × 3840, 30 fps, {metadata["bytes"] / 1024**2:.1f} MiB')
