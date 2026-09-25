<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { SUPPORT_LIMITS } from '../../api/support'
import EmptyIllustration from '../common/EmptyIllustration.vue'
import ReportField from './ReportField.vue'
import ReportAttachments from './ReportAttachments.vue'
import ReportLogsPreview from './ReportLogsPreview.vue'
import { openReport, reportOpen, useReportForm } from './useReportForm'

/* Диалог «Сообщить о проблеме». Поля — строго по инструкции топика
 * поддержки. Открывается кнопкой (`openReport`) или ссылкой `?report=1`
 * — её дают из бота. */

const route = useRoute()
const router = useRouter()
const { xs } = useDisplay()
const form = useReportForm()
const { fields, errors, status } = form

const sending = computed(() => status.value === 'sending')
const shown = (key: keyof typeof errors.value) => (form.triedSubmit.value ? errors.value[key] : '')
const percent = computed(() => Math.round(form.progress.value * 100))

watch(
  () => route.query.report,
  (value) => {
    if (value === '1') openReport()
  },
  { immediate: true },
)

watch(reportOpen, (open) => {
  if (open || route.query.report === undefined) return
  const query = { ...route.query }
  delete query.report
  void router.replace({ query })
})

function close(): void {
  if (sending.value) return
  reportOpen.value = false
}
</script>

<template>
  <v-dialog
    v-model="reportOpen"
    :fullscreen="xs"
    :persistent="sending"
    max-width="560"
    scrollable
    @after-leave="status === 'success' && form.resetForm()"
  >
    <div class="rp" role="document">
      <header class="rp-head">
        <div>
          <h2 class="rp-title">{{ status === 'success' ? 'Обращение отправлено' : 'Сообщить о проблеме' }}</h2>
          <p v-if="status !== 'success'" class="rp-lead">Опишите, что пошло не так. Обращение уйдёт в поддержку.</p>
        </div>
        <button type="button" class="rp-close" aria-label="Закрыть" :disabled="sending" @click="close">
          <v-icon icon="mdi-close" size="22" />
        </button>
      </header>

      <div v-if="status === 'success'" class="rp-done" role="status">
        <EmptyIllustration kind="person-success" :size="148" />
        <span v-if="form.ticketId.value" class="rp-done-ticket">Обращение №{{ form.ticketId.value }}</span>
        <p class="rp-done-title">Спасибо, что рассказали</p>
        <p class="rp-done-sub">
          Мы уже получили обращение и разберёмся.
          {{ fields.contact.trim() ? 'Если понадобятся детали — напишем по вашему контакту.' : '' }}
        </p>
        <button type="button" class="rp-btn" @click="close">Закрыть</button>
      </div>

      <form v-else class="rp-body" novalidate @submit.prevent="form.submit">
        <ReportField id="rp-device" label="Устройство" hint="Например: Samsung A55 (Android 15); iPhone 15 (iOS 26.0.1)" :error="shown('device')">
          <input id="rp-device" v-model="fields.device" class="rf-input" :maxlength="SUPPORT_LIMITS.device" :disabled="sending" autocomplete="off" />
        </ReportField>

        <ReportField id="rp-what" label="Что случилось" :error="shown('description')">
          <textarea
            id="rp-what"
            v-model="fields.description"
            class="rf-input"
            rows="4"
            :maxlength="SUPPORT_LIMITS.description"
            :disabled="sending"
            placeholder="Вылетает приложение, когда открываю расписание на сегодня"
          />
        </ReportField>

        <ReportField id="rp-when" label="Когда примерно" hint="Например: днём в 12 часов / в 15:38 / не помню точно, где-то в 4" :error="shown('happenedAt')">
          <input id="rp-when" v-model="fields.happenedAt" class="rf-input" :maxlength="SUPPORT_LIMITS.happenedAt" :disabled="sending" autocomplete="off" />
        </ReportField>

        <ReportField id="rp-files" label="Скриншот или видео" optional>
          <ReportAttachments
            :items="form.attachments.value"
            :total-bytes="form.totalBytes.value"
            :error="form.attachError.value"
            :disabled="sending"
            @add="form.addFiles"
            @remove="form.removeFile"
          />
        </ReportField>

        <ReportField id="rp-contact" label="Как с вами связаться" hint="Telegram @ник или почта — если хотите получить ответ" optional :error="shown('contact')">
          <input id="rp-contact" v-model="fields.contact" class="rf-input" :maxlength="SUPPORT_LIMITS.contact" :disabled="sending" autocomplete="email" placeholder="@nickname" />
        </ReportField>

        <!-- Ловушка для ботов: человек это поле не видит и не заполняет. -->
        <div class="rp-trap" aria-hidden="true">
          <label for="rp-website">Сайт</label>
          <input id="rp-website" v-model="fields.website" name="website" tabindex="-1" autocomplete="off" />
        </div>

        <ReportLogsPreview v-model="form.attachLogs.value" :disabled="sending" />

        <div class="rp-foot">
          <p v-if="form.submitError.value" class="rp-error" role="alert">{{ form.submitError.value }}</p>
          <div v-if="sending" class="rp-progress" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
            <span :style="{ width: `${Math.max(4, percent)}%` }" />
          </div>
          <div class="rp-actions">
            <button v-if="sending" type="button" class="rp-btn" @click="form.cancelSending">Отменить</button>
            <button v-else type="button" class="rp-btn" @click="close">Закрыть</button>
            <button type="submit" class="rp-btn rp-btn--primary" :disabled="sending">
              {{ sending ? `Отправляем… ${percent}%` : 'Отправить' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </v-dialog>
</template>

<style scoped src="./reportDialog.css"></style>
