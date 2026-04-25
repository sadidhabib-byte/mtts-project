export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-gradient-to-br from-slate-900 to-indigo-900 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide">
            Mass Transport Ticketing System
          </h3>
          <p className="mt-3 text-sm text-white/80">
            Book tickets for metro (and later train & bus) with a fast, reliable checkout
            experience.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide">Quick Links</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>
              <a className="hover:text-white" href="/">
                Home
              </a>
            </li>
            <li>
              <a className="hover:text-white" href="/metro">
                Metro
              </a>
            </li>
            <li className="text-white/50">Train (coming soon)</li>
            <li className="text-white/50">Bus (coming soon)</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold tracking-wide">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Email: example@example.com</li>
            <li>Phone: +880 ...</li>
            <li>Dhaka, Bangladesh</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-white/70">
          © {new Date().getFullYear()} Mass Transport Ticketing System. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

