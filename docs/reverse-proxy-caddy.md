# Reverse proxy Caddy

Exemple minimal :

```caddy
taches.example.com {
  encode gzip zstd
  reverse_proxy app:3000
}
```

Points à vérifier :

- le DNS A/AAAA pointe vers le serveur
- les ports 80 et 443 sont ouverts
- `APP_BASE_URL` correspond exactement au domaine public
