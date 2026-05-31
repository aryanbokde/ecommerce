export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form className="flex w-full max-w-sm flex-col gap-4 p-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>

        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="rounded border px-3 py-2"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="rounded border px-3 py-2"
        />

        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Sign in
        </button>
      </form>
    </main>
  );
}
