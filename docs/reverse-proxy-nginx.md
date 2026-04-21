# Reverse proxy Nginx

Exemple minimal :

```nginx
server {
  listen 80;
  server_name taches.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
  }
}
```

Pensez à gérer TLS avec certbot ou un proxy dédié si vous n'utilisez pas Caddy.
