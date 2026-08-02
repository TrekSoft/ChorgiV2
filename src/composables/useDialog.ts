import { ref } from 'vue'

interface DialogOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface DialogState extends DialogOptions {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

const state = ref<DialogState>({
  open: false,
  message: '',
  resolve: null,
})

export function useDialog() {
  function confirm(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        open: true,
        resolve,
        title: options.title || 'Confirm',
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: options.danger ?? false,
      }
    })
  }

  function alert(options: Omit<DialogOptions, 'cancelLabel'> & { cancelLabel?: string }): Promise<void> {
    return new Promise((resolve) => {
      state.value = {
        open: true,
        resolve: () => { resolve() },
        title: options.title || 'Notice',
        message: options.message,
        confirmLabel: options.confirmLabel || 'OK',
        cancelLabel: options.cancelLabel || '',
        danger: options.danger ?? false,
      }
    })
  }

  function resolve(result: boolean) {
    state.value.resolve?.(result)
    state.value = { ...state.value, open: false, resolve: null }
  }

  return { state, confirm, alert, resolve }
}
