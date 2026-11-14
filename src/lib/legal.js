// The agreements shown at sign-up. Version must match TERMS_VERSION in server/index.js.
// Blocks: a string is a paragraph, { sub } a sub-heading, { list } a bullet list.
export const LEGAL_VERSION = '2026-11-13'
// The only address shown to users. Owner addresses are deployment settings on
// the account service and never appear in the app.
export const SUPPORT_EMAIL = 'lumasupport@tidio.xyz'

export const TERMS = {
  title: 'Terms and Conditions',
  subtitle: 'Terms and Conditions, End User License Agreement, and Refund Policy',
  meta: [
    'Effective date: November 13, 2026',
    'Provider: Luma Official',
    'Product: Luma AdBlock Beta Opera browser extension',
    'Contact: ' + SUPPORT_EMAIL,
  ],
  intro:
    'Important: Luma AdBlock Beta is experimental beta software. By creating an account and accepting these Terms and the Privacy Policy, you acknowledge that the extension may contain bugs, errors, compatibility issues, incomplete features, and unexpected behavior.',
  sections: [
    {
      title: '1. Acceptance of These Terms',
      blocks: [
        'These Terms and Conditions, including the End User License Agreement and Refund Policy below, govern your access to and use of Luma AdBlock Beta.',
        'You may download the extension before accepting these Terms. However, after installation, you must create an account and accept these Terms and the Luma AdBlock Beta Privacy Policy before using the extension or accessing its features.',
        'By creating an account, selecting an acceptance checkbox, clicking an acceptance button, or using the extension after accepting these Terms, you agree to be legally bound by them.',
        'If you do not agree to these Terms or the Privacy Policy, you may not use Luma AdBlock Beta.',
        'If you are under the age required to enter a binding agreement where you live, you may use Luma AdBlock Beta only with permission and supervision from a parent or legal guardian where required by law.',
      ],
    },
    {
      title: '2. Beta Software Acknowledgment',
      blocks: [
        'Luma AdBlock Beta is provided for testing, evaluation, feedback, and development purposes.',
        'You understand and agree that:',
        {
          list: [
            'The extension may not function correctly.',
            'Features may be incomplete, changed, removed, suspended, or discontinued.',
            'The extension may conflict with websites, browser features, other extensions, security software, or device settings.',
            'Updates may be automatic or required for continued use.',
            'Luma Official may discontinue the beta without compensation.',
            'You should not rely on the extension for security-critical, business-critical, financial, medical, educational, or other high-risk activities.',
            'You should maintain alternative access methods and backups where appropriate.',
          ],
        },
        'By accepting these Terms, you specifically acknowledge that Luma AdBlock Beta is beta software.',
      ],
    },
    {
      title: '3. Description of the Extension',
      blocks: [
        'Luma AdBlock Beta is an Opera browser extension designed to block or limit advertisements, trackers, scripts, pop-ups, page elements, network requests, and other unwanted content according to its filters, settings, allowlists, and related functionality.',
        'The extension may not block every advertisement, tracker, script, pop-up, or unwanted element. It may also block content that you intended to access or cause a website to function incorrectly.',
        'Luma Official does not guarantee that Luma AdBlock Beta will work with every website, browser version, device, operating system, network, or web application.',
        'If a website does not work correctly, you should disable the extension for that website, use an allowlist feature if available, or stop using the extension.',
      ],
    },
    {
      title: '4. Account Creation and Use',
      blocks: [
        'An account is required to use Luma AdBlock Beta after installation.',
        'You agree to:',
        {
          list: [
            'Provide accurate information when creating your account.',
            'Keep your account information reasonably current.',
            'Keep your login credentials secure.',
            'Notify Luma Official if you believe your account has been compromised.',
            'Use only your own account or an account you are authorized to use.',
            'Accept the Terms and Privacy Policy before using the extension’s functionality.',
          ],
        },
        'You are responsible for activity conducted through your account unless applicable law provides otherwise.',
      ],
    },
    {
      title: '5. End User License Agreement',
      blocks: [
        { sub: '5.1 License Grant' },
        'Subject to your compliance with these Terms, Luma Official grants you a limited, personal, non-exclusive, non-transferable, revocable license to install and use one copy of Luma AdBlock Beta on an Opera browser that you own or are authorized to control.',
        'This license is granted only for the duration that Luma AdBlock Beta is made available and your account remains authorized to use it.',
        { sub: '5.2 Personal and Authorized Business Use' },
        'Luma AdBlock Beta may be used for personal purposes.',
        'It may also be used for business purposes only if the business first contacts Luma Official and receives written authorization.',
        'Written authorization may include an email or other written approval from an authorized Luma Official representative. Authorization may be limited by user count, device count, organization, duration, or other conditions.',
        { sub: '5.3 Prohibited Modification and Misuse' },
        'You may not, in any way:',
        {
          list: [
            'Modify, alter, adapt, translate, or create derivative works from the extension.',
            'Reverse engineer, decompile, disassemble, decrypt, or attempt to discover its source code.',
            'Remove, obscure, or alter copyright, trademark, license, or ownership notices.',
            'Repackage, redistribute, resell, sublicense, lease, rent, or transfer the extension.',
            'Copy the extension except where copying is technically necessary for an authorized installation.',
            'Circumvent authentication, access controls, security measures, usage restrictions, or update requirements.',
            'Use the extension to attack, overload, disrupt, damage, monitor, or interfere with systems, networks, websites, browsers, or third-party services.',
            'Inject malicious, deceptive, harmful, or unauthorized filters or code.',
            'Use automated methods to abuse or overload Luma Official’s systems.',
            'Use the extension to violate applicable law, third-party rights, browser policies, or website terms.',
            'Use Luma branding or materials in a way that suggests Opera created, sponsors, endorses, or operates the extension.',
          ],
        },
        'Nothing in this section prohibits activity that applicable law expressly allows and that cannot legally be restricted by contract.',
        { sub: '5.4 Ownership' },
        'Luma Official and its licensors retain all rights, title, and interest in and to Luma AdBlock Beta, including its software, design, branding, documentation, filter engine, configuration systems, and related materials.',
        'These Terms grant a license only. They do not sell or transfer ownership of the extension or its intellectual property.',
      ],
    },
    {
      title: '6. Opera Add-ons and Browser-Platform Compliance',
      blocks: [
        'Luma Official intends for Luma AdBlock Beta to comply with applicable Opera Add-ons requirements. Opera may independently review, reject, restrict, remove, or require changes to the extension.',
        'Opera’s applicable terms, policies, review decisions, and platform requirements control the extension’s availability through Opera Add-ons. If these Terms conflict with applicable Opera terms or requirements, the Opera terms or requirements control to the extent of the conflict.',
        'Luma Official does not claim that Opera created, sponsors, endorses, or is affiliated with Luma AdBlock Beta.',
        'Luma Official may update the extension, its permissions, its listing, its code, or its functionality when necessary to comply with Opera requirements, security needs, or technical changes.',
      ],
    },
    {
      title: '7. Permissions and Extension Behavior',
      blocks: [
        'Luma AdBlock Beta may request permissions that are necessary for its stated functionality, including permissions related to website content, network requests, browser tabs, storage, filters, updates, or other extension operations.',
        'The actual permissions requested are determined by the extension’s manifest and the permissions shown by Opera or the browser during installation or use.',
        'You should review the permission notices before installing or continuing to use the extension.',
        'Luma Official will not intentionally request permissions that are unrelated to the extension’s stated purpose. Permissions may change when features, security requirements, browser APIs, or Opera requirements change.',
      ],
    },
    {
      title: '8. Data Collection and Privacy',
      blocks: [
        'Luma AdBlock Beta may collect usage data, error reports, and performance information.',
        'The extension may also connect to third-party services when reasonably necessary for filters, updates, authentication, error reporting, performance monitoring, hosting, security, or operation.',
        'The Luma AdBlock Beta Privacy Policy explains:',
        {
          list: [
            'What information is collected.',
            'Why information is collected.',
            'Whether information is stored locally or transmitted.',
            'Which third parties may process information.',
            'How information is retained.',
            'How users may request account or data deletion.',
            'How users may contact Luma Official.',
          ],
        },
        'You must accept the Privacy Policy before using Luma AdBlock Beta.',
        'Luma Official will not intentionally collect or transmit private information beyond what is described in the Privacy Policy and the extension’s permission disclosures, except where required to comply with law, protect users, investigate abuse, or protect the Service.',
      ],
    },
    {
      title: '9. Third-Party Services and Websites',
      blocks: [
        'Luma AdBlock Beta may interact with third-party websites, filter providers, hosting providers, update services, analytics providers, authentication services, Opera services, or other third-party systems.',
        'Luma Official does not control third-party services and is not responsible for:',
        {
          list: [
            'Their content or availability.',
            'Their security or privacy practices.',
            'Their terms or policy changes.',
            'Website breakage or loss of functionality caused by blocking.',
            'Changes to websites, browser APIs, filters, or third-party systems.',
            'Actions taken by third-party service providers.',
          ],
        },
        'You remain responsible for complying with the terms and policies of websites and services you access.',
      ],
    },
    {
      title: '10. Updates',
      blocks: [
        'Luma Official may provide automatic updates or require updates for continued access.',
        'Updates may include bug fixes, security patches, filter changes, performance changes, feature changes, permission changes, or compatibility changes.',
        'You may not disable, circumvent, delay, or interfere with required security or operational updates.',
        'Luma Official does not guarantee that an update will preserve every prior feature or setting.',
      ],
    },
    {
      title: '11. Bug Reports, Feedback, and Discretionary Rewards',
      blocks: [
        'You may report bugs, security issues, suggestions, or other feedback by emailing: ' + SUPPORT_EMAIL,
        'Luma Official may use, reproduce, modify, publish, distribute, or incorporate submitted feedback without payment, attribution, or an obligation to use it.',
        'Luma Official may, at its discretion, offer compensation or rewards for verified bug reports. No reward is guaranteed. Luma Official may determine eligibility, amount, timing, method, and conditions for any reward.',
        'A bug report does not create a contract, payment obligation, employment relationship, partnership, or promise of compensation.',
        'Do not submit confidential information, personal information belonging to another person, credentials, authentication codes, or information you are not authorized to disclose.',
      ],
    },
    {
      title: '12. Suspension and Termination',
      blocks: [
        'Luma Official may suspend, restrict, or terminate your account, license, or access to Luma AdBlock Beta at its discretion if it believes you:',
        {
          list: [
            'Violated these Terms or the Privacy Policy.',
            'Misused the extension.',
            'Created a security, privacy, safety, or operational risk.',
            'Attacked, disrupted, or interfered with the extension or related systems.',
            'Used the extension unlawfully.',
            'Used unauthorized modifications, code, filters, or versions.',
            'Engaged in fraud, abuse, bot activity, or deceptive conduct.',
            'Used the extension without required business authorization.',
          ],
        },
        'Luma Official typically may issue a warning before taking action, but it is not required to do so. For serious violations, security risks, harmful conduct, or legal concerns, Luma Official may immediately terminate access.',
        'Luma Official may also suspend or terminate access when necessary to comply with Opera requirements, legal obligations, security needs, or technical limitations.',
        'You may stop using the extension at any time by uninstalling it and emailing Luma Official if you want your account deleted.',
      ],
    },
    {
      title: '13. Account Deletion',
      blocks: [
        'You may request deletion of your Luma AdBlock Beta account by emailing: ' + SUPPORT_EMAIL,
        'Your request should include enough information for Luma Official to identify the account. Do not include your password, full payment-card number, authentication code, or other unnecessary sensitive information.',
        'Some information may be retained when required by law, needed for security, necessary to resolve disputes, or reasonably required for legitimate business records, as explained in the Privacy Policy.',
      ],
    },
    {
      title: '14. Limited Warranty',
      blocks: [
        'Luma Official provides a limited warranty that Luma AdBlock Beta will generally function substantially as described in its current official documentation during the period it is made available.',
        'This limited warranty does not guarantee that:',
        {
          list: [
            'The extension will work without interruption or errors.',
            'Every website or browser feature will remain compatible.',
            'Every advertisement, tracker, script, or pop-up will be blocked.',
            'Website functionality will be preserved.',
            'The extension will be available forever.',
            'The extension will be free from security vulnerabilities.',
            'The extension will meet your specific requirements.',
            'The extension will work with unauthorized modifications or unsupported environments.',
          ],
        },
        'If Luma AdBlock Beta materially fails to function as described, Luma Official may, at its discretion, provide support, issue an update, restore functionality, or discontinue the affected feature.',
        'This limited warranty does not apply to problems caused by third-party websites, browser changes, operating-system changes, network issues, user settings, unauthorized modifications, incompatible software, or misuse.',
        'To the maximum extent permitted by law, this limited warranty is the only warranty provided by Luma Official for Luma AdBlock Beta.',
      ],
    },
    {
      title: '15. Disclaimers',
      blocks: [
        'Except for the limited warranty expressly stated above, Luma AdBlock Beta is provided “as is” and “as available.”',
        'To the maximum extent permitted by law, Luma Official disclaims all other express, implied, and statutory warranties, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, reliability, availability, security, and uninterrupted or error-free operation.',
        'Luma Official does not warrant that the extension will:',
        {
          list: [
            'Block all advertisements or tracking technologies.',
            'Protect against all privacy or security risks.',
            'Prevent malicious websites, downloads, scams, or harmful content.',
            'Operate with every website, browser, device, operating system, or network.',
            'Preserve all website functionality.',
            'Remain available or supported for any particular period.',
          ],
        },
        'Some jurisdictions do not allow certain warranty exclusions. Those exclusions apply only to the maximum extent permitted by applicable law.',
      ],
    },
    {
      title: '16. No-Charge Policy and Refund Policy',
      blocks: [
        { sub: '16.1 No Charges' },
        'Luma AdBlock Beta is provided without charges, subscription fees, license fees, or required payments unless Luma Official clearly states otherwise in a separate written offer.',
        'Luma Official does not currently charge users for access to Luma AdBlock Beta.',
        { sub: '16.2 No Standard Refunds' },
        'Because Luma AdBlock Beta is provided free of charge, there are normally no payments to refund.',
        'No user is entitled to a refund, credit, compensation, or payment merely because:',
        {
          list: [
            'The beta contains bugs.',
            'The extension does not work with a website.',
            'A feature is changed or removed.',
            'The beta is discontinued.',
            'The user stops using the extension.',
            'The user’s browser, device, or operating system changes.',
          ],
        },
        'This section does not limit rights that cannot legally be waived.',
        { sub: '16.3 Incorrect or Unauthorized Charges' },
        'If Luma Official or an authorized payment provider ever charges you by mistake, charges you without authorization, or charges you contrary to a written offer, contact: ' + SUPPORT_EMAIL,
        'Include the transaction date, amount, receipt or transaction identifier, account email, and a brief explanation. Do not send full payment-card numbers, passwords, or authentication codes.',
        'Luma Official may investigate and, where appropriate, refund an incorrect or unauthorized charge through the original payment method or another lawful method.',
        { sub: '16.4 Discretionary Compensation' },
        'Any bug-report reward, goodwill payment, refund, credit, or other payment provided voluntarily by Luma Official does not create a continuing obligation to provide similar payments in the future.',
      ],
    },
    {
      title: '17. Limitation of Liability',
      blocks: [
        'To the maximum extent permitted by law, Luma Official, its owners, employees, contractors, affiliates, licensors, service providers, and representatives will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of data, content, revenue, profits, business, access, goodwill, privacy, security, device functionality, or website functionality arising from or related to Luma AdBlock Beta.',
        'Luma Official is not responsible for third-party website issues, browser issues, device issues, operating-system issues, network issues, filter-list errors, blocked content, missing content, broken pages, lost access, or incompatibility caused by the extension or by third parties.',
        'To the maximum extent permitted by law, Luma Official’s total liability for all claims related to Luma AdBlock Beta will not exceed fifty U.S. dollars (US $50).',
        'This limitation does not apply to liability that applicable law prohibits from being limited or excluded.',
      ],
    },
    {
      title: '18. Indemnification',
      blocks: [
        'To the maximum extent permitted by law, you agree to defend, indemnify, and hold harmless Luma Official and its owners, employees, contractors, affiliates, licensors, service providers, and representatives from claims, damages, losses, liabilities, costs, and expenses arising from:',
        {
          list: [
            'Your violation of these Terms or the Privacy Policy.',
            'Your misuse of Luma AdBlock Beta.',
            'Your violation of law or third-party rights.',
            'Your custom settings, filters, rules, or configurations.',
            'Your unauthorized modification, redistribution, or use of the extension.',
            'Your use of the extension for an unauthorized business purpose.',
          ],
        },
      ],
    },
    {
      title: '19. Dispute Resolution',
      blocks: [
        'Before filing a formal legal claim, you must first contact Luma Official at: ' + SUPPORT_EMAIL,
        'Your notice should describe the issue, the relevant facts, and the resolution you are requesting.',
        'The parties must make a good-faith effort to resolve the dispute informally before pursuing formal legal action.',
        'This requirement does not prevent you from using a government agency, consumer-protection process, small-claims procedure, or other legal process when applicable law allows or requires it.',
        'Nothing in these Terms waives rights that cannot legally be waived.',
      ],
    },
    {
      title: '20. Governing Law',
      blocks: [
        'These Terms are governed by applicable United States federal law and the laws of the State of Indiana, without regard to conflict-of-law rules.',
        'Mandatory consumer-protection laws in your place of residence may still apply.',
        'Any court proceeding that is legally permitted after the required informal-resolution process should be brought in a court with appropriate jurisdiction, subject to applicable law.',
      ],
    },
    {
      title: '21. Changes to These Terms',
      blocks: [
        'Luma Official may change, replace, or update these Terms at any time and without advance notice.',
        'The updated version will become effective when posted or made available through the account, extension, website, or another official Luma Official channel.',
        'Your continued use of Luma AdBlock Beta after an updated version becomes available constitutes acceptance of the updated Terms, except where applicable law requires a different form of notice or consent.',
        'If you do not agree to updated Terms, you must stop using the extension and may request account deletion by emailing Luma Official.',
      ],
    },
    {
      title: '22. Severability',
      blocks: [
        'If any provision of these Terms is found invalid, unlawful, or unenforceable, that provision will be enforced to the maximum extent permitted by law, and the remaining provisions will remain in effect.',
      ],
    },
    {
      title: '23. No Waiver',
      blocks: [
        'A failure to enforce any provision of these Terms does not waive Luma Official’s right to enforce that provision later.',
      ],
    },
    {
      title: '24. Assignment',
      blocks: [
        'You may not transfer, assign, or sublicense your rights or obligations under these Terms without written permission from Luma Official.',
        'Luma Official may transfer or assign these Terms in connection with a merger, acquisition, reorganization, sale of assets, financing, corporate restructuring, or similar transaction.',
      ],
    },
    {
      title: '25. Entire Agreement',
      blocks: [
        'These Terms, the Luma AdBlock Beta Privacy Policy, any applicable written authorization for business use, and any other written terms expressly incorporated by Luma Official form the entire agreement concerning Luma AdBlock Beta.',
      ],
    },
    {
      title: '26. Contact',
      blocks: [
        'For support, account deletion, bug reports, legal concerns, privacy questions, or charge disputes, contact: Luma Official, Support email: ' + SUPPORT_EMAIL,
      ],
    },
  ],
}

export const PRIVACY = {
  title: 'Privacy Policy',
  subtitle: 'Luma AdBlock Beta Privacy Policy',
  meta: [
    'Effective date: November 13, 2026',
    'Provider: Luma Official',
    'Product: Luma AdBlock Beta Opera browser extension',
    'Contact: ' + SUPPORT_EMAIL,
  ],
  sections: [
    {
      title: '1. Introduction',
      blocks: [
        'Luma Official (“Luma,” “we,” “us,” or “our”) operates Luma AdBlock Beta, an Opera browser extension designed to block or limit advertisements, trackers, scripts, pop-ups, page elements, network requests, and other unwanted content.',
        'This Privacy Policy explains how we collect, use, store, share, retain, and protect information when you create an account or use Luma AdBlock Beta.',
        'By creating an account and using Luma AdBlock Beta, you acknowledge that you have read and understood this Privacy Policy.',
        'You must accept this Privacy Policy and the Luma AdBlock Beta Terms and Conditions before using the extension’s functionality.',
      ],
    },
    {
      title: '2. Information We Collect',
      blocks: [
        { sub: '2.1 Account Information' },
        'When you create an account, we may collect:',
        {
          list: [
            'Full name.',
            'Age or date of birth.',
            'Email address.',
            'Password.',
            'Phone number.',
            'State of residence.',
          ],
        },
        'We collect this information to create and manage your account, provide the extension, verify account activity, provide support, protect the Service, and meet legal or operational requirements.',
        { sub: '2.2 Extension and Usage Information' },
        'When you use Luma AdBlock Beta, we may collect:',
        {
          list: [
            'Usage information.',
            'Error reports.',
            'Performance information.',
            'Blocked-request statistics.',
            'Information about extension features, settings, updates, and reliability.',
            'Technical information reasonably needed to diagnose bugs, security issues, compatibility problems, or service failures.',
          ],
        },
        'Blocked-request statistics may include information about requests or categories of requests blocked by the extension. We will handle that information according to this Privacy Policy.',
        { sub: '2.3 Cookies and Similar Technologies' },
        'We may use cookies, local storage, pixels, identifiers, logs, and similar technologies for:',
        {
          list: [
            'Account login.',
            'Authentication.',
            'Security.',
            'Fraud prevention.',
            'Abuse detection.',
            'Account preferences.',
            'Analytics.',
            'Performance monitoring.',
            'Service operation.',
            'Remembering settings or session information.',
          ],
        },
        'You may be able to control cookies and similar technologies through your browser or device settings. Disabling certain technologies may affect login, security, preferences, or extension functionality.',
        { sub: '2.4 Location Information' },
        'We collect state of residence as account information.',
        'Luma AdBlock Beta does not collect GPS information or precise location information through the extension.',
      ],
    },
    {
      title: '3. How We Use Information',
      blocks: [
        'We may use collected information for all of the following purposes:',
        {
          list: [
            'Create, authenticate, maintain, and manage user accounts.',
            'Provide, operate, maintain, and improve Luma AdBlock Beta.',
            'Provide customer support.',
            'Respond to questions, bug reports, legal concerns, and other requests.',
            'Detect, investigate, prevent, and address bugs, errors, fraud, abuse, security incidents, and harmful activity.',
            'Monitor reliability, performance, compatibility, and service health.',
            'Develop, test, update, and improve features.',
            'Maintain filters, blocking systems, updates, and extension functionality.',
            'Communicate with users about accounts, security, updates, support, and important changes.',
            'Enforce our Terms and Conditions and other applicable agreements.',
            'Comply with legal obligations, lawful requests, and regulatory requirements.',
            'Protect the rights, property, safety, and security of Luma Official, users, service providers, and other persons.',
            'Support a merger, acquisition, reorganization, financing, sale of assets, transfer to an official Luma platform, or similar business transaction.',
            'Establish, exercise, or defend legal claims.',
          ],
        },
        'We will not use information for purposes that are materially incompatible with this Policy without providing additional notice or obtaining consent when required by law.',
      ],
    },
    {
      title: '4. How We Share Information',
      blocks: [
        'We may share information with the following categories of recipients:',
        { sub: '4.1 Luma Official' },
        'Information may be accessed by Luma Official personnel, contractors, and authorized representatives who need it to operate, support, secure, maintain, or improve Luma AdBlock Beta.',
        { sub: '4.2 Service Providers' },
        'We may share information with service providers that perform services for us, including providers for:',
        {
          list: [
            'Hosting.',
            'Databases.',
            'Authentication.',
            'Account management.',
            'Analytics.',
            'Error reporting.',
            'Performance monitoring.',
            'Security.',
            'Fraud prevention.',
            'Abuse detection.',
            'Customer support.',
            'Communications.',
            'Infrastructure.',
            'Data storage.',
            'Technical operations.',
          ],
        },
        'Service providers may process information only as needed to provide services to us or as otherwise permitted by their agreements and applicable law.',
        { sub: '4.3 Legal and Safety Disclosures' },
        'We may disclose information when we reasonably believe disclosure is necessary to:',
        {
          list: [
            'Comply with a law, regulation, court order, subpoena, or lawful government request.',
            'Protect users, the public, Luma Official, or another person.',
            'Investigate fraud, abuse, security incidents, or unlawful activity.',
            'Enforce our Terms and Conditions or other agreements.',
            'Establish, exercise, or defend legal rights.',
          ],
        },
        { sub: '4.4 Business Transfers' },
        'Information may be transferred as part of a merger, acquisition, reorganization, financing, sale of assets, change in control, or similar business transaction.',
        'Information may also move to an official Luma Official platform or successor service. Any successor organization may use information consistently with this Privacy Policy or a replacement policy provided to users as required by law.',
        { sub: '4.5 With Your Direction' },
        'We may share information when you direct us to do so or provide consent.',
        'We do not sell personal information for money unless we provide legally required notice and rights.',
      ],
    },
    {
      title: '5. Data Storage',
      blocks: [
        'Information collected through Luma AdBlock Beta may be stored on servers operated by Luma Official or its service providers.',
        'Those servers may be located in the United States or other locations where Luma Official or its service providers operate.',
        'By using Luma AdBlock Beta, you understand that information may be transferred, processed, and stored outside your state or country, subject to applicable law.',
      ],
    },
    {
      title: '6. Data Retention',
      blocks: [
        'Luma Official may retain collected information indefinitely.',
        'Information may remain available after an account is closed or after a user stops using Luma AdBlock Beta, including when retention is reasonably necessary for:',
        {
          list: [
            'Legal compliance.',
            'Security.',
            'Fraud prevention.',
            'Abuse detection.',
            'Dispute resolution.',
            'Accounting or recordkeeping.',
            'Enforcing agreements.',
            'Protecting rights and safety.',
            'Maintaining backups.',
            'Supporting the official Luma platform or successor services.',
            'Improving products and services.',
          ],
        },
        'When information is no longer needed for applicable purposes, Luma Official may delete, anonymize, aggregate, or securely dispose of it. We do not guarantee that every copy will be immediately deleted from backups or systems that must be retained for legal, security, or operational reasons.',
      ],
    },
    {
      title: '7. Account Deletion and Privacy Requests',
      blocks: [
        'You may contact Luma Official to request:',
        {
          list: [
            'Access to certain personal information.',
            'Correction of inaccurate information.',
            'Deletion of your account or personal information.',
            'Information about how your information is used.',
            'Withdrawal of consent where applicable.',
            'Other privacy rights available under applicable law.',
          ],
        },
        'Submit requests by email to: ' + SUPPORT_EMAIL,
        'To help us process a request, include the email address associated with your account and a description of your request.',
        'We may need to verify your identity before completing a request. We may deny or limit a request where permitted or required by law, including when retaining information is necessary for security, legal compliance, fraud prevention, dispute resolution, or another lawful purpose.',
      ],
    },
    {
      title: '8. Passwords and Account Security',
      blocks: [
        'You are responsible for keeping your password and account credentials confidential.',
        'Luma Official may use reasonable administrative, technical, and organizational safeguards designed to protect information. However, no system, network, storage method, or transmission method is guaranteed to be completely secure.',
        'You should notify Luma Official at ' + SUPPORT_EMAIL + ' if you believe your account or credentials have been compromised.',
      ],
    },
    {
      title: '9. Children and Age Information',
      blocks: [
        'Luma AdBlock Beta may collect age or date-of-birth information during account creation.',
        'Users may use the extension only when permitted by applicable law. If a user is under the age required to enter a binding agreement, they must have parent or legal-guardian permission where required.',
        'Parents or legal guardians may contact Luma Official at ' + SUPPORT_EMAIL + ' with questions about a minor’s information or to request appropriate action.',
        'We do not knowingly collect personal information from children in violation of applicable law.',
      ],
    },
    {
      title: '10. Third-Party Websites and Services',
      blocks: [
        'Luma AdBlock Beta may connect to third-party services needed for filters, updates, authentication, hosting, analytics, error reporting, security, or operation.',
        'Third-party websites and services have their own privacy policies and terms. Luma Official is not responsible for the privacy, security, content, or practices of third parties.',
        'You should review the policies of third-party services before using them.',
      ],
    },
    {
      title: '11. Opera Platform and Extension Permissions',
      blocks: [
        'Luma AdBlock Beta is intended for use as an Opera browser extension.',
        'The extension may request browser permissions that are necessary for its stated function. The permissions shown by Opera or the browser, together with the extension’s listing and this Privacy Policy, describe the general categories of access the extension may require.',
        'Luma Official will not intentionally collect or transmit private information beyond the purposes disclosed in this Privacy Policy and the extension’s permission disclosures, except as permitted or required by law.',
        'Opera may independently process information under its own policies. Opera’s terms, policies, and platform requirements may apply to your use of Opera and Opera Add-ons.',
      ],
    },
    {
      title: '12. Changes to This Privacy Policy',
      blocks: [
        'Luma Official may change this Privacy Policy at any time and without advance notice.',
        'The updated version will be posted through the extension, account, website, or another official Luma Official channel and will include an updated effective date when appropriate.',
        'Your continued use of Luma AdBlock Beta after an updated Policy becomes available means you acknowledge the updated Policy, except where applicable law requires additional notice or consent.',
        'If you do not agree to an updated Privacy Policy, you must stop using the extension and may request account deletion by emailing ' + SUPPORT_EMAIL + '.',
      ],
    },
    {
      title: '13. Contact Us',
      blocks: [
        'For privacy questions, account-deletion requests, data requests, security concerns, or other privacy matters, contact: Luma Official, Support email: ' + SUPPORT_EMAIL,
      ],
    },
  ],
}
