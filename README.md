# SAgenda Inteligente

## Descripción
Proyecto **Agenda Inteligente**, una plataforma de gestión de tiempo y reuniones con sincronización hacia servicios externos como Outlook o Google Calendar.

### Estructura del proyecto
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Flask (Python) o Node (por definir)
- **Docs:** documentación técnica y funcional

### Cómo iniciar el proyecto localmente
```bash
git clone https://github.com/TU_USUARIO/agenda-inteligente.git
cd agenda-inteligente
docker compose up --build
```

## 📦 Estructura de la Base de Datos

La aplicación utiliza **Flask + SQLAlchemy** para definir un esquema relacional
en MySQL que permite sincronizar cuentas externas, coordinar equipos y proponer
reuniones inteligentes. A continuación se resumen las tablas principales:

- **usuarios**
  - Campos: `id`, `nombre`, `correo`, `password`, `zona_horaria`, `creado_en`.
  - Relaciones: crea equipos (`equipos`), reuniones (`reuniones_propuestas`) y
    participa a través de `miembros_equipo` y `participantes_reunion`.
- **cuentas_conectadas**
  - Campos: `id`, `id_usuario`, `proveedor`, `correo_vinculado`, `access_token`,
    `refresh_token`, `token_expira_en`, `sincronizado_en`.
  - Relaciones: pertenece a un usuario y expone sus `eventos_externos`.
- **eventos_externos**
  - Campos: `id`, `id_cuenta`, `id_evento_externo`, `titulo`, `descripcion`,
    `inicio`, `fin`, `estado`, `origen`, `sincronizado_en`.
  - Relaciones: se sincronizan desde una `cuenta_conectada`.
- **equipos**
  - Campos: `id`, `nombre`, `creado_por`, `creado_en`.
  - Relaciones: agrupación creada por un usuario, con `miembros_equipo` y
    `reuniones_propuestas` asociados.
- **miembros_equipo**
  - Campos: `id`, `id_equipo`, `id_usuario`, `rol`, `unido_en`.
  - Relaciones: tabla puente que vincula usuarios con equipos y define su rol.
- **reuniones_propuestas**
  - Campos: `id`, `id_equipo`, `creada_por`, `titulo`, `descripcion`,
    `inicio_propuesto`, `fin_propuesto`, `estado`, `creada_en`.
  - Relaciones: cada reunión pertenece a un equipo y es creada por un usuario.
- **participantes_reunion**
  - Campos: `id`, `id_reunion`, `id_usuario`, `respuesta`, `invitado_en`.
  - Relaciones: tabla puente entre usuarios y reuniones para registrar
    confirmaciones.

Diagrama simplificado de relaciones:

```
usuarios ───< cuentas_conectadas ───< eventos_externos
│
├──< equipos ───< miembros_equipo
│ │
│ └──> usuarios
└──< reuniones_propuestas ───< participantes_reunion
```

### Disponibilidad y programación inteligente

1. **Sincronización externa:** cada `cuenta_conectada` descarga sus
   `eventos_externos`, lo que permite conocer la disponibilidad real del
   usuario dentro de sus calendarios externos.
2. **Contexto de equipo:** las pertenencias definidas en `miembros_equipo`
   determinan qué usuarios deben considerarse para coordinar nuevas
   reuniones dentro de cada `equipo`.
3. **Propuestas y confirmaciones:** `reuniones_propuestas` almacenan los rangos
   de tiempo sugeridos. Los registros en `participantes_reunion` permiten que
   cada usuario confirme o rechace una propuesta, facilitando el cálculo de un
   horario óptimo.
4. **Automatización:** con toda la información disponible, el backend puede
   cruzar disponibilidad interna (reuniones pendientes) con disponibilidad
   externa (eventos sincronizados) para sugerir automáticamente nuevos slots.

Al iniciar la aplicación con `docker compose up --build`, Flask carga todos los
modelos definidos en `backend/models.py` antes de llamar a `db.create_all()`,
garantizando la creación de las siete tablas descritas anteriormente en MySQL.
