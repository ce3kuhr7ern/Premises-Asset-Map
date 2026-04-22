export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-green-700 text-white py-24 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Welcome to Redhill Village Hall
        </h1>
        <p className="text-lg text-green-100 max-w-xl mx-auto mb-8">
          A welcoming community space for events, meetings, and celebrations in the heart of Redhill.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/hire"
            className="inline-block bg-white text-green-700 font-semibold px-6 py-3 rounded-lg hover:bg-green-50 transition-colors"
          >
            Hire a Space
          </a>
          <a
            href="/facilities"
            className="inline-block border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            See Our Facilities
          </a>
        </div>
      </section>

      {/* Feature blocks */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Welcoming Spaces',
              body: 'From intimate meetings to large community events, we have a room to suit every occasion.',
            },
            {
              title: 'Community First',
              body: 'Run by the Redhill Village Hall Trust, we exist to serve the local community — not to make a profit.',
            },
            {
              title: 'Simple to Hire',
              body: 'Competitive rates, flexible booking, and a straightforward process. Get in touch to check availability.',
            },
          ].map(({ title, body }) => (
            <div key={title} className="text-center px-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact strip */}
      <section className="bg-gray-50 border-t border-gray-200 py-12 px-4 text-center">
        <p className="text-gray-600 text-sm mb-2">Ready to book or have a question?</p>
        <a
          href="/contact"
          className="inline-block bg-green-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-800 transition-colors"
        >
          Get in Touch
        </a>
      </section>
    </div>
  );
}
