export default function PublicFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Redhill Village Hall</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              A community space for everyone in Redhill and the surrounding area.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Find Us</h3>
            <address className="not-italic text-sm text-gray-600 leading-relaxed">
              Redhill Village Hall<br />
              Village Road<br />
              Redhill<br />
            </address>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Get in Touch</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <a href="mailto:hello@redhillvillagehall.org" className="hover:text-green-700">
                  hello@redhillvillagehall.org
                </a>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
          © {new Date().getFullYear()} Redhill Village Hall Trust. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
