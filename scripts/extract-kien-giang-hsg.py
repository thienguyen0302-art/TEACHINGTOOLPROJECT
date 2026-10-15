"""Extract PDF source privately for review. Never sets verification/publish flags.
Install scripts/kien-giang-requirements.txt; optional OCR needs tesseract + vie/eng data.
"""
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', required=True)
parser.add_argument('--output-dir', default='imports/kien-giang-hsg/extracted')
parser.add_argument('--ocr', action='store_true')
parser.add_argument('--tesseract', default='tesseract')
args = parser.parse_args()
source = Path(args.source_dir)
output = Path(args.output_dir)
# Raw extraction contains marking guides/solutions. Require ignored build-input location.
private_root = (Path(__file__).resolve().parent.parent / 'imports').resolve()
if not output.resolve().is_relative_to(private_root):
    raise SystemExit('Output must be inside ignored imports/ directory')
output.mkdir(parents=True, exist_ok=True)
manifest = json.loads((Path(__file__).parent.parent / 'seed/kien-giang-hsg/manifest.json').read_text())
report = []
for spec in manifest['seasons'] + [manifest['compilation']]:
    pdf = source / spec['source']
    if hashlib.sha256(pdf.read_bytes()).hexdigest() != spec['sha256']:
        raise SystemExit('Source hash mismatch: ' + pdf.name)
    reader = PdfReader(pdf)
    pages = [p.extract_text(extraction_mode='layout') for p in reader.pages]
    (output / (pdf.stem + '.txt')).write_text('\n\f\n'.join(pages))
    if args.ocr and 'season' in spec:
        season = spec['season']
        start_year = int(season[:4])
        statement_pages = 1 if start_year < 2010 else 3 if start_year >= 2022 else 2
        ocr_pages = []
        for page_index in range(statement_pages):
            images = list(reader.pages[page_index].images)
            pieces = []
            for index, image in enumerate(images):
                # Old layered scans have a mostly blank JPEG background and separate text masks.
                if len(images) > 1 and image.image.width < 1000:
                    continue
                filename = output / f'{season}-p{page_index+1}-{index}.png'
                image.image.save(filename)
                result = subprocess.run([args.tesseract, str(filename), 'stdout', '-l', 'vie+eng', '--psm', '3'], capture_output=True, text=True, check=True, env={**os.environ, 'OMP_THREAD_LIMIT': '1'})
                pieces.append(result.stdout)
            ocr_pages.append('\n'.join(pieces))
        (output / f'{season}-ocr.txt').write_text('\n\f\n'.join(ocr_pages))
    report.append({'source': pdf.name, 'sha256': spec['sha256'], 'pages': len(pages), 'statementTextExtractable': bool(pages[0].strip()), 'needsReview': True})
(output / 'extraction-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
