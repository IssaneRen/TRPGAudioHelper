# GitHub Actions HTTPS 部署说明

主部署工作流 `.github/workflows/deploy.yml` 会在每次部署后重新生成 Nginx 配置。

为了避免覆盖已经配置好的 HTTPS，当前脚本采用以下规则：

1. 优先复用服务器已有腾讯云证书：`/etc/nginx/ssl/issane.cn/fullchain.crt` 和 `/etc/nginx/ssl/issane.cn/privkey.key`。
2. 如果配置了 `NGINX_SSL_CERT_PATH` 和 `NGINX_SSL_KEY_PATH`，则使用这两个路径，并复制到 `/etc/nginx/ssl/trpg-helper/`。
3. 如果存在 `/etc/letsencrypt/live/<证书名>/fullchain.pem` 和 `privkey.pem`，也可以自动生成 `80 -> 443` 跳转和 `443 ssl` 配置。
4. 如果没有证书，则生成 HTTP 配置，并保留 `/.well-known/acme-challenge/` 路径，方便后续申请证书。
5. 每次覆盖前会备份旧配置到 `/etc/nginx/sites-available/trpg-helper.bak-时间戳` 或 `/etc/nginx/sites-enabled/trpg-helper.bak-时间戳`。

推荐在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中添加：

- `NGINX_SERVER_NAME`：Nginx 的 `server_name`，例如 `example.com www.example.com`
- `LETSENCRYPT_CERT_NAME`：Let's Encrypt 证书目录名，例如 `example.com`
- `NGINX_SSL_CERT_PATH`：服务器上的证书链文件路径，例如腾讯云 Nginx 证书包里的 `*_bundle.pem`
- `NGINX_SSL_KEY_PATH`：服务器上的私钥文件路径，必须是 `.key` / private key，不能是 `.csr`

如果服务器已有 `/etc/nginx/ssl/issane.cn/fullchain.crt` 和 `/etc/nginx/ssl/issane.cn/privkey.key`，不需要重新上传，workflow 会优先复用这组文件。

如果配置了 `NGINX_SSL_CERT_PATH` 和 `NGINX_SSL_KEY_PATH`，workflow 会先校验证书和私钥是否匹配，再复制到 `/etc/nginx/ssl/trpg-helper/fullchain.pem` 和 `/etc/nginx/ssl/trpg-helper/privkey.pem`，Nginx 只引用这个稳定目录，不直接引用 `/tmp`。

如果不配置自定义证书路径，脚本会尝试自动读取服务器上第一个 `/etc/letsencrypt/live/*` 证书，并从证书 SAN 中解析域名。

腾讯云 SSL 证书通常需要使用面向 Nginx 的证书包：

- `*_bundle.pem` 或类似 bundle/fullchain 文件：给 `ssl_certificate` 使用
- `*.key` 或 private key 文件：给 `ssl_certificate_key` 使用
- `*.csr`：证书签名请求，不能给 Nginx 当私钥使用

如果服务器上只有 `.csr` 和 bundle 证书，没有 `.key`，需要找回申请 CSR 时生成的私钥；如果找不到，只能重新生成私钥和 CSR，并在腾讯云重新签发/下载证书。

首次申请证书时，建议先让 workflow 跑一次 HTTP 配置，然后在服务器执行：

```bash
sudo certbot certonly --webroot -w /var/www/html -d example.com -d www.example.com
```

证书申请成功后，再跑一次 GitHub Actions，脚本会自动切换为 HTTPS 配置。
