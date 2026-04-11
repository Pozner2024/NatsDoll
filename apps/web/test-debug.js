import { mount } from '@vue/test-utils'
import ReviewsSlider from './src/widgets/reviews-slider/ReviewsSlider.vue'

const wrapper = mount(ReviewsSlider)
console.log('Component mounted')
console.log('Find review cards:', wrapper.findAll('.review-card'))
const counter = wrapper.find('.review-card__counter')
console.log('Counter element:', counter.element)
console.log('Counter text:', counter.text())
console.log('currentIndex from component:', wrapper.vm.currentIndex)
console.log('currentIndex.value:', wrapper.vm.currentIndex?.value)
