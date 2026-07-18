# IAStock Mobile App (React Native Premium)

Este proyecto implementa la visión de IAStock para dispositivos móviles utilizando **React Native (Expo)**, siguiendo una arquitectura **Clean Architecture** orientada a características (Features).

## Arquitectura

La estructura de carpetas sigue el patrón de Clean Architecture adaptado para React Native:

- **src/core**: Núcleo de la aplicación (Temas, Red, Casos de Uso globales, Constantes).
- **src/features**: Bounded Contexts de la aplicación.
  - `auth/`: Autenticación y sesiones.
  - `pos/`: Punto de Venta (Core).
  - `inventory/`: Gestión de inventarios.
  - `home/`: Dashboard principal.
- **src/shared**: Componentes y widgets compartidos (Botones premium, Glassmorphism).
- **src/infrastructure**: (Opcional) Configuraciones de bajo nivel.

## Tecnologías y Buenas Prácticas

- **Estado**: `Zustand` (Ligero, eficiente y escalable).
- **Persistencia**: `react-native-mmkv` (Almacenamiento ultra-rápido para Offline-first).
- **Animaciones**: `moti` + `react-native-reanimated` (Micro-interacciones premium).
- **Navegación**: `expo-router` (File-based routing).
- **Tipografía**: Inter (Cuerpo) y Jost (Acentos/Títulos).
- **Diseño**: Indigo & Gold Premium con Glassmorphism.

## Cómo arrancar la aplicación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar el proyecto con limpieza de caché**:
   ```bash
   npx expo start --clear
   ```

3. **Ejecutar en emulador**:
   - Presiona `a` para Android.
   - Presiona `i` para iOS (requiere Mac).

## Estándares

- **Clean Code**: Código modular, tipado estrictamente con TypeScript.
- **Eficiencia**: Uso de MMKV para acceso instantáneo a datos locales.
- **Escalabilidad**: Organización por features para permitir el crecimiento masivo del POS.
