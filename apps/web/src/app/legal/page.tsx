export default function LegalPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Terms of Service & Privacy Policy
        </h1>

        <div className="mt-12 space-y-12">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900">Terms of Service</h2>
            <p className="mt-4 text-gray-600">
              By using CrowdStack, you agree to these terms. Please read them carefully.
            </p>
            <div className="mt-4 space-y-4 text-gray-600">
              <p>
                <strong>1. Acceptance of Terms</strong>
                <br />
                By accessing and using CrowdStack, you accept and agree to be bound by the terms
                and provision of this agreement.
              </p>
              <p>
                <strong>2. Use License</strong>
                <br />
                Permission is granted to temporarily use CrowdStack for personal or commercial
                event management purposes.
              </p>
              <p>
                <strong>3. User Accounts</strong>
                <br />
                You are responsible for maintaining the confidentiality of your account and
                password.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900">Privacy Policy</h2>
            <p className="mt-4 text-gray-600">
              We respect your privacy and are committed to protecting your personal data.
            </p>
            <div className="mt-4 space-y-4 text-gray-600">
              <p>
                <strong>1. Information We Collect</strong>
                <br />
                We collect information you provide directly to us, such as when you create an
                account, register for an event, or contact us.
              </p>
              <p>
                <strong>2. How We Use Your Information</strong>
                <br />
                We use the information we collect to provide, maintain, and improve our services.
              </p>
              <p>
                <strong>3. Data Security</strong>
                <br />
                We implement appropriate security measures to protect your personal information.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

