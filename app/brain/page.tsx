import Link from "next/link"

import { MayaMark } from "@/components/maya-mark"

export const metadata = {
  title: "Load and use Maya’s brain",
  description:
    "Download once, load each session, then use the offline brain the right way.",
}

export default function BrainGuidePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-5 py-10 sm:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <MayaMark className="size-5" />
        Back to chat
      </Link>
      <h1 className="font-heading mt-6 text-3xl font-medium tracking-tight sm:text-4xl">
        Load the brain, then use it
      </h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        Download and load are not the same as talking to her. They are two
        steps on one path. Do them in order. The full text also lives in{" "}
        <a className="underline underline-offset-2" href="https://github.com/flute-master/maya/blob/main/BRAIN.md">
          BRAIN.md
        </a>
        .
      </p>

      <ol className="mt-8 space-y-8">
        <li className="rounded-2xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Step 1 · once per machine
          </p>
          <h2 className="mt-1 text-lg font-medium">Download</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            About 2 GB. Installs Ollama if needed, pulls Llama 3.2, bakes the
            named model <span className="text-foreground">maya</span>. This is
            not training from your chats.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-background px-3 py-2 text-sm">
            <code>npm run brain</code>
          </pre>
          <p className="mt-2 text-sm text-muted-foreground">
            Windows without WSL: install{" "}
            <a
              className="underline underline-offset-2"
              href="https://ollama.com"
              target="_blank"
              rel="noreferrer"
            >
              Ollama
            </a>
            , then <code className="text-foreground">ollama pull llama3.2</code>{" "}
            and{" "}
            <code className="text-foreground">ollama create maya -f Modelfile</code>{" "}
            from the project folder.
          </p>
        </li>

        <li className="rounded-2xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Step 2 · every session
          </p>
          <h2 className="mt-1 text-lg font-medium">Load</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ollama must be running. This checks that <span className="text-foreground">maya</span>{" "}
            exists, then starts the site with that model. Do not stop after
            the download and open a bare <code>npm run dev</code> in another
            terminal unless Ollama is already up.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-background px-3 py-2 text-sm">
            <code>{`# start the Ollama app, or: ollama serve
npm run brain:use`}</code>
          </pre>
          <p className="mt-2 text-sm text-muted-foreground">
            Check only, without starting the site:{" "}
            <code className="text-foreground">npm run brain:load</code>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            WSL talking to Windows Ollama:{" "}
            <code className="text-foreground">
              export OLLAMA_URL=http://127.0.0.1:11434
            </code>{" "}
            then <code className="text-foreground">npm run brain:use</code>.
          </p>
        </li>

        <li className="rounded-2xl bg-card p-4 ring-1 ring-foreground/8 sm:p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Step 3 · in the app
          </p>
          <h2 className="mt-1 text-lg font-medium">Use it correctly</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>
              Open{" "}
              <Link className="text-foreground underline underline-offset-2" href="/">
                http://127.0.0.1:43217
              </Link>{" "}
              and hard-refresh once (<span className="text-foreground">Ctrl+Shift+R</span>).
            </li>
            <li>
              Customize → Lookup (globe). It must say{" "}
              <span className="text-foreground">maya is ready</span> (or{" "}
              <span className="text-foreground">maya:latest</span>). If it
              does not, Ollama is down or you skipped step 2.
            </li>
            <li>
              Send <span className="text-foreground">Who are you to me?</span>{" "}
              A CPU / sparkle mark in the header means the local brain or
              tools ran — not a paid API.
            </li>
            <li>
              Talk normally. Typos are fine. Weather, maps, and songs still
              use tools first — that is correct. The brain writes the reply
              around what the tool found.
            </li>
            <li>
              Memory is how she learns you. Refresh does not wipe her. New
              chat only starts a fresh thread.
            </li>
          </ol>
        </li>
      </ol>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Three brains — linked, not mixed</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          They sit in the same Lookup panel but they are not three copies of
          the same thing. Use one talker at a time.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Which</th>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 font-medium">How you turn it on</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-t border-foreground/10">
                <td className="py-2 pr-3 text-foreground">Ollama <code>maya</code></td>
                <td className="py-2 pr-3">Laptop, smart offline talk</td>
                <td className="py-2">Steps 1–2 above. This is the one you want.</td>
              </tr>
              <tr className="border-t border-foreground/10">
                <td className="py-2 pr-3 text-foreground">On-device</td>
                <td className="py-2 pr-3">Phone, or Ollama off</td>
                <td className="py-2">
                  Lookup → Load on-device brain. Chrome/Edge, ~0.9 GB once.
                </td>
              </tr>
              <tr className="border-t border-foreground/10">
                <td className="py-2 pr-3 text-foreground">Tiny net</td>
                <td className="py-2 pr-3">Optional extra on small talk</td>
                <td className="py-2">
                  Lookup → Train from chats, leave “Use trained net” on. Not
                  Llama.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Prefer order: tools (weather, maps, YouTube) → tiny net (plain talk
          only, if trained) → Ollama <code className="text-foreground">maya</code>{" "}
          → built-in engine.
        </p>
      </section>

      <section className="mt-10 mb-16">
        <h2 className="text-lg font-medium">If it is not working</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          <li>
            Replies feel thin or say “parsing” — Ollama is not running. Open
            the app or <code className="text-foreground">ollama serve</code>,
            then <code className="text-foreground">npm run brain:use</code>.
          </li>
          <li>
            Lookup says nothing is ready — you downloaded but did not load.
            Stay on this path; do not treat README “feature” pages as a
            second install.
          </li>
          <li>
            WSL cannot see Windows Ollama — set{" "}
            <code className="text-foreground">OLLAMA_URL</code> as in step 2.
          </li>
          <li>
            <code className="text-foreground">npm run doctor</code> prints
            whether the local model is visible.
          </li>
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Feature list (maps, Google, flute, …):{" "}
          <a
            className="underline underline-offset-2"
            href="https://github.com/flute-master/maya/blob/main/README.md"
          >
            README
          </a>
          . Those pages assume the brain is already loaded.
        </p>
      </section>
    </main>
  )
}
