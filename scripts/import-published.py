"""Import visible content from the inspected GitHub Pages publication.

The reference website is read-only. Never import its runtime, environment,
voice profile, or unpublished content into this site.
"""
from html.parser import HTMLParser
from html import escape
from pathlib import Path
from urllib.parse import urlparse, unquote
import json
import shutil
import hashlib
import re
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path.home() / 'Desktop/dhwanishah.net'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Element:
    def __init__(self, tag='document', attrs=None, parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs or []), parent
        self.children = []

    def text(self):
        return ' '.join(' '.join(c.text() if isinstance(c, Element) else c for c in self.children).split())

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = Element()
        self.current = self.root
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs, self.current)
        self.current.children.append(element)
        if tag not in VOID:
            self.current = element

    def handle_endtag(self, tag):
        cursor = self.current
        while cursor.parent:
            if cursor.tag == tag:
                self.current = cursor.parent
                break
            cursor = cursor.parent

    def handle_data(self, text):
        self.current.children.append(text)

def read(route):
    return Document((ROOT / '.reference' / f'{route}.html').read_text()).root

def image_path(src):
    return unquote(urlparse(src).path)

def media(node):
    return [(n.tag, n.attrs['src'] if n.tag == 'iframe' else image_path(n.attrs['src'])) for n in node.walk() if n.tag in ('img', 'video', 'iframe') and n.attrs.get('src')]

CATALOG = [
    dict(id='tally', title='Tally', description='AI-Native bookkeeping agent for automating expense tracking, filing, and receipt extraction.', tags=['Agentic AI', 'Receipt automation', 'Expense categorization'], preview='/assets/images/krraSyH08fFeIOG9BdqEzE7QuWs.jpg'),
    dict(id='sprint-x', title='Sprint X', description='Automated task allocation and sprint optimization', tags=['Agentic AI', 'Sprint planning', 'Agile', 'Task management'], preview='/assets/images/2Jvkn49eF0WOnLiSONCsAKZSSRQ.jpg'),
    dict(id='curalink', title='CuraLink', description='An Integrated Approach to Revolutionizing Medication Management and Access', tags=['Healthcare infrastructure', 'AI'], preview='/assets/images/Bkdz6yEGSXBdOShESmTzfBno.jpg'),
    dict(id='architectural-design', title='Architectural Design', description='Product of observations, learnings, experiments, theories, and research conducted in design studios, site visits and everyday life', tags=['Construction', 'Storytelling', 'Technical drawings'], preview='/assets/images/U8yVw1u3PrsBCjqWiDGsj6Lzrc8.png'),
]
EXCLUDE = {'Dhwani Shah', 'Case Studies', 'About', 'Resume', 'Contact', 'LinkedIn', 'Instagram', 'INFORMATION', '© 2025 Dhwani Shah', '© 2025 Dhwani Shah.', 'Interact with prototype'}
DECORATIONS = {'4ew2vXANO3t9HlSZSpfrVRQ8.svg', 'Rma7zPDlQ2bUvxKAdpCRdpTWk.svg', 'YC6jviBtSNb5SgYZNy1bTPe0jQ.svg', '5f50kWEEwRBLlcu134g6d6ks9Xc.svg'}
ASSETS = {a['path']: a['sha'] for a in json.loads((ROOT / '.reference/assets.json').read_text())}
asset_manifest = {}

def asset(src):
    original = SOURCE / src.lstrip('/')
    raw = original.read_bytes()
    sha = hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest()
    expected = ASSETS.get(src.lstrip('/'))
    if expected != sha:
        raise ValueError(f'Local asset differs from published version: {src}')
    dest = ROOT / 'public' / src.lstrip('/')
    dest.parent.mkdir(parents=True, exist_ok=True)
    entry = dict(source=src, publishedSha=sha)
    if original.suffix.lower() in ('.jpg', '.jpeg', '.png'):
        im = Image.open(original)
        entry['width'], entry['height'] = im.size
    if not dest.exists():
        shutil.copyfile(original, dest)
    result = src
    entry['output'] = result
    asset_manifest[src] = entry
    return result

def text_nodes(node):
    return [n for n in node.walk() if n.tag in ('h1','h2','h3','h4','h5','h6','p') and n.text()]

def project_data(project):
    document = read(project['id'])
    seen_text, seen_media = set(EXCLUDE), set()
    lead = next((n.text() for n in document.walk() if n.tag == 'h1'), project['description'])
    seen_text.add(lead)
    start = next((n for n in document.walk() if n.attrs.get('data-framer-name') == 'Title'), None)
    modules = [c for c in start.parent.children if isinstance(c, Element)] if start else [document]
    blocks = []
    for module in modules:
        if module.attrs.get('data-framer-name') in ('Footer', 'Title'):
            continue
        texts, labels = [], []
        for n in text_nodes(module):
            value = n.text()
            # Consolidate the separate responsive variants without changing copy.
            key = value.rstrip('.').replace('AI -', 'AI-')
            if value in seen_text or key in seen_text or value in ('%', 'Million', '1 in') or (re.fullmatch(r'\d+\.?', value) and n.tag != 'h3'):
                continue
            seen_text.update([value, key])
            if value.isupper() and len(value) < 70:
                label = re.sub(r'^\d+\s+', '', value)
                if label == 'ROLE':
                    continue
                labels.append(label)
            else:
                texts.append(dict(type='heading' if n.tag in ('h1','h6') else 'paragraph', text=value))
        # Prefer complete paragraphs over line-wrapped responsive copies.
        canonical = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
        texts = [item for item in texts if len(canonical(item['text'])) < 18 or not any(
            canonical(item['text']) in canonical(other['text']) and len(canonical(other['text'])) > len(canonical(item['text']))
            for other in texts)]
        medias = []
        for kind, src in media(module):
            if kind == 'iframe' or src in seen_media or Path(src).name in DECORATIONS:
                continue
            seen_media.add(src)
            medias.append(dict(type='image' if kind == 'img' else 'video', src=asset(src), original=src))
        if texts or labels or medias:
            blocks.append(dict(labels=labels, text=texts, media=medias))
    if project['id'] == 'tally':
        blocks.insert(2, dict(type='prototype', src='https://tallyautomate.lovable.app'))
    return {**project, 'lead': lead, 'blocks': blocks, 'preview': asset(project['preview']), 'illustration': asset(project['preview']), 'caseStudy': f'/case-studies/{project["id"]}.html'}

def about_data():
    document = read('about')
    seen, sections, current = set(), [], None
    for n in text_nodes(document):
        text = n.text()
        if text in seen:
            continue
        seen.add(text)
        if text == 'EVERYDAY':
            break
        if text in ('YESTERDAY', 'TODAY', 'TOMORROW'):
            current = dict(title=text.title(), paragraphs=[])
            sections.append(current)
        elif current and n.tag == 'p':
            current['paragraphs'].append(text)
    images = list(dict.fromkeys(src for kind, src in media(document) if kind == 'img'))
    return dict(sections=sections, portrait=asset(images[0]), alternatePortrait=asset(images[1]), artwork=[asset(src) for src in images[2:]],
        awards=['Archresource Acad Awards Program', 'Land Legend Place, ISOLA Mumbai MMR', 'National Level Design Competition'],
        featured=['ARGUS Investment Memorandum', 'Volume Zero Design Esquisse'], certifications=['Google UX Design Professional'],
        links=dict(email='mailto:dhwani0321@gmail.com', linkedin='https://www.linkedin.com/in/dhwanishahh', instagram='https://www.instagram.com/dhwani.dwg/', blog='https://dhwani0321.substack.com/', resume='https://flowcv.com/resume/la3q6sc74157'))

def generate():
    additions_path = ROOT / 'content/additional-projects.json'
    additions = json.loads(additions_path.read_text()) if additions_path.exists() else []
    projects = additions + [project_data(p) for p in CATALOG]
    overrides_path = ROOT / 'content/preview-overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    for project in projects:
        project.update(overrides.get(project['id'], {}))
    about = about_data()
    font = asset('/assets/assets/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2')
    output = dict(publication='b2371357950dc8c4b26cf29f14ae2f46aad85765', font=font, projects=projects, about=about)
    (ROOT / 'content/published.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'content/asset-provenance.json').write_text(json.dumps(asset_manifest, indent=2) + '\n')
    for p in projects:
        print(f'{p["title"]}: coming soon' if p.get('status') == 'coming-soon' else f'{p["title"]}: {len(p["blocks"])} content sections')
    print(f'{len(asset_manifest)} assets verified against published Git blobs')

if __name__ == '__main__':
    import sys
    if '--inspect' not in sys.argv:
        generate()
        sys.exit(0)
    for route in ['tally', 'sprint-x', 'curalink', 'about', 'architectural-design']:
        document = read(route)
        if '--inspect' in sys.argv:
            print('\nPAGE', route)
            seen = set()
            for n in document.walk():
                if n.tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p') and n.text() and n.text() not in seen:
                    print(n.tag, n.text()); seen.add(n.text())
            print('MEDIA', list(dict.fromkeys(media(document))))
            title = next((n for n in document.walk() if n.attrs.get('data-framer-name') in ('Title', 'VR Dashboard')), None)
            if title:
                print('TOP MODULES', [(c.tag, c.attrs.get('data-framer-name'), c.text()[:60]) for c in title.parent.children if isinstance(c, Element)])
