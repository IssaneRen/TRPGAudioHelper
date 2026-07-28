# Public File Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `/home/ubuntu/public_files/` as a read-only Nginx directory index on public TCP port `14848`, with browser-inline image responses.

**Architecture:** Reuse the server's existing Nginx process and install one isolated virtual-server file named `public-files`. Keep the configuration outside the main site's generated configuration so normal deployments cannot overwrite it; validate locally on the server before reload and verify both loopback and public access.

**Tech Stack:** Ubuntu, Nginx, systemd, curl, Tencent Cloud Lighthouse firewall

## Global Constraints

- The endpoint is public, unauthenticated, and plain HTTP.
- Do not configure a domain, TLS certificate, reverse proxy, upload API, or extra daemon.
- Serve only `/home/ubuntu/public_files/`; do not expose its parent directory.
- Listen on TCP `14848` without changing existing port rules.
- Preserve existing Nginx and application services.

---

### Task 1: Install and verify the isolated Nginx directory service

**Files:**
- Create locally: `ops/nginx/public-files.conf`
- Create remotely: `/etc/nginx/sites-available/public-files`
- Create remotely: `/etc/nginx/sites-enabled/public-files` (symlink)
- Back up remotely if present: `/etc/nginx/sites-available/public-files.bak-YYYYmmddHHMMSS`

**Interfaces:**
- Consumes: existing Nginx service, `/home/ubuntu/public_files/`, TCP `14848`
- Produces: read-only directory endpoint `http://1.117.61.20:14848/`

- [ ] **Step 1: Inspect the remote prerequisites without mutation**

Run over SSH as `ubuntu@issane.cn`: verify the login identity, Ubuntu release, Nginx state/version, port `14848` availability, target-directory metadata, Nginx worker user, MIME include, current enabled sites, and available firewall tooling. Stop if the port is occupied by an unrelated process.

- [ ] **Step 2: Create the minimal Nginx configuration**

Create `ops/nginx/public-files.conf` with exactly:

```nginx
server {
    listen 14848;
    listen [::]:14848;
    server_name _;

    root /home/ubuntu/public_files;
    charset utf-8;

    autoindex on;
    autoindex_exact_size off;
    autoindex_localtime on;

    location / {
        try_files $uri $uri/ =404;
        limit_except GET {
            deny all;
        }
    }

    access_log /var/log/nginx/public-files.access.log;
    error_log /var/log/nginx/public-files.error.log;
}
```

- [ ] **Step 3: Install the configuration safely**

Copy the local file to `/tmp/public-files.conf`, create `/home/ubuntu/public_files/` if missing, back up an existing same-name available-site file, install the new file as root-owned mode `0644`, and create/update the enabled-site symlink.

Grant the Nginx worker traversal/read permission only where required. Prefer POSIX ACL (`setfacl`) for `/home/ubuntu` traversal and recursive/default read access to `public_files`; if ACL tooling is absent, use the directory's `www-data` group with setgid and group-read permissions without granting write access to Nginx.

- [ ] **Step 4: Validate before reload**

Run:

```bash
sudo nginx -t
```

Expected: exit code `0` and `syntax is ok` / `test is successful`. If validation fails, restore the backup or remove only the new enabled-site link and do not reload.

- [ ] **Step 5: Reload and test the directory index locally**

Reload with `sudo systemctl reload nginx`, then run:

```bash
curl -fsS -D /tmp/public-files.headers http://127.0.0.1:14848/ -o /tmp/public-files.index.html
```

Expected: HTTP `200`, an HTML directory index, and no regression in `systemctl is-active nginx`.

- [ ] **Step 6: Verify inline image MIME behavior**

If the target directory has no common image, create a harmless one-pixel PNG named `.codex-inline-check.png`, request it locally, verify `Content-Type: image/png` and absence of `Content-Disposition: attachment`, then remove only that test file.

- [ ] **Step 7: Open the server firewall and verify public access**

Allow TCP `14848` in the active host firewall if needed. Add the same inbound rule in Tencent Cloud Lighthouse firewall if the connector/API is available; otherwise identify this as the only remaining console-side action. Request `http://1.117.61.20:14848/` from outside the server and expect HTTP `200`.

- [ ] **Step 8: Record verification evidence**

Capture sanitized results for Nginx config validation, listener binding, local directory HTTP status, image MIME/disposition, public HTTP status, and existing Nginx active state. Do not include SSH keys, tokens, cookies, or unrelated directory filenames.
