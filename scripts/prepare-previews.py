"""Restore published static covers while keeping user-supplied replacements."""
from pathlib import Path
import json
import runpy

ROOT = Path(__file__).resolve().parent.parent
importer = runpy.run_path(str(ROOT/'scripts/import-published.py'))
data = json.loads((ROOT/'content/published.json').read_text())
overrides = json.loads((ROOT/'content/preview-overrides.json').read_text())
manifest = json.loads((ROOT/'content/asset-provenance.json').read_text())
homepage = importer['Document']((ROOT/'.reference/published/index.html').read_text()).root
for project in data['projects']:
    if not project.get('caseStudy'):
        continue
    if project['id'] in overrides:
        project.update(overrides[project['id']])
        project.pop('previewVideo', None)
        print(f"{project['id']}: kept supplied preview")
        continue
    link = next(n for n in homepage.walk() if n.tag == 'a' and n.attrs.get('href') == './'+project['id'])
    src = next(n.attrs['src'] for n in link.walk() if n.tag == 'img')
    project['preview'] = project['illustration'] = importer['asset'](importer['image_path'](src))
    project.pop('previewVideo', None)
    print(f"{project['id']}: restored original published cover")
manifest.update(importer['asset_manifest'])
(ROOT/'content/asset-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'content/published.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
