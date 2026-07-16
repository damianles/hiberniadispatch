import { prisma } from "@/lib/prisma";
import {
  deleteContactAction,
  toggleContactFavoriteAction,
} from "./actions";
import { ContactForm } from "./ContactForm";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    orderBy: [{ isFavorite: "desc" }, { nickname: "asc" }],
  });

  return (
    <section>
      <h1 className="font-brand text-3xl text-sage-dark">Contacts</h1>
      <p className="mt-2 text-ink/60">
        Save dispatch email recipients with nicknames and favourites.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Add contact</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>

        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Saved</h2>
          {contacts.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50">No contacts yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line/60">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-sage-dark">
                      {c.nickname}
                      {c.isFavorite ? " ★" : ""}
                    </p>
                    <p className="text-ink/80">{c.name}</p>
                    <p className="text-ink/55">{c.email}</p>
                    {c.phone ? (
                      <p className="text-ink/45">{c.phone}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleContactFavoriteAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="border border-line px-2 py-1 text-xs hover:border-sage"
                      >
                        {c.isFavorite ? "Unfavourite" : "Favourite"}
                      </button>
                    </form>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="border border-line px-2 py-1 text-xs text-burgundy hover:border-burgundy"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
