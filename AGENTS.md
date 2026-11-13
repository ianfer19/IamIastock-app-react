# AGENTS.md — IAStock Mobile (React Native / Expo)

Contexto técnico para subagentes e IAs que trabajen en esta app. Léelo antes de modificar código.

## 1. Identidad del proyecto

**IAStock Mobile** es la app móvil del SaaS multi-tenant IAStock. Consume los mismos servicios que el frontend web Angular y el backend serverless de `sahagunonline/back`.

- **Framework:** Expo SDK 54 / React Native 0.81.5 / React 19.1.
- **Lenguaje:** TypeScript 5.9 en modo `strict`.
- **Navegación:** React Navigation native-stack (`App.tsx`). Aunque `expo-router` está instalado, **no se usa como entrypoint**.
- **Estado global:** Redux Toolkit + Zustand (solo para el tema).
- **Data fetching:** servicios con `axios` + `useEffect`. **No hay `QueryClientProvider` de React Query configurado**; no lo introduzcas sin justificarlo.
- **Estilos:** `StyleSheet` nativo + `rem()` de `src/core/utils/responsive.ts`.
- **Animaciones:** `moti` + `react-native-reanimated`.
- **Feedback táctil:** `expo-haptics`.
- **Fuentes:** Inter, Jost y Plus Jakarta Sans (cargadas en `App.tsx`).
- **Plataformas:** iOS, Android y tablets (`app.json` → `supportsTablet: true`).
- **Gestor de paquetes:** `pnpm`.

## 2. Entrypoint y navegación

```
index.ts
└── registerRootComponent(App)
    └── App.tsx
        ├── Provider (Redux)
        ├── SafeAreaProvider
        ├── StatusModalProvider
        ├── GestureHandlerRootView
        ├── NavigationContainer
        │   └── Stack.Navigator
        │       ├── LOGIN
        │       ├── SYNC
        │       ├── DASHBOARD
        │       ├── CHECKOUT
        │       └── OMNICHAT
        └── NotificationContainer
```

`DASHBOARD` es el contenedor principal de la app. Sus tabs se controlan con `DashboardTab` en:

```
src/features/pos/screens/DashboardScreen.tsx
```

Tabs actuales:

```
POS | MESAS | MOSTRADOR | RESERVAS | CAJA | CHECKOUT | PERSONALIZAR |
INVENTARIO | CONTROL | CANCHAS | HOME
```

El sidebar vive en:

```
src/features/pos/components/Sidebar.tsx
```

Los ítems de navegación están en `NAV_ITEMS`. Para agregar un módulo:

1. Agregar el tab al union `DashboardTab`.
2. Agregar el `case` en el `switch` de `DashboardScreen`.
3. Agregar el ítem en `NAV_ITEMS` del `Sidebar`.
4. Opcional: agregar tarjeta de acceso rápido en `UserDashboardScreen.tsx`.

## 3. Estructura de carpetas

```
src/
├── core/
│   ├── api/client.ts              # axios + auth + tenant + 401 logout
│   ├── config/env.ts              # EXPO_PUBLIC_* variables
│   ├── context/                   # StatusModalContext
│   ├── services/                  # currency, notifications, sound
│   ├── storage/secureStorage.ts   # tokens, user, caja
│   ├── store/                     # Redux Toolkit
│   ├── theme/theme.ts             # tema global (light/dark)
│   └── utils/                     # responsive, jwt
├── features/
│   ├── auth/                      # Login
│   ├── pos/                       # Dashboard, POS, mesas, checkout
│   ├── caja/                      # caja, arqueos, historial
│   ├── control/                   # control dashboard, settings, payments
│   ├── inventory/                 # productos, activos, ingredientes
│   ├── chat/                      # bandeja y chat omnicanal
│   ├── courts/                    # MÓDULO DE CANCHAS
│   └── home/                      # reservado
├── infrastructure/
│   ├── config/api.config.ts
│   └── services/                  # auth, inventory, orders, payments...
├── presentation/
│   ├── components/                # GlassCard, Notification*
│   ├── hooks/                     # useOmniChannelChat
│   ├── store/themeStore.ts        # Zustand solo para tema
│   └── theme/index.ts             # tokens alternativos
└── shared/
    ├── components/                # PremiumButton
    └── widgets/
```

Alias de importación:

```ts
@/* → src/*
```

## 4. Autenticación y API

### Cliente HTTP

Archivo: `src/core/api/client.ts`

- Inyecta `Authorization: Bearer <ID_TOKEN>`.
- Inyecta `x-tenant-id` desde el usuario guardado.
- En `401`: limpia storage, dispara logout global y detiene la cadena.
- En `__DEV__` loguea request/response/error.

### Variables de entorno

Archivos: `.env`, `.env.production`.

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_ADMIN_URL=
EXPO_PUBLIC_ENV=
EXPO_PUBLIC_WS_URL=
EXPO_PUBLIC_COURTS_URL=   # opcional
```

`EXPO_PUBLIC_COURTS_URL` es opcional. Si no existe, el módulo de Canchas usa `Env.API_URL`.

### Sesión

Archivo: `src/core/storage/secureStorage.ts`

- Access/ID/refresh token → `expo-secure-store`.
- Perfil de usuario → `AsyncStorage` (`user_data`).
- Caja seleccionada → `expo-secure-store`.

### Respuestas del backend

El backend puede responder de varias formas. Los servicios usan helpers de `unwrap`:

```ts
{ data: ... }
{ body: "{\"data\": ...}" }
{ Items: [...] }
{ items: [...] }
[...] // directo
```

No asumas una sola forma. Reutiliza los helpers existentes.

## 5. Estado global

Redux Toolkit en `src/core/store`.

Slices:

```
auth | pos | catalog | cart | chat | tenant
```

El reducer raíz escucha `RESET_STORE_DATA` para limpiar todo excepto `auth` al cambiar de sede.

Zustand solo se usa para el tema:

```
src/presentation/store/themeStore.ts
```

No uses Zustand para lógica de negocio nueva salvo que sea estrictamente local.

## 6. Tema y tipografía

### Tema global

Archivo: `src/core/theme/theme.ts`

- `useTheme()` devuelve `{ colors, mode }`.
- `lightColors` / `darkColors`.
- `TYPOGRAPHY`, `GLOBS`, `globalStyles`.

### Tokens alternativos

Archivo: `src/presentation/theme/index.ts`

- `theme.colors`, `spacing`, `roundness`, `typography`.
- Usado por `GlassCard`.

### Tema específico de Canchas

Archivo: `src/features/courts/theme/courtsTheme.ts`

Canchas replica el look web (beige/indigo/verde cancha). **No** usa `useTheme()` para sus colores principales. Es intencional para mantener fidelidad visual con la web.

Incluye:

- `courtsColors`
- `courtsFonts`
- `courtsSpacing`
- `courtsRadii`
- `courtsTypography`
- `courtsShadow`
- `courtStatusTone()`

### Fuentes

Cargadas en `App.tsx`:

```
Inter-Regular / Inter-Bold / Inter-Black
Jost-Medium
PlusJakartaSans-Regular / Medium / SemiBold / Bold / ExtraBold
```

Plus Jakarta Sans se agregó para Canchas. Si agregas una pantalla que use esa fuente, usa los nombres exactos.

### Escalado

`src/core/utils/responsive.ts`

```ts
rem(size) // escala horizontal basada en 375dp
vh(size)  // escala vertical
```

Las pantallas nuevas deben usar `rem()` para tamaños, spacing y radios, como el resto de la app.

## 7. Componentes y patrones UI

### Globales

- `DashboardHeader` → `src/features/pos/components/DashboardLayout.tsx`.
- `Sidebar` → `src/features/pos/components/Sidebar.tsx`.
- `PremiumSubScreenHeader` → `src/features/inventory/components/PremiumSubScreenHeader.tsx`.
- `StatusModal` + `useStatusModal` → `src/core/context/StatusModalContext.tsx`.
- `GlassCard` → `src/presentation/components/GlassCard.tsx`.
- `PremiumButton` → `src/shared/components/PremiumButton.tsx`.

### Canchas

- `CourtsModuleScreen` → shell con tabs.
- `CourtsHero` → hero del módulo.
- `CourtsTabs` → tabs horizontales.
- `CourtsUI` → `SectionCard`, `SectionHeader`, `FilterTabs`, `StatusPill`, `TagPill`, `EmptyState`, `PrimaryButton`, `IconButton`, `TextField`, `SwitchRow`, `DayChips`, `OptionChips`.
- `CourtsModalShell` → modal base.
- `CourtsConfirmModal` → confirmaciones destructivas.
- Formularios: `CourtFormModal`, `AttributeFormModal`, `BlockFormModal`, `RateFormModal`, `PromotionFormModal`, `PromotionExceptionsModal`, `BookingFormModal`.
- Detalle: `BookingDetailModal`.
- Cards: `CourtCard`.

### Reglas de UI

- Usa `Pressable` con estado `pressed` en lugar de `TouchableOpacity` para componentes nuevos.
- Touch targets mínimo: 44pt iOS / 48dp Android. Usa `hitSlop` si el diseño es más pequeño.
- Usa `Modal` + `KeyboardAvoidingView` + safe area en formularios.
- Usa `CourtsConfirmModal` en Canchas; no uses `Alert.alert` para eliminar/confirmar.
- Respeta `useSafeAreaInsets()` en pantallas con footer o modales.
- Usa `expo-haptics` en acciones principales.
- Usa `ActivityIndicator` para loading y `EmptyState` para listas vacías.
- No hardcodees colores/spacing en Canchas; usa `courtsTheme`.
- En el resto de la app, usa `useTheme()`.

## 8. Módulo de Canchas

### Ubicación

```
src/features/courts/
```

### Pantallas

| Pantalla | Archivo | Función |
|---|---|---|
| Shell | `screens/CourtsModuleScreen.tsx` | Header, tabs y composición |
| Agenda | `screens/CourtsAgendaScreen.tsx` | Vista diaria, timeline, reservas |
| Canchas | `screens/CourtsConfigScreen.tsx` | CRUD canchas, atributos, bloqueos, dominio |
| Tarifas/Promos | `screens/CourtsPricingScreen.tsx` | Tarifas y promociones |
| Implementos | `screens/CourtsAssetsScreen.tsx` | Stock de activos |

### Servicios

`services/courtsService.ts`

Base:

```ts
process.env.EXPO_PUBLIC_COURTS_URL || Env.API_URL
```

Métodos principales:

```
listCourts / getCourt / createCourt / updateCourt / deleteCourt
listAttributes / upsertAttribute / deleteAttribute
listBlocks / createBlock / deleteBlock
listRates / createRate / updateRate / deleteRate
listPromotions / createPromotion / updatePromotion / deletePromotion
addPromotionException / removePromotionException
quote / getGrid / getAvailability
listBookings / createBooking / getBooking / updateBooking
cancelBooking / checkIn / noShow / closeBooking
listPaymentMethods / createPayment
getSettings / updateSettings
createSeries / listSeries / cancelSeries
listCourtAssets
```

`services/courtUploadService.ts`

Flujo de imágenes:

1. `ImagePicker` selecciona imagen.
2. `POST /assets/upload-url` con `{ asset_type: 'other', file_name, content_type }`.
3. `PUT` directo a S3 con `fetch`.
4. Se guarda `public_url` en `Court.images` o `Promotion.images`.

### Tipos

`types/courts.types.ts`

Incluye:

```
Court, CourtAttributeDef, CourtBlock, Rate, Promotion,
CourtAvailability, CourtGridRow, Slot, CourtBooking,
CourtPayment, CourtPaymentMethod, CourtSettings,
BookingCreatePayload, CourtAsset, DayStats...
```

### Utilidades

`utils/formatters.ts`

- `formatMoney`, `formatMoneyNoDecimals`
- `isoDate`, `addDays`, `formatDateLong`, `formatDateShort`
- `timeToMinutes`, `minutesToTime`, `formatHour`
- `rateKey`, `promotionValueLabel`, `promotionTimeLabel`
- `statusLabel`, `surfaceLabel`, `attributeTypeLabel`
- `slugifyAttributeKey`, `sanitizeAttributeKey`, `isValidAttributeKey`
- `courtErrorMessage`

### Funcionalidad implementada

- Agenda diaria con selector de 7 días.
- Selector horizontal de canchas.
- Timeline por slots de 60 minutos.
- Colores por estado de pago/reserva.
- Crear reserva desde horario libre.
- Cotización automática.
- Detalle de reserva:
  - Check-in
  - No-show
  - Cerrar cuenta
  - Cancelar
- Canchas:
  - Listado con imágenes.
  - Filtros activas/todas/inactivas.
  - Crear/editar.
  - Imágenes (máx. 5, portada).
  - Horarios por día.
  - Atributos dinámicos.
  - Reactivar/desactivar.
- Atributos:
  - Crear/editar.
  - Clave automática desde el nombre.
  - Tipos BOOLEAN/TEXT/NUMBER/SELECT.
  - Reactivar/desactivar.
- Bloqueos:
  - Crear.
  - Filtros activos/todos.
  - Desactivar.
- Tarifas:
  - Filtros.
  - Crear/editar.
  - Reactivar/desactivar.
  - Enteros sin decimales.
- Promociones:
  - Imagen.
  - Código.
  - Tipos PERCENT/FIXED/TWO_FOR_ONE.
  - Días y horarios.
  - Excepciones.
  - Reactivar/desactivar.
- Implementos:
  - Stock operativo/alquilado/dañado/perdido.
  - Barra de disponibilidad.

### Pendiente en Canchas

- Vista semanal y mensual de Agenda.
- Registro de pagos desde móvil.
- Refunds.
- Checkout/return de implementos por reserva.
- Sorteo de equipos.
- Generación/rotación de links públicos.
- Actualización en tiempo real de la agenda (socket).
- Dark mode específico de Canchas (hoy se mantiene look claro web).
- Series/recurrencia en móvil.

### Backend relacionado

```
C:\Users\ianfe\OneDrive\Documentos\GitHub\sahagunonline\back\src\court_service
```

La web de referencia está en:

```
C:\Users\ianfe\OneDrive\Documentos\GitHub\IamIAStock\IamIAStockCloudFront\src\app\features\courts
```

## 9. Convenciones de código

- Nombres de componentes, variables y archivos en inglés.
- Textos de UI en español.
- TypeScript estricto. Evita `any`; usa `unknown` + tipos concretos.
- Componentes pequeños; lógica de datos en hooks o servicios.
- No pongas lógica de negocio dentro del JSX.
- `useMemo`/`useCallback` solo donde aporten (listas, handlers, cálculos).
- No agregues dependencias sin justificar y sin revisar si ya existe una solución en el proyecto.
- Usa `pnpm`, no `npm`, para instalar.
- No dejes logs de depuración nuevos en producción.
- No cambies el tema global para una pantalla aislada.

## 10. Comandos de verificación

```bash
pnpm install
pnpm start
npx expo start --clear

# Typecheck
npx tsc --noEmit

# Bundle de validación (sin dispositivo)
npx expo export --platform android --output-dir dist-android-test
```

Antes de entregar:

1. `npx tsc --noEmit` sin errores.
2. `npx expo export --platform android` exitoso.
3. Probar navegación, loading, empty, error y modales.
4. Revisar teclado y safe areas en formularios.
5. Revisar que no se haya roto `POS`, `Caja`, `Control`, `Inventario`, `Chat`.

## 11. Gotchas conocidos

- No hay `QueryClientProvider`; no uses hooks de React Query.
- `expo-router` está instalado pero no se usa.
- `README.md` puede estar desactualizado en algunos puntos; este `AGENTS.md` es la fuente de verdad técnica.
- El backend puede devolver `body` como string JSON.
- El `x-tenant-id` correcto viene del usuario autenticado.
- El cambio de sede dispara `RESET_STORE_DATA`; los módulos deben tolerar remount.
- `CurrencyService` inicia con `USD` por defecto; se configura desde el perfil del comercio. Para montos de Canchas se usa `formatMoneyNoDecimals`.
- Las imágenes de promociones requieren que el backend tenga desplegado el campo `images`.
- En iOS, las sombras no se recortan igual con `overflow: hidden`; usa contenedor externo para sombra si hace falta.
- En Android, `elevation` no respeta exactamente el blur de iOS.
- Los modales anidados (confirmación dentro de detalle) funcionan, pero evita más de 2 niveles.
- Los formularios de Canchas no usan `react-hook-form`; usan estado controlado, igual que el resto de la app.

## 12. Cómo agregar una nueva pantalla/módulo

1. Crear carpeta en `src/features/<feature>/`.
2. Definir tipos en `types/`.
3. Crear servicio en `services/` usando `apiClient` y `Env`.
4. Crear hook de datos si la pantalla lo amerita.
5. Crear componentes presentacionales.
6. Crear la pantalla.
7. Agregar el tab en `DashboardTab`.
8. Agregar el `case` en `DashboardScreen`.
9. Agregar el ítem en `Sidebar` (`NAV_ITEMS`).
10. Opcional: tarjeta en `UserDashboardScreen`.
11. Verificar TypeScript y bundle.
12. Documentar el módulo en este archivo.
