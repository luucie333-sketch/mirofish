import type { Metadata } from 'next';
import LegalPageLayout from '@/components/site/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | MiroFish',
  description: 'Privacy Policy for MiroFish, including how we collect, use, and protect information.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This page explains what information MiroFish collects, how it is used, and what choices users have about their data."
    >
      <div className="space-y-8 text-sm sm:text-base leading-7 text-muted">
        <section className="space-y-3">
          <p><strong className="text-text">Effective date:</strong> April 11, 2026</p>
          <p>
            MiroFish provides AI-powered scenario prediction, simulation, and reporting tools. By using our website,
            you acknowledge that we may collect and process information as described in this Privacy Policy.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Information we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account information such as your email address and authentication details.</li>
            <li>Content you submit, including prompts, uploaded files, chat messages, and generated reports.</li>
            <li>Payment-related information needed to process purchases or subscriptions.</li>
            <li>Technical information such as IP address, browser type, device details, cookies, and usage analytics.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">How we use information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide, maintain, and improve the MiroFish service.</li>
            <li>To authenticate users, manage accounts, and prevent abuse or fraud.</li>
            <li>To process transactions, subscriptions, and customer support requests.</li>
            <li>To analyze product performance, reliability, and usage trends.</li>
            <li>To comply with legal obligations and enforce our terms.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Cookies and advertising</h2>
          <p>
            We may use cookies and similar technologies to remember preferences, measure traffic, and support advertising.
            Third-party advertising partners, including Google AdSense, may use cookies to serve ads based on your visit
            to this site and other sites on the internet.
          </p>
          <p>
            Users may be able to manage personalized advertising settings through Google&apos;s ad settings and browser
            cookie controls.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Data sharing</h2>
          <p>
            We may share information with service providers that help operate the platform, such as hosting, analytics,
            authentication, payments, infrastructure, and communications providers. We may also disclose information when
            required by law or when necessary to protect our rights, users, or the public.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Data retention and security</h2>
          <p>
            We retain information for as long as reasonably necessary to provide the service, comply with legal obligations,
            resolve disputes, and enforce agreements. We use reasonable administrative and technical safeguards, but no
            internet transmission or storage system can be guaranteed as completely secure.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Your choices</h2>
          <p>
            You may request access, correction, or deletion of personal information we hold about you, subject to applicable
            law and operational requirements. You may also stop using the service at any time.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Contact</h2>
          <p>
            For privacy questions or requests, contact us at <a className="text-mint hover:text-mint-dim" href="mailto:support@mirofish.us">support@mirofish.us</a>.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
