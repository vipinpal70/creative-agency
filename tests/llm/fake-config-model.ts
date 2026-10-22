/*
 * In-memory stand-in for the AIProviderConfig Mongoose model. Implements just
 * the query shapes the LLM layer uses, including `select: false` semantics on
 * encryptedApiKey, so tests can prove the blob is only read when asked for.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loosely-typed fake documents
export type FakeDoc = Record<string, any>;
type Doc = FakeDoc;

export function createFakeConfigModel() {
  const docs: Doc[] = [];

  const matches = (doc: Doc, filter: Doc) =>
    Object.entries(filter).every(([k, v]) => String(doc[k]) === String(v));

  const project = (doc: Doc | undefined, includeSecret: boolean) => {
    if (!doc) return null;
    const copy = structuredClone(doc);
    if (!includeSecret) delete copy.encryptedApiKey;
    return copy;
  };

  function query<T>(run: (includeSecret: boolean) => T) {
    let includeSecret = false;
    const q = {
      select(fields: string) {
        if (fields.includes("+encryptedApiKey")) includeSecret = true;
        return q;
      },
      lean: async () => run(includeSecret),
      then: (resolve: (v: T) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(run(includeSecret)).then(resolve, reject),
    };
    return q;
  }

  const model = {
    docs,
    find: (filter: Doc) => query(() => docs.filter((d) => matches(d, filter)).map((d) => project(d, false))),
    findOne: (filter: Doc) => query((inc) => project(docs.find((d) => matches(d, filter)), inc)),
    findOneAndUpdate: (filter: Doc, update: { $set?: Doc; $unset?: Doc }, opts: { upsert?: boolean }) =>
      query(() => {
        let doc = docs.find((d) => matches(d, filter));
        if (!doc) {
          if (!opts?.upsert) return null;
          doc = { ...filter, createdAt: new Date() };
          docs.push(doc);
        }
        Object.assign(doc, structuredClone(update.$set ?? {}));
        for (const key of Object.keys(update.$unset ?? {})) delete doc[key];
        doc.updatedAt = new Date();
        return project(doc, false);
      }),
    deleteOne: async (filter: Doc) => {
      const i = docs.findIndex((d) => matches(d, filter));
      if (i >= 0) docs.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    },
  };

  return model;
}
