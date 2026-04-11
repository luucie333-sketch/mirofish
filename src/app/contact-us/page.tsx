import type { Metadata } from 'next';
import LegalPageLayout from '@/components/site/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Contact Us | MiroFish',
  description: 'Contact the MiroFish team for support, partnerships, billing, and privacy questions.',
};

export default function ContactUsPage() {
  return (
    <LegalPageLayout
      eyebrow="Contact"
      title="Contact Us"
      description="If you need help with MiroFish, have a business inquiry, or want to reach us about privacy or billing, use the contact details below."
    >
      <div className="space-y-8 text-sm sm:text-base leading-7 text-muted">
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">General support</h2>
          <p>
            Email: <a className="text-mint hover:text-mint-dim" href="mailto:support@mirofish.us">support@mirofish.us</a>
          </p>
          <p>
            We aim to respond to legitimate support and account questions as quickly as possible.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">Topics you can contact us about</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account access and sign-in issues</li>
            <li>Billing, credits, subscriptions, and payment questions</li>
            <li>Privacy, personal data, and policy requests</li>
            <li>Business, media, or partnership inquiries</li>
            <li>Bug reports or platform reliability concerns</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="font-display font-700 text-2xl text-bright">When you write to us</h2>
          <p>
            To help us resolve your request faster, include the email tied to your account, a short description of the issue,
            and any relevant screenshots, report titles, or transaction details.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
