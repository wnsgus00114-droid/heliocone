"""Create a portable preview and source archive without external dependencies."""
import base64
import re
import subprocess
import sys
import zipfile
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo / "dist"
out.mkdir(parents=True, exist_ok=True)
page = (repo / "index.html").read_text()
mark = "data:image/svg+xml;base64," + base64.b64encode((repo / "mark.svg").read_bytes()).decode()
page = re.sub(r'<link rel="stylesheet" href="([^"?]+)(?:\?[^\"]*)?">', lambda m: "<style>\n" + (repo / m[1]).read_text() + "\n</style>", page)
scripts = []
def collect_script(match):
    scripts.append((repo / match[1]).read_text())
    return ""
page = re.sub(r'<script defer src="([^"?]+)(?:\?[^\"]*)?"></script>', collect_script, page)
page = page.replace('</body>', '<script>\n' + '\n'.join(scripts) + '\n</script>\n</body>')
page = page.replace('href="mark.svg"', f'href="{mark}"').replace('src="mark.svg"', f'src="{mark}"')
(out / "HelioCone.html").write_text(page)
files = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=repo, text=True).splitlines()
with zipfile.ZipFile(out / "heliocone-redesign.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        path = repo / name
        if path.is_file() and out not in path.parents:
            archive.write(path, "heliocone/" + name)
print(f"Preview: {out / 'HelioCone.html'}")
print(f"Source: {out / 'heliocone-redesign.zip'}")
