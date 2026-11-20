#!/usr/bin/env python3
"""恢复独立周报入口，加密取回最近周报供本机维护。"""
import base64
import datetime
import json
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request


def status(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def main():
    operation, certificate = sys.argv[1:]
    if operation not in ('inspect', 'repair'):
        raise ValueError('不支持的操作')
    cert = base64.b64decode(certificate, validate=True)
    if len(cert) > 16384 or not cert.startswith(b'-----BEGIN CERTIFICATE-----'):
        raise ValueError('传输证书无效')
    subprocess.run(['openssl', 'x509', '-noout'], input=cert, check=True, stdout=subprocess.DEVNULL)
    settings = {}
    for line in Path('/etc/weekly-report.env').read_text().splitlines():
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, value = line.split('=', 1)
        parsed = shlex.split(value)
        settings[key] = parsed[0] if parsed else ''
    origin = settings['WEEKLY_ORIGIN']
    if origin != 'https://issane.cn' or settings.get('WEEKLY_BASE') != '/weekly/':
        raise ValueError('周报站点配置与预期不符')
    subprocess.run(['systemctl', 'is-active', '--quiet', 'weekly-report'], check=True)
    if status('http://127.0.0.1:1167/weekly/') != 401:
        raise RuntimeError('独立服务未返回预期鉴权状态，未修改 Nginx')
    print('独立周报服务正常，匿名访问返回 401。')
    config = Path('/etc/nginx/sites-available/trpg-helper')
    original = config.read_text()
    include = 'include /etc/nginx/snippets/weekly-report*.conf;'
    present = bool(re.search(r'include\s+/etc/nginx/snippets/weekly-report\*?\.conf;', original))
    if operation == 'repair' and not present:
        marker = 'include /etc/nginx/snippets/trpg-content-active.conf;'
        if original.count(marker) != 1 or 'listen 443' not in original:
            raise RuntimeError('无法唯一定位 HTTPS 配置，未修改 Nginx')
        snippet = Path('/etc/nginx/snippets/weekly-report.conf')
        expected = Path(__file__).with_name('nginx.conf').read_text()
        normalize = lambda text: '\n'.join(line.strip() for line in text.splitlines() if line.strip() and not line.lstrip().startswith('#'))
        if not snippet.exists() or normalize(snippet.read_text()) != normalize(expected):
            raise RuntimeError('现有周报转发配置与仓库不一致，未修改 Nginx')
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup = config.with_name(config.name + '.weekly-backup-' + stamp)
        shutil.copy2(config, backup)
        try:
            config.write_text(original.replace(marker, marker + '\n    ' + include, 1))
            subprocess.run(['nginx', '-t'], check=True)
            subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
            if status(origin + '/weekly/') != 401:
                raise RuntimeError('周报入口鉴权检查失败')
        except Exception:
            shutil.copy2(backup, config)
            subprocess.run(['nginx', '-t'], check=True)
            subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
            raise
        print('已恢复周报转发，配置检查通过，原配置备份已保留。')
    print('周报入口状态：', status(origin + '/weekly/'))
    data = Path(settings['WEEKLY_DATA_DIR']).resolve()
    reports = []
    for path in (data / 'reports').glob('*.md'):
        if re.fullmatch(r'\d{4}-Q[1-4]-week\d+_\d{2}\.\d{2}\.md', path.name) and not path.is_symlink():
            reports.append({'name': path.name, 'body': path.read_text()})
    reports.sort(key=lambda item: (item['name'][:4], item['name'][-8:-3]), reverse=True)
    print('运行时周报数量：', len(reports))
    print('最近周报文件：', ', '.join(item['name'] for item in reports[:8]))
    payload = json.dumps({'reports': reports[:8], 'settings': {
        key: settings[key] for key in ('WEEKLY_USER', 'WEEKLY_PASSWORD_BASE64', 'WEEKLY_PASSWORD', 'WEEKLY_ORIGIN') if key in settings
    }}, ensure_ascii=False).encode()
    with tempfile.TemporaryDirectory(prefix='weekly-export-') as folder:
        cert_path = Path(folder) / 'transfer.pem'
        cert_path.write_bytes(cert)
        encrypted = subprocess.run(['openssl', 'cms', '-encrypt', '-aes-256-cbc', '-binary', '-outform', 'DER', str(cert_path)], input=payload, stdout=subprocess.PIPE, check=True).stdout
    print('WEEKLY_EXPORT_BEGIN')
    print(base64.b64encode(encrypted).decode())
    print('WEEKLY_EXPORT_END')


if __name__ == '__main__':
    main()
