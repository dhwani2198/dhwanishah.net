"""Preserve the published case-study markup, typography and responsive layout.

The original site's navigation and runtime are replaced by our own viewer.
All case-study assets are verified against the pinned publication.
"""
from pathlib import Path
from html import escape
import json
import re
import runpy

ROOT = Path(__file__).resolve().parent.parent
importer = runpy.run_path(str(ROOT/'scripts/import-published.py'))
Document, Element, asset = (importer[key] for key in ('Document', 'Element', 'asset'))
manifest = json.loads((ROOT/'content/asset-provenance.json').read_text())
data = json.loads((ROOT/'content/published.json').read_text())
VOID = importer['VOID']

def serialize(node):
    if isinstance(node, str):
        return escape(node)
    if node.tag in ('script', 'noscript'):
        return ''
    if node.tag == 'style':
        return '<style>' + ''.join(c for c in node.children if isinstance(c,str)) + '</style>'
    attrs = dict(node.attrs)
    # Match the small, spaced monospace labels in the About biography.
    if node.tag == 'h2' and node.text().isupper() and len(node.text()) < 70:
        attrs['class'] = attrs.get('class','') + ' case-section-label'
    for name in list(attrs):
        if name.startswith('on') or name in ('srcset','sizes','fetchpriority','data-framer-hydrate-v2'):
            del attrs[name]
    if node.tag in ('img', 'video', 'source'):
        for name in ('src','poster'):
            if attrs.get(name):
                attrs[name] = asset(importer['image_path'](attrs[name]))
        if node.tag == 'img':
            attrs['loading'], attrs['decoding'] = 'lazy', 'async'
        if node.tag == 'video':
            attrs.pop('autoplay', None)
            attrs['controls'], attrs['preload'] = None, 'none'
    if node.tag == 'iframe':
        attrs['title'] = 'Tally interactive bookkeeping demo'
        attrs['tabindex'] = '-1'
    if node.tag == 'a':
        attrs['target'], attrs['rel'] = '_blank', 'noopener'
    style = attrs.get('style', '')
    # Reveal content that Framer normally reveals after its hydration.
    if 'data-framer-appear-id' in attrs or (attrs.get('data-framer-component-type') == 'RichTextContainer' and re.search(r'opacity:0(?:;|$)', style)):
        style = re.sub(r'(?:opacity|transform|will-change):[^;]+;?', '', style)
    if node.tag == 'section' and 'list-style-type' in style:
        style = re.sub(r'opacity:0(?:;|$)', 'opacity:1;', style)
    attrs['style'] = style
    rendered = ' '.join(escape(k) if v is None else f'{escape(k)}="{escape(str(v), quote=True)}"' for k,v in attrs.items())
    opening = f'<{node.tag} {rendered}>'
    return opening if node.tag in VOID else opening + ''.join(serialize(c) for c in node.children) + f'</{node.tag}>'

for project in data['projects']:
    if not project.get('caseStudy'):
        continue
    route = project['id']
    raw = (ROOT/'.reference/published'/f'{route}.html').read_text()
    document = Document(raw).root
    root = next(n for n in document.walk() if 'data-framer-root' in n.attrs)
    kept = []
    for node in root.children:
        if not isinstance(node, Element):
            continue
        name, text = node.attrs.get('data-framer-name'), node.text()
        if name == 'Footer' or text in ('© 2025 Dhwani Shah', '© 2025 Dhwani Shah.'):
            continue
        if 'Dhwani Shah' in text and ('Case Studies' in text or text == 'Dhwani Shah'):
            continue
        kept.append(node)
    root.children = kept
    root.attrs['style'] = 'width:100%;min-height:0'
    styles = []
    for node in document.walk():
        if node.tag != 'style':
            continue
        css = ''.join(c for c in node.children if isinstance(c,str))
        # Two legacy external DM Sans declarations are unused by these pages.
        css = re.sub(r'@font-face\s*\{[^{}]*/external/[^{}]*\}', '', css)
        def css_asset(match):
            path = match.group(1).strip('"\'')
            if path.startswith('/assets/'):
                asset(importer['image_path'](path))
            return match.group(0)
        css = re.sub(r'url\(([^)]+)\)', css_asset, css)
        styles.append(css)
    # Retain the original section layouts. The page starts within a viewer,
    # so the published header's extra navigation clearance is reduced.
    overrides = '''html,body{margin:0!important;background:#000!important;overflow-x:hidden;color-scheme:dark}
    [data-framer-root]{margin:auto!important;min-height:0!important}
    [data-framer-name="Title"]{padding-top:64px!important}
    button:focus-visible,a:focus-visible{outline:2px solid #bbb;outline-offset:4px}
    @media(max-width:809.98px){[data-framer-name="Title"]{padding-top:42px!important}}
    .native-carousel{overflow-x:auto!important;scroll-snap-type:x mandatory;scrollbar-width:thin;max-width:100%;padding-bottom:8px!important}
    .native-carousel>li{scroll-snap-align:start}
    .native-carousel>li[aria-hidden="true"]{display:none!important}
    .native-carousel video{object-fit:contain!important}
    h2.case-section-label,h2.case-section-label span{font-family:'SFMono-Regular',Menlo,Consolas,monospace!important;font-size:10px!important;font-weight:400!important;line-height:1.7!important;letter-spacing:.13em!important;color:#8c8c87!important;text-transform:uppercase!important;--framer-text-color:#8c8c87!important;--framer-font-size:10px!important;--framer-font-weight:400!important}
    @media(max-width:809.98px){h2.case-section-label,h2.case-section-label span{font-size:9px!important;--framer-font-size:9px!important}}
    '''
    html = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{escape(project["title"])} case study</title><style>{"".join(styles)}{overrides}</style></head><body>{serialize(root)}<script type="module" src="/src/case-study.js"></script></body></html>'
    destination = ROOT/'public/case-studies'/f'{route}.html'
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(html)
    project['caseStudy'] = f'/case-studies/{route}.html'
    print(f'{route}: preserved {len(kept)} published layout modules')

manifest.update(importer['asset_manifest'])
(ROOT/'content/asset-provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'content/published.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
