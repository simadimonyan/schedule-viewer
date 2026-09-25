import { computed, reactive, ref } from 'vue'
import { SUPPORT_LIMITS, SupportError, sendSupportReport, type SendHandle } from '../../api/support'
import { buildLogsPayload } from '../../utils/clientLogs'
import { guessDevice, refineDeviceGuess } from '../../utils/deviceGuess'

/**
 * Состояние формы «Сообщить о проблеме».
 *
 * Живёт на уровне модуля, а не компонента: закрытый диалог не теряет
 * введённое, и открыть его можно откуда угодно (`openReport`).
 */

export interface Attachment {
  id: number
  file: File
  /** object URL для превью картинки/видео; отзывается при удалении. */
  preview: string
}

type Status = 'idle' | 'sending' | 'success'

export const reportOpen = ref(false)

const fields = reactive({
  device: '',
  description: '',
  happenedAt: '',
  contact: '',
  website: '',
})
const attachments = ref<Attachment[]>([])
const attachLogs = ref(true)
const status = ref<Status>('idle')
const progress = ref(0)
const submitError = ref('')
const attachError = ref('')
const triedSubmit = ref(false)
const ticketId = ref<number | string | null>(null)

let nextId = 1
let deviceGuess = ''
let pending: SendHandle | null = null

function nowLabel(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `сегодня в ${hh}:${mm}`
}

/** Предзаполнение на открытии — только пустых полей. */
function prefill(): void {
  if (!fields.device) {
    deviceGuess = guessDevice()
    fields.device = deviceGuess
    void refineDeviceGuess().then((better) => {
      if (better && fields.device === deviceGuess) {
        deviceGuess = better
        fields.device = better
      }
    })
  }
  if (!fields.happenedAt) fields.happenedAt = nowLabel()
}

export function openReport(): void {
  if (status.value === 'success') resetForm()
  prefill()
  reportOpen.value = true
}

function resetForm(): void {
  fields.device = ''
  fields.description = ''
  fields.happenedAt = ''
  fields.contact = ''
  fields.website = ''
  attachments.value.forEach((a) => URL.revokeObjectURL(a.preview))
  attachments.value = []
  attachLogs.value = true
  status.value = 'idle'
  progress.value = 0
  submitError.value = ''
  attachError.value = ''
  triedSubmit.value = false
  ticketId.value = null
}

const totalBytes = computed(() => attachments.value.reduce((sum, a) => sum + a.file.size, 0))

function addFiles(list: FileList | File[]): void {
  attachError.value = ''
  const rejected: string[] = []
  for (const file of Array.from(list)) {
    if (!/^(image|video)\//.test(file.type)) {
      rejected.push(`«${file.name}» — не картинка и не видео`)
      continue
    }
    if (attachments.value.length >= SUPPORT_LIMITS.maxFiles) {
      rejected.push(`не больше ${SUPPORT_LIMITS.maxFiles} файлов`)
      break
    }
    if (totalBytes.value + file.size > SUPPORT_LIMITS.maxTotalBytes) {
      rejected.push(`«${file.name}» не помещается: вместе не больше 45 МБ`)
      continue
    }
    attachments.value.push({ id: nextId++, file, preview: URL.createObjectURL(file) })
  }
  if (rejected.length) attachError.value = `Не добавлено: ${rejected.join('; ')}.`
}

function removeFile(id: number): void {
  const item = attachments.value.find((a) => a.id === id)
  if (item) URL.revokeObjectURL(item.preview)
  attachments.value = attachments.value.filter((a) => a.id !== id)
  attachError.value = ''
}

function required(value: string, max: number): string {
  const v = value.trim()
  if (!v) return 'Заполните это поле'
  if (v.length > max) return `Не длиннее ${max} символов`
  return ''
}

const errors = computed(() => ({
  device: required(fields.device, SUPPORT_LIMITS.device),
  description: required(fields.description, SUPPORT_LIMITS.description),
  happenedAt: required(fields.happenedAt, SUPPORT_LIMITS.happenedAt),
  contact: fields.contact.trim().length > SUPPORT_LIMITS.contact ? `Не длиннее ${SUPPORT_LIMITS.contact} символов` : '',
}))

const isValid = computed(() => Object.values(errors.value).every((e) => !e))

async function submit(): Promise<void> {
  triedSubmit.value = true
  submitError.value = ''
  if (!isValid.value || status.value === 'sending') return

  const logs = attachLogs.value
    ? new Blob([JSON.stringify(buildLogsPayload(), null, 1)], { type: 'application/json' })
    : null

  status.value = 'sending'
  progress.value = 0
  pending = sendSupportReport(
    {
      device: fields.device.trim(),
      description: fields.description.trim(),
      happenedAt: fields.happenedAt.trim(),
      contact: fields.contact.trim(),
      page: window.location.href,
      website: fields.website,
      files: attachments.value.map((a) => a.file),
      logs,
    },
    (fraction) => (progress.value = fraction),
  )
  try {
    const { id } = await pending.promise
    ticketId.value = id
    status.value = 'success'
  } catch (err) {
    status.value = 'idle'
    if (!(err instanceof SupportError && err.kind === 'aborted')) {
      submitError.value = err instanceof SupportError ? err.message : 'Не получилось отправить обращение. Попробуйте ещё раз.'
    }
  } finally {
    pending = null
  }
}

function cancelSending(): void {
  pending?.abort()
}

export function useReportForm() {
  return {
    fields,
    attachments,
    attachLogs,
    status,
    progress,
    submitError,
    attachError,
    triedSubmit,
    ticketId,
    totalBytes,
    errors,
    addFiles,
    removeFile,
    submit,
    cancelSending,
    resetForm,
  }
}
