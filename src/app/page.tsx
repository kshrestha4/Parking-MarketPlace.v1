import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Find parking, or make money from the space you are not using.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        Drivers can search a map, compare prices, and reserve a spot in
        advance. Homeowners and businesses can list unused parking and earn
        from it.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/search"
          className="rounded-full bg-white px-7 py-3 font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Find parking
        </Link>
        <Link
          href="/host"
          className="rounded-full border border-white/20 px-7 py-3 font-medium transition-colors hover:border-white/50"
        >
          List your space
        </Link>
      </div>

      <div className="mt-24 grid w-full max-w-3xl grid-cols-1 gap-8 text-left sm:grid-cols-3">
        <div>
          <h3 className="font-medium">Find a spot</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Search by location, filter by price, and see what is nearby on the
            map.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Reserve ahead</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Pick your times, pay up front, and get a confirmation for your
            reservation.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Earn from space</h3>
          <p className="mt-2 text-sm text-zinc-400">
            List an empty driveway or lot, set your price, and get paid when
            drivers book.
          </p>
        </div>
      </div>
    </div>
  );
}
