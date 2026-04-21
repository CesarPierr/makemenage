# Reverse proxy Caddy

Exemple minimal pour un serveur local derrière VPN :

```caddy
http://192.168.1.132 {
  encode gzip zstd
  reverse_proxy app:3000
}
```

Points à vérifier :

- `APP_BASE_URL` correspond exactement à l'URL publique réellement utilisée, par exemple `http://192.168.1.132`
- `APP_HOST` vaut l'hôte seul, par exemple `192.168.1.132`
- seul le port `80` est nécessaire dans ce mode

Si vous passez plus tard sur un vrai domaine public avec HTTPS automatique, vous pouvez revenir à une entrée Caddy de ce type :

```caddy
taches.example.com {
  encode gzip zstd
  reverse_proxy app:3000
}
```
