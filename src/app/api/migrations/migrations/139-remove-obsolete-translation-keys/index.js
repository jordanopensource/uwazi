/* eslint-disable no-await-in-loop */
const obsoleteTranslationKeys = ['Your account is protected by 2fa.', 'Protect your account'];

export default {
  delta: 139,

  name: 'remove-obsolete-translation-keys',

  description:
    'The migration removes known obsoleted entries in the System context of translations.',

  reindex: false,

  async up(db) {
    process.stdout.write(`${this.name}...\r\n`);

    const translations = await db.collection('translations').find({});

    while (await translations.hasNext()) {
      const language = await translations.next();
      const updatedContexts = language.contexts.map(context => {
        if (context.id !== 'System') {
          return context;
        }

        const updatedValues = context.values.filter(
          value => !obsoleteTranslationKeys.includes(value.key)
        );

        return { ...context, values: updatedValues };
      });

      await db
        .collection('translations')
        .updateOne({ _id: language._id }, { $set: { contexts: updatedContexts } });
    }
  },
};
