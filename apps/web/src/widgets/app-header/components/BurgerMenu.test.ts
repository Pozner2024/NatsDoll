/// <reference types="vitest" />
import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import BurgerMenu from './BurgerMenu.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/", component: { template: "<div />" } }],
});

function mountMenu(props = {}) {
  return mount(BurgerMenu, {
    props: { isOpen: false, ...props },
    global: { plugins: [router] },
  });
}

describe("BurgerMenu — видимость", () => {
  it("скрыто при isOpen: false", () => {
    const wrapper = mountMenu({ isOpen: false });
    expect(wrapper.find("nav").isVisible()).toBe(false);
  });

  it("видно при isOpen: true", () => {
    const wrapper = mountMenu({ isOpen: true });
    expect(wrapper.find("nav").isVisible()).toBe(true);
  });
});

describe("BurgerMenu — эмиты", () => {
  it("эмитит close при клике на ссылку", async () => {
    const wrapper = mountMenu({ isOpen: true });
    await wrapper.find("a").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("эмитит close при нажатии Escape", async () => {
    const wrapper = mountMenu({ isOpen: true });
    await wrapper.find("nav").trigger("keydown.escape");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

describe("BurgerMenu — подменю Shop", () => {
  it("подменю закрыто по умолчанию", () => {
    const wrapper = mountMenu({ isOpen: true });
    expect(wrapper.find("#shop-submenu").isVisible()).toBe(false);
  });

  it("клик на кнопку Shop открывает подменю", async () => {
    const wrapper = mountMenu({ isOpen: true });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("#shop-submenu").isVisible()).toBe(true);
  });

  it("повторный клик на кнопку Shop закрывает подменю", async () => {
    const wrapper = mountMenu({ isOpen: true });
    const btn = wrapper.find("button");
    await btn.trigger("click");
    await btn.trigger("click");
    expect(wrapper.find("#shop-submenu").isVisible()).toBe(false);
  });

  it("подменю сбрасывается при закрытии меню", async () => {
    const wrapper = mountMenu({ isOpen: true });
    await wrapper.find("button").trigger("click");
    expect(
      (wrapper.find("#shop-submenu").element as HTMLElement).style.display,
    ).not.toBe("none");

    await wrapper.setProps({ isOpen: false });
    await flushPromises();
    await wrapper.setProps({ isOpen: true });
    await flushPromises();

    expect(
      (wrapper.find("#shop-submenu").element as HTMLElement).style.display,
    ).toBe("none");
  });
});

describe("BurgerMenu — управление фокусом", () => {
  it("фокус перемещается на nav при открытии", async () => {
    const wrapper = mountMenu({ isOpen: false });
    const navEl = wrapper.find("nav").element as HTMLElement;
    const focusSpy = vi.spyOn(navEl, "focus");

    await wrapper.setProps({ isOpen: true });
    await new Promise((r) => setTimeout(r, 0)); // nextTick

    expect(focusSpy).toHaveBeenCalled();
  });

  it("фокус возвращается на triggerRef при закрытии", async () => {
    const trigger = document.createElement("button");
    const focusSpy = vi.spyOn(trigger, "focus");

    const wrapper = mountMenu({ isOpen: true, triggerRef: trigger });
    await wrapper.setProps({ isOpen: false });

    expect(focusSpy).toHaveBeenCalled();
  });
});
