# Code Review: HeroSlider + BurgerMenu (итоговые правки)

## Findings

### [low] Shimmer-анимация не сбрасывается при hover
File: `apps/web/src/features/hero/HeroSlider.vue:200`
Problem: При hover `::before` скрывается через `opacity: 0`, но анимация продолжает работать в фоне. После снятия hover shimmer возобновляется с произвольной позиции, а не с начала цикла. Визуально незначительно, но технически нечисто.
Fix: Добавить `animation-play-state: paused` при hover вместо (или вместе с) `opacity: 0`:
```scss
&:hover {
  &::before {
    opacity: 0;
    animation-play-state: paused;
  }
}
```

### [low] В тесте не проверяется очистка таймера при unmount
File: `apps/web/tests/unit/HeroSlider.test.ts`
Problem: Таймер корректно очищается через `onUnmounted`, но тест это не верифицирует. Если `clearInterval` убрать из компонента, тест не упадёт.
Fix: Добавить тест:
```ts
it('таймер очищается при unmount', () => {
  const spy = vi.spyOn(window, 'clearInterval')
  const wrapper = mountSlider()
  wrapper.unmount()
  expect(spy).toHaveBeenCalled()
})
```

### [low] `__submenu` имеет `overflow: visible` без необходимости
File: `apps/web/src/features/navigation/BurgerMenu.vue:211`
Problem: `overflow: visible` — значение по умолчанию для блочных элементов. Явное указание добавляет шум без смысла.
Fix: Удалить строку `overflow: visible`.

## Что проверено и подтверждено корректным

- **Таймер в `onMounted`** — правильно. `startTimer()` вызывается через `onMounted(startTimer)`, очистка в `onUnmounted`. Соответствует Vue 3 docs.
- **`v-for` с `slide.id`** — правильно. Оба цикла (`__slide` и `__dot`) используют `:key="slide.id"`, значения `id: 1/2/3` стабильные и уникальные.
- **Hover + shimmer** — технически работает: `opacity: 0` скрывает shimmer-бордер, `background-color: #fff` покрывает кнопку. Замечание только по `animation-play-state` (low).
- **Импорт в тесте** — `import { HeroSlider } from '@/features/hero'` — правильный публичный импорт через `index.ts`.
- **`vite-env.d.ts`** — `any` убран, типы корректны (`Record<string, unknown>` в `.vue` declare, `string` для изображений).
- **`BurgerMenu.vue`** — архитектура чистая: `position: relative` присутствует, focus-trap через `tabindex="-1"` и `navRef.value?.focus()` реализован, возврат фокуса на `triggerRef` при закрытии — всё верно.
- **Нарушений архитектуры (FSD, глубокие импорты, store без нужды)** — не обнаружено.
- **Секреты, SQL-инъекции, XSS** — не применимо к данным файлам (чистый frontend, нет HTTP-запросов).

## Verdict
APPROVED

Reason: Critical и high нарушений нет. Три low-замечания: одно по CSS (animation-play-state), одно по покрытию тестом unmount, одно по лишней CSS-декларации. Все некритичны и не блокируют коммит.
