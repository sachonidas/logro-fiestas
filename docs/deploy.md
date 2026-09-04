# Despliegue del backend en el VPS (Docker Compose)

El **frontend sigue en Vercel** (build web de Expo, estático). Lo que se mueve
al VPS es la API y la base de datos, que antes estaban en Railway.

En el VPS ya corre **cooking-athletes**, cuyo contenedor `app` (FrankenPHP =
Caddy + PHP) es quien ocupa los puertos 80/443 y saca los certificados de
Let's Encrypt. En vez de levantar un segundo proxy, la API de fiestas se cuelga
de esa Caddy como un vhost más: solo termina TLS y hace `reverse_proxy` al
contenedor de este proyecto a través de una red Docker compartida.

```
Internet ──443──> cooking-athletes/app (Caddy) ─┬─ api.cookinathletes.es   → Symfony
                                                ├─ admin. / app.          → estáticos
                                                └─ api.fiestaslogrono.es  ─┐
                                                                           │ red `web`
                  /opt/logro-fiestas:  backend (Hono, :3000) <─────────────┘
                                       database (postgres:17, volumen propio)

Vercel: frontend Expo web ──HTTPS──> https://api.fiestaslogrono.es
```

Cada proyecto conserva su propio Postgres y su propio backup. Lo único
compartido es el proxy.

Ficheros implicados:

- `backend/Dockerfile` — imagen multi-stage (compila TS, runtime solo con deps de producción).
- `docker-compose.prod.yml` — backend + database.
- `deploy/.env.prod.example` — plantilla de secretos (copiar a `.env.prod` en el servidor).
- `deploy/backup.sh` — volcado diario con rotación.
- `.github/workflows/deploy.yml` — deploy automático al hacer push a `main`.
- En el repo de cooking-athletes: el vhost en `deploy/Caddyfile` y la red `web` en su `docker-compose.prod.yml`.

## 1. DNS

Un registro **A** para `api.fiestaslogrono.es` apuntando a la IP del VPS. El
frontend no necesita nada: se queda en el dominio que le da Vercel (o el que ya
tenga configurado allí).

Hasta que el DNS resuelva, Caddy no podrá emitir el certificado de ese vhost.
Los demás vhosts siguen funcionando mientras tanto.

## 2. Red compartida y proxy (una sola vez)

En el VPS:

```bash
docker network create web
```

Los cambios en el repo de cooking-athletes (vhost `api.fiestaslogrono.es` en
`deploy/Caddyfile` y `networks: [default, web]` en el servicio `app`) hay que
desplegarlos allí para que surtan efecto:

```bash
cd /opt/cooking-athletes
git pull
export APP_VERSION=$(git rev-parse --short HEAD)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Esto **recrea el contenedor `app` de cooking-athletes**: unos segundos de corte
en sus tres dominios. Los certificados viven en el volumen `caddy_data` y no se
pierden.

> El nombre `logro-fiestas-backend` del `reverse_proxy` es el `container_name`
> fijado en el compose de este proyecto. Si se cambia ahí, hay que cambiarlo
> también en el Caddyfile vecino.

## 3. Clonar y configurar

Crea antes una *deploy key* de solo lectura en GitHub → Settings → Deploy keys,
con la pública de un `ssh-keygen -t ed25519` hecho en el VPS:

```bash
sudo git clone git@github.com:sachonidas/logro-fiestas.git /opt/logro-fiestas
cd /opt/logro-fiestas
cp deploy/.env.prod.example .env.prod
nano .env.prod   # los dos CHANGE_ME: openssl rand -hex 32
```

## 4. Primer arranque

```bash
cd /opt/logro-fiestas
C="docker compose --env-file .env.prod -f docker-compose.prod.yml"
$C up -d --build

# Esquema (todo IF NOT EXISTS: se puede reaplicar sin miedo)
$C exec -T database psql -v ON_ERROR_STOP=1 -U fiestas -d fiestas \
  < backend/migrations/001_create_events.sql
```

Comprueba que responde:

```bash
curl https://api.fiestaslogrono.es/health          # {"ok":true}
```

Carga los eventos desde el JSON del repo (borra los del festival y los vuelve a
insertar; es idempotente):

```bash
API_URL=https://api.fiestaslogrono.es API_KEY=<el de .env.prod> \
  ./data/load.sh san-mateo-2026

curl 'https://api.fiestaslogrono.es/api/events?festival=san-mateo-2026' | head -c 300
```

## 5. Apuntar el frontend

En Vercel → Settings → Environment Variables del proyecto del frontend:

| Variable | Valor |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.fiestaslogrono.es` |
| `EXPO_PUBLIC_FESTIVAL` | `san-mateo-2026` |

`EXPO_PUBLIC_*` se **congela en el build**: cambiar la variable no basta, hay
que redeployar en Vercel para que la nueva URL entre en el bundle.

Cuando el front nuevo esté sirviendo bien, ya se pueden borrar el servicio y la
base de Railway.

## 6. Deploy automático (GitHub Actions)

Si ya configuraste el deploy de cooking-athletes puedes **reutilizar la misma
clave y los mismos valores**; los secrets son por repositorio, así que hay que
darlos de alta también aquí. Si no:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_fiestas -N ''
cat ~/.ssh/deploy_fiestas.pub >> ~/.ssh/authorized_keys
```

En GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `DEPLOY_HOST` | IP o hostname del VPS |
| `DEPLOY_USER` | usuario SSH (con acceso a docker) |
| `DEPLOY_SSH_KEY` | contenido de `~/.ssh/deploy_fiestas` (la privada) |

Cada push a `main` que toque `backend/` o el compose ejecuta tests + `tsc
--noEmit` y, si pasan, `git reset --hard` + `up -d --build` + esquema en el VPS.
Los cambios que solo tocan `frontend/` no despliegan nada aquí: de eso se
encarga Vercel.

## 7. Backups

`deploy/backup.sh` vuelca la base, comprime y rota a 14 días. No publica el
fichero hasta comprobar que el gzip es válido, que tiene un tamaño razonable y
que `pg_dump` llegó al final.

```bash
/opt/logro-fiestas/deploy/backup.sh     # debe imprimir "OK ..."
sudo crontab -e
```

```cron
45 4 * * * /opt/logro-fiestas/deploy/backup.sh >> /var/log/logro-fiestas-backup.log 2>&1
```

(A las 4:45, para no solaparse con el de cooking-athletes de las 4:30.)

**Restaurar**:

```bash
cd /opt/logro-fiestas
C="docker compose --env-file .env.prod -f docker-compose.prod.yml"
gunzip -c /var/backups/logro-fiestas/fiestas_2026-08-24_0445.sql.gz \
  | $C exec -T database psql -U fiestas -d fiestas
$C restart backend
```

El contenido real de esta base son los eventos versionados en
`data/san-mateo-2026.json` y `data/san-bernabe-2026.json`: si un backup fallase,
`data/load.sh <festival>` reconstruye el estado. El backup cubre lo que se cargue en el futuro por API.

## Notas

- El backend no publica puertos: solo se llega a él desde la red `web`. Postgres
  tampoco: solo desde la red interna de este compose.
- Si `docker network create web` no se ha ejecutado, `up` falla con
  *network web declared as external, but could not be found*.
- Recursos: Node + Postgres ~150 MB de RAM. Con 8 GB y cooking-athletes al lado
  sobra margen de sobra.
