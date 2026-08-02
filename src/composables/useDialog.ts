import { ref } from 'vue'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PromptOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  defaultValue?: string
  placeholder?: string
}

type DialogMode = 'confirm' | 'alert' | 'prompt'

interface DialogState {
  open: boolean
  mode: DialogMode
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger: boolean
  inputValue: string
  placeholder: string
  resolve: ((value: boolean | string | null) => void) | null
}

const state = ref<DialogState>({
  open: false,
  mode: 'confirm',
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  inputValue: '',
  placeholder: '',
  resolve: null,
})

export function useDialog() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      state.value = {
        open: true,
        mode: 'confirm',
        resolve: resolve as (value: boolean | string | null) => void,
        title: options.title || 'Confirm',
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: options.danger ?? false,
        inputValue: '',
        placeholder: '',
      }
    })
  }

  function alert(options: Omit<ConfirmOptions, 'cancelLabel'> & { cancelLabel?: string }): Promise<void> {
    return new Promise<void>((resolve) => {
      state.value = {
        open: true,
        mode: 'alert',
        resolve: (() => { resolve() }) as (value: boolean | string | null) => void,
        title: options.title || 'Notice',
        message: options.message,
        confirmLabel: options.confirmLabel || 'OK',
        cancelLabel: options.cancelLabel || '',
        danger: options.danger ?? false,
        inputValue: '',
        placeholder: '',
      }
    })
  }

  function prompt(options: PromptOptions): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      state.value = {
        open: true,
        mode: 'prompt',
        resolve: resolve as (value: boolean | string | null) => void,
        title: options.title || 'Input',
        message: options.message,
        confirmLabel: options.confirmLabel || 'OK',
        cancelLabel: options.cancelLabel || 'Cancel',
        danger: false,
        inputValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
      }
    })
  }

  function resolve(result: boolean | string | null) {
    state.value.resolve?.(result)
    state.value = { ...state.value, open: false, resolve: null }
  }

  return { state, confirm, alert, prompt, resolve }
}
