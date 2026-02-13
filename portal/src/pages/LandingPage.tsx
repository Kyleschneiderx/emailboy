import { useState, useEffect, useRef } from 'react';

// Floating email particle component
function FloatingEmail({ delay, duration, left, size }: { delay: number; duration: number; left: string; size: number }) {
  return (
    <div
      className="absolute pointer-events-none opacity-20"
      style={{
        left,
        bottom: '-20px',
        animation: `float ${duration}s ease-in-out ${delay}s infinite`,
        fontSize: size,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-coral" style={{ width: size, height: size }}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 6l-10 7L2 6" />
      </svg>
    </div>
  );
}

// Animated counter
function Counter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// FAQ Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-text-primary group-hover:text-coral transition-colors">
          {question}
        </span>
        <span className={`text-coral transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'}`}
      >
        <p className="text-text-secondary leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetExtension = () => {
    // TODO: Replace with actual Chrome Web Store URL
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  const handleStartTrial = () => {
    window.location.href = '/?signup=true';
  };

  return (
    <div className="min-h-screen bg-void text-text-primary overflow-x-hidden">
      {/* Grain overlay */}
      <div className="grain" />

      {/* Floating background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-coral/5 rounded-full blur-[150px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-azure/5 rounded-full blur-[120px] translate-y-1/2" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald/5 rounded-full blur-[100px] -translate-x-1/2" />
      </div>

      {/* Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'py-3 glass border-b border-white/5' : 'py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral to-coral-light flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">EmailBoy</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-text-secondary hover:text-text-primary transition-colors">FAQ</a>
          </nav>
          <button
            onClick={handleGetExtension}
            className="px-5 py-2.5 bg-coral hover:bg-coral-light text-white text-sm font-semibold rounded-lg transition-all hover:shadow-glow"
          >
            Get Extension
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-32">
        {/* Floating emails animation */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingEmail delay={0} duration={15} left="10%" size={24} />
          <FloatingEmail delay={2} duration={18} left="25%" size={16} />
          <FloatingEmail delay={4} duration={12} left="40%" size={20} />
          <FloatingEmail delay={1} duration={20} left="60%" size={18} />
          <FloatingEmail delay={3} duration={14} left="75%" size={22} />
          <FloatingEmail delay={5} duration={16} left="90%" size={14} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 border border-coral/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            <span className="text-sm text-coral font-medium">Now available for Chrome</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-8 animate-slide-up">
            <span className="block">Capture Every</span>
            <span className="block bg-gradient-to-r from-coral via-coral-light to-amber bg-clip-text text-transparent">
              Email Address
            </span>
            <span className="block">While You Browse</span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl mx-auto text-xl md:text-2xl text-text-secondary mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The invisible assistant that automatically collects email addresses from any webpage.
            Build your contact list effortlessly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={handleGetExtension}
              className="group relative px-8 py-4 bg-coral hover:bg-coral-light text-white font-semibold rounded-xl transition-all hover:shadow-glow hover:-translate-y-0.5 flex items-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="21.17" y1="8" x2="12" y2="8" />
                <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
              </svg>
              Install Free Extension
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald text-void text-xs font-bold rounded-full">FREE</span>
            </button>
            <button
              onClick={handleStartTrial}
              className="px-8 py-4 bg-transparent border border-white/10 hover:border-white/20 text-text-primary font-semibold rounded-xl transition-all hover:bg-white/5 flex items-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Start Premium
            </button>
          </div>

          {/* Social Proof Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-mono text-text-primary">
                <Counter end={50000} suffix="+" />
              </div>
              <div className="text-sm text-text-tertiary mt-1">Emails Captured</div>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-mono text-text-primary">
                <Counter end={2500} suffix="+" />
              </div>
              <div className="text-sm text-text-tertiary mt-1">Active Users</div>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-mono text-coral">4.9</div>
              <div className="text-sm text-text-tertiary mt-1 flex items-center gap-1">
                <span>★★★★★</span> Rating
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-coral text-sm font-semibold tracking-wider uppercase">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Everything You Need to<br />
              <span className="text-coral">Build Your List</span>
            </h2>
            <p className="max-w-2xl mx-auto text-text-secondary text-lg">
              Powerful email capture tools that work silently in the background while you browse.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl bg-slate/50 border border-white/5 hover:border-coral/20 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-coral/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-coral/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-coral">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Auto-Capture</h3>
                <p className="text-text-secondary leading-relaxed">
                  Automatically detects and captures email addresses from any webpage you visit. No manual work required.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl bg-slate/50 border border-white/5 hover:border-coral/20 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-azure/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-azure/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-azure">
                    <path d="M18 10a6.001 6.001 0 00-11.476-1.5A4.502 4.502 0 007.5 17h10a4.5 4.5 0 00.5-8.973z" />
                    <path d="M12 13v5M9 16l3 3 3-3" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Cloud Sync</h3>
                <p className="text-text-secondary leading-relaxed">
                  Your captured emails sync automatically to the cloud. Access them from any device, anytime.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl bg-slate/50 border border-white/5 hover:border-coral/20 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-emerald/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Export to CSV</h3>
                <p className="text-text-secondary leading-relaxed">
                  Export your entire email list to CSV with one click. Perfect for importing into your CRM or email tool.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group relative p-8 rounded-2xl bg-slate/50 border border-white/5 hover:border-coral/20 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-amber/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-Time</h3>
                <p className="text-text-secondary leading-relaxed">
                  See emails appear instantly as you browse. Watch your list grow in real-time through the extension popup.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group relative p-8 rounded-2xl bg-slate/50 border border-white/5 hover:border-coral/20 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-coral/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-coral/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-coral">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
                <p className="text-text-secondary leading-relaxed">
                  Your data is encrypted and never shared. Only you have access to your captured emails.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group relative p-8 rounded-2xl bg-slate/50 border border-white/5 hover:border-coral/20 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-azure/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-azure/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-azure">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Filtering</h3>
                <p className="text-text-secondary leading-relaxed">
                  Automatically filters out fake emails, spam traps, and common placeholders. Only real contacts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-32 bg-obsidian/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-coral text-sm font-semibold tracking-wider uppercase">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Three Simple Steps
            </h2>
            <p className="max-w-2xl mx-auto text-text-secondary text-lg">
              Start building your email list in under 60 seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Step 1 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-coral to-coral-light text-white text-3xl font-bold mb-8 shadow-glow">
                1
              </div>
              <h3 className="text-2xl font-semibold mb-4">Install Extension</h3>
              <p className="text-text-secondary leading-relaxed">
                Add EmailBoy to Chrome with one click. It's free and takes 10 seconds.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-coral/50 to-transparent" />
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-azure to-azure/70 text-white text-3xl font-bold mb-8">
                2
              </div>
              <h3 className="text-2xl font-semibold mb-4">Browse Normally</h3>
              <p className="text-text-secondary leading-relaxed">
                Go about your day. EmailBoy quietly captures email addresses in the background.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-azure/50 to-transparent" />
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald to-emerald/70 text-white text-3xl font-bold mb-8">
                3
              </div>
              <h3 className="text-2xl font-semibold mb-4">Export & Use</h3>
              <p className="text-text-secondary leading-relaxed">
                Export your email list or view it in the dashboard. Ready for your campaigns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-coral text-sm font-semibold tracking-wider uppercase">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="max-w-2xl mx-auto text-text-secondary text-lg">
              Start free, upgrade when you're ready to unlock the full power.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="relative p-8 rounded-2xl bg-slate/50 border border-white/5">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-text-secondary">Perfect for getting started</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-text-tertiary">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-text-secondary">
                  <svg className="w-5 h-5 text-emerald flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Install Chrome extension
                </li>
                <li className="flex items-center gap-3 text-text-secondary">
                  <svg className="w-5 h-5 text-emerald flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  View captured emails in popup
                </li>
                <li className="flex items-center gap-3 text-text-tertiary">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  No cloud sync
                </li>
                <li className="flex items-center gap-3 text-text-tertiary">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  No CSV export
                </li>
                <li className="flex items-center gap-3 text-text-tertiary">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  No dashboard access
                </li>
              </ul>
              <button
                onClick={handleGetExtension}
                className="w-full py-4 rounded-xl border border-white/10 hover:border-white/20 text-text-primary font-semibold transition-all hover:bg-white/5"
              >
                Install Free
              </button>
            </div>

            {/* Premium Plan */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate to-obsidian border border-coral/30 shadow-glow">
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-coral text-white text-sm font-semibold rounded-full">
                Most Popular
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <p className="text-text-secondary">For serious lead generation</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold">$9.99</span>
                <span className="text-text-tertiary">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-text-secondary">
                  <svg className="w-5 h-5 text-emerald flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Everything in Free
                </li>
                <li className="flex items-center gap-3 text-text-primary">
                  <svg className="w-5 h-5 text-coral flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <strong>Automatic email capture</strong>
                </li>
                <li className="flex items-center gap-3 text-text-primary">
                  <svg className="w-5 h-5 text-coral flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <strong>Unlimited cloud sync</strong>
                </li>
                <li className="flex items-center gap-3 text-text-primary">
                  <svg className="w-5 h-5 text-coral flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <strong>CSV export</strong>
                </li>
                <li className="flex items-center gap-3 text-text-primary">
                  <svg className="w-5 h-5 text-coral flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <strong>Full dashboard access</strong>
                </li>
              </ul>
              <button
                onClick={handleStartTrial}
                className="w-full py-4 rounded-xl bg-coral hover:bg-coral-light text-white font-semibold transition-all hover:shadow-glow"
              >
                Start Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-32 bg-obsidian/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-coral text-sm font-semibold tracking-wider uppercase">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
              Loved by Marketers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-2xl bg-slate/50 border border-white/5">
              <div className="flex items-center gap-1 text-amber mb-4">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-text-secondary leading-relaxed mb-6">
                "EmailBoy has completely changed how I build my prospect lists. I've captured over 5,000 emails in just 3 months of normal browsing."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral to-amber flex items-center justify-center text-white font-bold">
                  MK
                </div>
                <div>
                  <div className="font-semibold">Marcus K.</div>
                  <div className="text-sm text-text-tertiary">Sales Manager</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 rounded-2xl bg-slate/50 border border-white/5">
              <div className="flex items-center gap-1 text-amber mb-4">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-text-secondary leading-relaxed mb-6">
                "The cloud sync feature is a game-changer. I can capture emails on my work laptop and access them from home. Seamless experience."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-azure to-emerald flex items-center justify-center text-white font-bold">
                  SL
                </div>
                <div>
                  <div className="font-semibold">Sarah L.</div>
                  <div className="text-sm text-text-tertiary">Recruiter</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-8 rounded-2xl bg-slate/50 border border-white/5">
              <div className="flex items-center gap-1 text-amber mb-4">
                {'★★★★★'.split('').map((star, i) => <span key={i}>{star}</span>)}
              </div>
              <p className="text-text-secondary leading-relaxed mb-6">
                "Best ROI on any tool I've purchased. $9.99/month to automatically build a contact list? It pays for itself in the first day."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald to-azure flex items-center justify-center text-white font-bold">
                  JT
                </div>
                <div>
                  <div className="font-semibold">James T.</div>
                  <div className="text-sm text-text-tertiary">Freelance Consultant</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative py-32">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-coral text-sm font-semibold tracking-wider uppercase">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Common Questions
            </h2>
          </div>

          <div>
            <FAQItem
              question="Is EmailBoy really free to install?"
              answer="Yes! The Chrome extension is completely free to install and use. The free version lets you see captured emails in the popup. Premium unlocks automatic capture, cloud sync, CSV export, and the full dashboard."
            />
            <FAQItem
              question="How does the email capture work?"
              answer="EmailBoy scans the text content of webpages you visit and identifies email addresses using pattern matching. It filters out fake/placeholder emails and stores real ones. All processing happens locally in your browser."
            />
            <FAQItem
              question="Is this legal and ethical?"
              answer="EmailBoy only captures publicly visible email addresses from webpages. It's similar to manually copying emails you see while browsing. You're responsible for using collected emails in compliance with applicable laws like GDPR and CAN-SPAM."
            />
            <FAQItem
              question="Can I cancel my Premium subscription?"
              answer="Yes, you can cancel anytime from your dashboard. Your Premium features will remain active until the end of your billing period. No questions asked, no hidden fees."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely. Your emails are stored securely in the cloud with encryption. We never share, sell, or access your captured email data. You have full control and can delete everything at any time."
            />
            <FAQItem
              question="Does it work on all websites?"
              answer="EmailBoy works on virtually all websites. Some sites with heavy JavaScript may take a moment longer to scan. The extension is designed to be lightweight and won't slow down your browsing."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to Build Your<br />
            <span className="text-coral">Email Empire?</span>
          </h2>
          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
            Join thousands of marketers who are capturing emails effortlessly.
            Start free today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetExtension}
              className="px-10 py-5 bg-coral hover:bg-coral-light text-white text-lg font-semibold rounded-xl transition-all hover:shadow-glow hover:-translate-y-0.5 flex items-center gap-3"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="21.17" y1="8" x2="12" y2="8" />
                <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
              </svg>
              Get EmailBoy Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-coral-light flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
              </div>
              <span className="font-bold">EmailBoy</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-text-tertiary">
              <a href="#" className="hover:text-text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
            </div>
            <div className="text-sm text-text-tertiary">
              © 2024 EmailBoy. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.2;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
