/**
 * Document-protection UI strings (Review → Protection). Every locale spreads the
 * English base and overrides it (same pattern as the certificate-sign strings).
 */
const protectStrings = {
  protect: 'Protect',
  protectHint: 'Set, change or remove the password this file is saved with',
  protectTitle: 'Document protection',
  protectSetHint:
    'The next save writes this file with a password. Readers need it to open the document.',
  protectChangeHint: 'The next save re-writes the file with this password and these limits.',
  protectPasswordLabel: 'Password to open',
  protectConfirmLabel: 'Confirm password',
  protectOwnerLabel: 'Owner password (optional)',
  protectPermsLabel: 'Once opened, readers may:',
  permPrint: 'Print',
  permModify: 'Edit content',
  permAnnotate: 'Annotate and fill forms',
  permCopy: 'Copy text and images',
  protectApply: 'Apply protection',
  protectRemove: 'Remove protection',
  protectMismatch: 'The passwords do not match',
}

const localizedProtectStrings: Record<string, Partial<typeof protectStrings>> = {
  ru: {
    protect: 'Защитить',
    protectHint: 'Задать, изменить или убрать пароль, с которым сохраняется файл',
    protectTitle: 'Защита документа',
    protectSetHint:
      'При следующем сохранении файл будет записан с паролем; для открытия его потребуется ввести.',
    protectChangeHint:
      'При следующем сохранении файл будет перезаписан с этим паролем и этими ограничениями.',
    protectPasswordLabel: 'Пароль для открытия',
    protectConfirmLabel: 'Подтвердите пароль',
    protectOwnerLabel: 'Пароль владельца (необязательно)',
    protectPermsLabel: 'После открытия читатель может:',
    permPrint: 'Печать',
    permModify: 'Изменять содержимое',
    permAnnotate: 'Добавлять аннотации и заполнять формы',
    permCopy: 'Копировать текст и изображения',
    protectApply: 'Применить защиту',
    protectRemove: 'Снять защиту',
    protectMismatch: 'Пароли не совпадают',
  },

}


export const protectStringsFor = (lang: string) => ({
  ...protectStrings,
  ...(localizedProtectStrings[lang as keyof typeof localizedProtectStrings] ?? {}),
})
