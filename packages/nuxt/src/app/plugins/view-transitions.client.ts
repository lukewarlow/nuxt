import { isChangingPage } from '../components/utils'
import { useRouter } from '../composables/router'
import { defineNuxtPlugin } from '../nuxt'

export default defineNuxtPlugin((nuxtApp) => {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return }

  let finishTransition: undefined | (() => void)
  let abortTransition: undefined | (() => void)

  const router = useRouter()

  router.beforeResolve((to, from) => {
    if (!isChangingPage(to, from)) {
      return
    }
    const promise = new Promise<void>((resolve, reject) => {
      finishTransition = resolve
      abortTransition = reject
    })

    let changeRoute: () => void
    const ready = new Promise<void>(resolve => (changeRoute = resolve))

    const transition = document.startViewTransition!(() => {
      changeRoute()
      return promise
    })

    transition.finished.then(() => {
      abortTransition = undefined
      finishTransition = undefined
    })

    return ready
  })

  nuxtApp.hook('vue:error', () => {
    abortTransition?.()
    abortTransition = undefined
  })

  nuxtApp.hook('page:finish', () => {
    finishTransition?.()
    finishTransition = undefined
  })
})

declare global {
  interface Document {
    startViewTransition?: (callback: () => Promise<void> | void) => {
      finished: Promise<void>
      updateCallbackDone: Promise<void>
      ready: Promise<void>
    }
  }
}
