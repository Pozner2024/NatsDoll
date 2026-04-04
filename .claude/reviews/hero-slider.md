# Code Review: hero-slider (HeroSlider + AppHeader + BurgerMenu)

## Findings

### [high] Визуальный баг: белый фон `.hero-slider__btn:hover` перекрывается shimmer-анимацией
File: `apps/web/src/features/hero/HeroSlider.vue:200`
Problem: При hover кнопка получает `background-color: #fff`, но `::before`-псевдоэлемент (shimmer) продолжает
рендериться поверх белого фона. Из-за того что `::before` использует `-webkit-mask` / `mask-composite: exclude`,
белая подложка "просвечивает" сквозь маску неправильно — видна белая заливка, а граница-shimmer продолжает
анимироваться и частично перекрывает фон. Визуально кнопка выглядит сломанной: текст теряет контраст,
а рамка "мигает" поверх белого.
Fix: На hover отключить `::before`, добавив `opacity: 0` или `animation: none`:
```scss
&:hover {
  background-color: #fff;
  color: var(--color-text);

  &::before {
    opacity: 0;
  }
}
```

### [high] Нарушение архитектуры: прямой импорт компонента в тесте, минуя `index.ts`
File: `apps/web/tests/unit/HeroSlider.test.ts:4`
Problem: `import HeroSlider from '@/features/hero/HeroSlider.vue'` — прямой импорт в обход публичного API
фичи. По правилам проекта (упрощённое ФСД) внешние потребители обязаны импортировать только через `index.ts`.
Fix:
```ts
import { HeroSlider } from '@/features/hero'
```

---

### [medium] `v-for` с `:key="i"` (индекс) вместо стабильного ключа
File: `apps/web/src/features/hero/HeroSlider.vue:6` и `:35`
Problem: Использование индекса массива в качестве `:key` приводит к неправильной работе виртуального DOM
при изменении порядка элементов. Для статичного массива это не ломает функциональность сейчас, но
нарушает лучшие практики и станет источником багов при динамическом добавлении/удалении слайдов.
Fix: Добавить поле `id` к каждому слайду и использовать его как ключ:
```ts
const slides = [
  { id: 'slide-1', image: slide1 },
  { id: 'slide-2', image: slide2 },
  { id: 'slide-3', image: slide3 },
]
```
```html
<div v-for="(slide, i) in slides" :key="slide.id" ...>
<button v-for="(slide, i) in slides" :key="slide.id" ...>
```

### [medium] Лишний импорт `RouterLink` из `vue-router` (глобально зарегистрирован)
Files:
- `apps/web/src/features/hero/HeroSlider.vue:48`
- `apps/web/src/shared/AppHeader.vue:34`
- `apps/web/src/features/navigation/BurgerMenu.vue:86`
Problem: `vue-router` глобально регистрирует `RouterLink` и `RouterView` при подключении плагина через
`app.use(router)`. Явный импорт `import { RouterLink } from 'vue-router'` избыточен — он не ломает
работу, но засоряет код и создаёт несогласованность.
Fix: Удалить строку `import { RouterLink } from 'vue-router'` во всех трёх файлах.

### [medium] Отсутствует тест на `resetTimer` при ручной навигации
File: `apps/web/tests/unit/HeroSlider.test.ts`
Problem: Логика `resetTimer()` — важный сайд-эффект: при ручном клике таймер должен обнуляться, чтобы
следующий автопереход происходил через 4 секунды от момента клика. Этого сценария в тестах нет.
Fix: Добавить тест:
```ts
it('ручная навигация сбрасывает таймер автоплея', async () => {
  const wrapper = mountSlider()
  vi.advanceTimersByTime(2000) // прошло 2 сек из 4
  await wrapper.find('.hero-slider__arrow--next').trigger('click') // индекс = 1, таймер сброшен
  vi.advanceTimersByTime(2000) // ещё 2 сек — автоплей НЕ должен был сработать
  await wrapper.vm.$nextTick()
  const slides = wrapper.findAll('.hero-slider__slide')
  expect(slides[1].classes()).toContain('hero-slider__slide--active') // всё ещё слайд 1
})
```

### [medium] Хардкод `height: 65px` для `--header-height` без привязки к реальной высоте хедера
File: `apps/web/src/assets/styles/variables.scss:19`
Problem: `--header-height: 65px` — магическое число, которое должно совпадать с реальной высотой
`AppHeader`. В `AppHeader.vue` хедер имеет `padding: 16px 20px`, высота шрифта логотипа `32px` и `line-height: 1` —
итого реальная высота ~`32 + 32 = 64px` или `65px` в зависимости от рендера. При изменении отступов
хедера переменная устареет незаметно.
Fix: Задокументировать привязку комментарием прямо в `variables.scss`:
```scss
// Должно совпадать с реальной высотой .app-header (padding: 16px top+bottom + logo line-height 32px)
--header-height: 65px;
```
Долгосрочно — вычислять через JS и CSS-переменную в `AppHeader.vue` через `ResizeObserver`.

### [low] Смешение стилей кавычек в TypeScript-файлах
Files: `apps/web/src/shared/AppHeader.vue`, `apps/web/src/features/navigation/BurgerMenu.vue`
Problem: В `AppHeader.vue` и `BurgerMenu.vue` используются двойные кавычки в импортах (`"vue"`,
`"@/features/navigation"`), тогда как в остальных файлах проекта (`HeroSlider.vue`, тесты) —
одинарные. Несогласованность.
Fix: Настроить Prettier с `singleQuote: true` и применить форматирование. До этого — придерживаться
одинарных кавычек вручную.

### [low] Декларация модулей `*.scss` / `*.css` в `vite-env.d.ts` избыточна для проекта
File: `apps/web/src/vite-env.d.ts:9`
Problem: Объявление `declare module "*.scss"` и `declare module "*.css"` говорит TypeScript, что
импорт `.scss` файла возвращает `Record<string, string>` (CSS-модуль). Но проект использует
`<style scoped>` — без CSS-модулей. Прямых импортов `.scss` кроме `variables.scss` в `main.ts` нет.
Декларация вводит в заблуждение и конфликтует с реальным поведением.
Fix: Удалить блоки `declare module "*.scss"` и `declare module "*.css"`.

---

## Verdict
BLOCKED

Reason: Два `[high]` нарушения — визуальный баг hover на `.hero-slider__btn` (shimmer перекрывает белый фон)
и нарушение архитектурного правила deep import в тесте — блокируют коммит. Оба исправляются быстро.
