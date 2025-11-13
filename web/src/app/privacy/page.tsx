// src/app/privacy/page.tsx
"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Background effects from existing design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
        >
          <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Last Updated: {new Date().toLocaleDateString()}</h2>
              <p className="text-gray-300">
                This Privacy Policy explains how KamiContent ("we", "us", or "our") collects, uses, and protects your personal data when you use our service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">1. Data We Collect Through Patreon OAuth</h3>
              <p className="text-gray-300 mb-2">When you log in via Patreon, we receive:</p>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li>Your Patreon user ID and email address</li>
                <li>Your membership status and tier information</li>
                <li>Your Patreon display name and profile picture</li>
                <li>Campaign membership details</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">2. Additional Data We Collect</h3>
              <p className="text-gray-300 mb-2">With your consent, we also collect:</p>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li><strong>Usage Data:</strong> Content views, download history, and interaction timestamps</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and device information</li>
                <li><strong>Communication Data:</strong> Messages sent through our platform</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">3. How We Use Your Data</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li>Verify your Patreon membership status</li>
                <li>Provide access to tier-appropriate content</li>
                <li>Improve service performance and user experience</li>
                <li>Prevent unauthorized access and protect content</li>
                <li>Communicate service updates (with consent)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">4. Data Retention</h3>
              <p className="text-gray-300">
                We retain your data for as long as you maintain an active Patreon membership. Activity logs are automatically deleted after 90 days. 
                You can request immediate deletion at any time.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">5. Your Rights (GDPR/CCPA)</h3>
              <p className="text-gray-300 mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate data</li>
                <li><strong>Erasure:</strong> Delete your account and associated data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Object:</strong> Opt-out of specific data processing</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">6. Data Security</h3>
              <p className="text-gray-300">
                We implement industry-standard security measures including encryption, secure storage, and access controls. 
                Content is protected using Cloudflare R2 with signed URLs.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">7. Third-Party Services</h3>
              <ul className="list-disc pl-6 text-gray-300 space-y-1">
                <li><strong>Patreon:</strong> Authentication and membership verification</li>
                <li><strong>Cloudflare:</strong> Content delivery and security</li>
                <li><strong>Supabase:</strong> Database services (SOC2 compliant)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">8. Age Restrictions</h3>
              <p className="text-gray-300">
                Our service is restricted to users 18 years or older. By using our service, you confirm you meet this age requirement.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-2">9. Contact Information</h3>
              <p className="text-gray-300">
                For privacy-related requests or questions:<br />
                Email: privacy@kamicontent.com<br />
                Response time: Within 30 days
              </p>
            </section>

            <section className="pt-6 border-t border-white/10">
              <Link 
                href="/privacy/manage"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Manage Your Privacy Settings
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
