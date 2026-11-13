# IAStock Mobile App (React Native / Expo)

App móvil del SaaS multi-tenant **IAStock**. Consume los mismos servicios que el frontend web Angular y el backend serverless de `sahagunonline/back`.

## Documentación para agentes e IAs

Antes de modificar el proyecto, lee:

- [`AGENTS.md`](./AGENTS.md) — contexto completo de arquitectura, navegación, API, convenciones y módulos.
- [`AGENTS.md#8-módulo-de-canchas`](./AGENTS.md#8-módulo-de-canchas) — contexto específico del módulo de Canchas.

## Stack

- **Expo SDK 54** · **React Native 0.81.5** · **React 19.1**.
- **TypeScript 5.9** en modo `strict`.
- **Navegación:** React Navigation native-stack (`App.tsx`).
- **Estado global:** Redux Toolkit + Zustand (solo tema).
- **Data fetching:** servicios con `axios` + hooks.
- **Estilos:** `StyleSheet` nativo + `rem()`.
- **Animaciones:** `moti` + `react-native-reanimated`.
- **Tipografía:** Inter, Jost y Plus Jakarta Sans.
- **Plataformas:** iOS, Android y tablets.
- **Paquetes:** `pnpm`.

## Arquitectura

```
src/
├── core/           # API, auth, storage, store, theme, utils
├── features/       # Bounded contexts
│   ├── auth/
│   ├── pos/
│   ├── caja/
│   ├── control/
│   ├── inventory/
│   ├── chat/
│   └── courts/     # Módulo de Canchas
├── infrastructure/ # Servicios de integración
├── presentation/   # Componentes, hooks y theme auxiliar
└── shared/         # Componentes compartidos
```

## Módulo de Canchas

Implementado en `src/features/courts/` con cuatro secciones:

- **Agenda:** vista diaria, selector de canchas, timeline, creación de reservas y detalle con check-in/no-show/cierre/cancelación.
- **Canchas:** CRUD, imágenes, horarios, atributos configurables, bloqueos y dominio público.
- **Tarifas y promociones:** tarifas por franja, promociones con imagen, códigos y excepciones.
- **Implementos:** stock de activos operativos, alquilados, dañados y perdidos.

Servicios principales:

- `courtsService.ts`
- `courtUploadService.ts` (S3 presigned upload)
- `types/courts.types.ts`
- `theme/courtsTheme.ts`

Para más detalle, ver [`AGENTS.md`](./AGENTS.md).

## Cómo arrancar

```bash
pnpm install
npx expo start --clear
```

Ejecutar:

- `a` → Android.
- `i` → iOS (requiere macOS).
- `w` → Web (requiere `react-native-web`, no instalado actualmente).

## Verificación

```bash
npx tsc --noEmit
npx expo export --platform android --output-dir dist-android-test
```

## Variables de entorno

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_ADMIN_URL=
EXPO_PUBLIC_ENV=
EXPO_PUBLIC_WS_URL=

EXPO_PUBLIC_API_URL_DEV=
EXPO_PUBLIC_ADMIN_URL_DEV=
EXPO_PUBLIC_WS_URL_DEV=
EXPO_PUBLIC_SAAS_API_URL_DEV=
EXPO_PUBLIC_API_URL_PROD=
EXPO_PUBLIC_ADMIN_URL_PROD=
EXPO_PUBLIC_WS_URL_PROD=
EXPO_PUBLIC_SAAS_API_URL_PROD=
```

La app usa dos gateways, igual que la web:

- `EXPO_PUBLIC_API_URL_*`: gateway principal (auth, admin, inventario, caja, assets).
- `EXPO_PUBLIC_SAAS_API_URL_*`: SaaSApiV2 (canchas, tarifas, promociones, reservas).

El login incluye un badge **API DEV / API PROD** para alternar el entorno en runtime. La selección se guarda en `AsyncStorage` y se aplica antes de revisar la sesión.

## Estándares

- TypeScript estricto.
- Componentes pequeños y reutilizables.
- Lógica de datos en servicios/hooks, no en JSX.
- Textos de UI en español; nombres de código en inglés.
- Touch targets mínimos de 44pt/48dp.
- Safe areas y teclado considerados en formularios.
- Confirmaciones destructivas con modal, no `Alert` en Canchas.
- No introducir dependencias sin justificación.
