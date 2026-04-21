//Файл **`vite-env.d.ts`** — это файл глобальных деклараций типов TypeScript, 
// специфичный для среды сборки Vite [1]. Он необходим для того, чтобы TypeScript «понимал» типы файлов и объектов, 
// которые не входят в стандарт языка, но активно используются в проекте
// Этот файл является «инструкцией» для TypeScript, которая позволяет ему бесшовно работать с современными  
// инструментами сборки и специфическими форматами файлов

 <reference types="vite/client"/>

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.jpg" {
  const src: string
  export default src
}

declare module "*.jpeg" {
  const src: string
  export default src
}

declare module "*.png" {
  const src: string
  export default src
}

declare module "*.webp" {
  const src: string
  export default src
}
