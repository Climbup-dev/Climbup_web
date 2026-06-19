"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import AuthModal from "@/components/AuthModal";
import Footer from "@/components/Footer";

const features = [
  {
    icon: "book",
    title: "Structured Courses",
    body: "Topic-wise, semester-aligned syllabi curated by IIT/NIT alumni.",
  },
  {
    icon: "database",
    title: "PYQ Question Bank",
    body: "10+ years of university and GATE papers with AI-powered solutions.",
  },
  {
    icon: "video",
    title: "Live Doubt Sessions",
    body: "Book 1-on-1 slots with mentors. Real humans, not chatbots.",
  },
  {
    icon: "briefcase",
    title: "Placement Prep",
    body: "DSA sheets, mock interviews, resume reviews, end-to-end.",
  },
  {
    icon: "download",
    title: "Offline Access",
    body: "Download lessons. Study on trains, in hostels, no Wi-Fi needed.",
  },
  {
    icon: "chart",
    title: "Progress Tracking",
    body: "Streak system, chapter completion rings, weekly performance digest.",
  },
];

const courses = [
  ["Data Structures & Algorithms", "BESTSELLER", "Aarav Mehta", "4.8", "2,100"],
  ["GATE CS 2025", "NEW", "Neha Iyer", "4.9", "1,640"],
  ["Full Stack Web Dev", "BESTSELLER", "Kabir Rao", "4.8", "2,860"],
  ["VLSI Design Fundamentals", "NEW", "Meera Shah", "4.7", "980"],
];

const testimonials = [
  {
    quote:
      "The PYQ bank helped me spot repeat patterns before midsems. I stopped guessing what mattered and started revising with intent.",
    name: "Priya Sharma",
    college: "NIT Nagpur",
  },
  {
    quote:
      "Live mentors made the difference. I could bring a messy DSA doubt and leave with a clean way to think through it.",
    name: "Rohan Verma",
    college: "COEP Pune",
  },
  {
    quote:
      "Placement prep felt practical, especially the resume reviews and mock interview drills. It gave me a routine I could trust.",
    name: "Aditi Nair",
    college: "VJTI Mumbai",
  },
];

const plans = [
  {
    name: "Free",
    price: "INR 0",
    cta: "Get Started",
    accent: "ghost",
    features: [
      ["PYQ bank access", true],
      ["3 course previews", true],
      ["Community answers", true],
      ["Live mentor slots", false],
    ],
  },
  {
    name: "Pro",
    price: "INR 499",
    cta: "Upgrade to Pro",
    accent: "popular",
    features: [
      ["All courses unlocked", true],
      ["Weekly live sessions", true],
      ["Offline downloads", true],
      ["Progress digest", true],
    ],
  },
  {
    name: "Placement Pack",
    price: "INR 999",
    cta: "Go All-In",
    accent: "warm",
    features: [
      ["Everything in Pro", true],
      ["Mock interviews", true],
      ["Resume reviews", true],
      ["Placement guarantee", false],
    ],
  },
];

const faqs = [
  [
    "Is there a free plan available?",
    "Yes. The free plan includes PYQ browsing, limited course previews, and community answers so you can try the workflow before upgrading.",
  ],
  [
    "Do I get lifetime access after purchasing?",
    "Paid course purchases include lifetime access to recorded lessons and downloadable notes for that course. Live mentor sessions follow the active plan period.",
  ],
  [
    "Are the courses aligned with university syllabi?",
    "Courses are mapped topic-wise to common B.Tech semester syllabi, with GATE and university PYQs tagged separately for faster revision.",
  ],
  [
    "How do live doubt sessions work?",
    "You can book 1-on-1 slots from the mentor calendar, upload your question or code beforehand, and join the session from your dashboard.",
  ],
  [
    "Can I download content for offline use?",
    "Yes. Pro users can download lesson notes as PDFs and selected recorded lectures for offline viewing in the ClimbUP app.",
  ],
  [
    "Do you offer placement guarantees?",
    "We do not guarantee a job. The Placement Pack provides structured prep, mock interviews, and resume support to improve readiness.",
  ],
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<string, ReactNode> = {
    book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16" />,
    database: (
      <>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
    video: <path d="M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4zM17 10l4-2v8l-4-2" />,
    briefcase: <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M4 7h16v12H4zM4 12h16" />,
    download: <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14" />,
    chart: <path d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function ProgressArc() {
  return (
    <div className="ls-arc" aria-label="94 percent placement rate">
      <svg viewBox="0 0 240 240">
        <circle className="ls-arc-track" cx="120" cy="120" r="96" />
        <circle className="ls-arc-progress" cx="120" cy="120" r="96" />
      </svg>
      <div className="ls-arc-center">
        <strong>94%</strong>
        <span>Placement Rate</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const logos = ["IIT Delhi", "NIT Nagpur", "Infosys", "TCS", "Wipro", "Amazon", "Capgemini", "L&T"];

  return (
    <main className="learnsphere-page">
      <section className="ls-hero" id="courses">
        <div className="ls-bg-grid" />
        <div className="ls-container ls-hero-grid">
          <div className="ls-hero-copy">
            <p className="ls-eyebrow">{"// trusted by 40,000+ students"}</p>
            <h1>Master Engineering. Land Your Dream Job.</h1>
            <p className="ls-hero-sub">
              Structured courses, live doubt sessions, and India&apos;s largest PYQ bank built for B.Tech
              students who mean business.
            </p>
            <div className="ls-actions">
              <button className="ls-btn ls-btn-primary" onClick={() => setAuthOpen(true)}>
                Start for Free <span aria-hidden>{"->"}</span>
              </button>
              <a className="ls-btn ls-btn-glass" href="#popular-courses">
                <span className="ls-play" aria-hidden />
                Watch Demo
              </a>
            </div>
            <div className="ls-trust">
              {["No credit card", "500+ courses", "Live mentors"].map((item) => (
                <span key={item}>
                  <b aria-hidden>OK</b>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="ls-hero-visual">
            <div className="ls-arc-panel">
              <ProgressArc />
              <div className="ls-stat-chip chip-a">12,400+ Jobs Placed</div>
              <div className="ls-stat-chip chip-b">4.9* Avg Rating</div>
              <div className="ls-stat-chip chip-c">98 Live Sessions/Month</div>
            </div>
          </div>
        </div>
      </section>

      <section className="ls-ticker" aria-label="Trusted partners and colleges">
        <div className="ls-ticker-track">
          {[...logos, ...logos].map((logo, index) => (
            <span key={`${logo}-${index}`}>{logo}</span>
          ))}
        </div>
      </section>

      <section className="ls-section" id="features">
        <div className="ls-container">
          <h2 className="ls-section-title">Everything You Need to Clear Exams & Get Hired</h2>
          <div className="ls-feature-grid">
            {features.map((feature) => (
              <article className="ls-glass-card ls-feature-card" key={feature.title}>
                <div className="ls-icon-box">
                  <Icon name={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ls-section" id="popular-courses">
        <div className="ls-container">
          <h2 className="ls-section-title">Popular Courses</h2>
          <div className="ls-course-row">
            {courses.map(([title, badge, instructor, rating, enrolled]) => (
              <article className="ls-glass-card ls-course-card" key={title}>
                <div className="ls-course-thumb">
                  <Icon name={title.includes("Web") ? "chart" : title.includes("VLSI") ? "database" : "book"} />
                  <span>{badge}</span>
                </div>
                <div className="ls-course-body">
                  <h3>{title}</h3>
                  <div className="ls-instructor">
                    <div aria-hidden />
                    <span>{instructor}</span>
                  </div>
                  <p className="ls-rating">***** <span>{rating} / {enrolled} enrolled</span></p>
                  <div className="ls-price">
                    <strong>INR 999</strong>
                    <del>INR 2,499</del>
                    <a href="#pricing">Free Trial</a>
                  </div>
                  <button className="ls-btn ls-btn-primary">Enroll Now</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ls-section">
        <div className="ls-container">
          <h2 className="ls-section-title">What Students Are Saying</h2>
          <div className="ls-testimonial-grid">
            {testimonials.map((student) => (
              <article className="ls-glass-card ls-testimonial" key={student.name}>
                <p>{student.quote}</p>
                <div className="ls-card-divider" />
                <footer>
                  <div className="ls-avatar" aria-hidden>{student.name[0]}</div>
                  <div>
                    <strong>{student.name}</strong>
                    <span>{student.college}</span>
                  </div>
                  <b>*****</b>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ls-stats-band">
        <div className="ls-container ls-stats-grid">
          {[
            ["40,000+", "Students"],
            ["500+", "Courses"],
            ["98%", "Satisfaction"],
            ["6 LPA", "Avg Package"],
          ].map(([number, label]) => (
            <div className="ls-stat" key={label}>
              <strong>{number}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ls-section" id="pricing">
        <div className="ls-container">
          <h2 className="ls-section-title">Simple, Student-Friendly Pricing</h2>
          <div className="ls-pricing-grid">
            {plans.map((plan) => (
              <article className={`ls-glass-card ls-plan ls-plan-${plan.accent}`} key={plan.name}>
                {plan.accent === "popular" && <span className="ls-popular">Most Popular</span>}
                <h3>{plan.name}</h3>
                <p className="ls-plan-price">{plan.price}<span>/mo</span></p>
                <div className="ls-card-divider" />
                <ul>
                  {plan.features.map(([label, included]) => (
                    <li className={included ? "" : "muted"} key={label as string}>
                      <span aria-hidden>{included ? "OK" : "x"}</span>
                      {label}
                    </li>
                  ))}
                </ul>
                <button className={`ls-btn ${plan.accent === "ghost" ? "ls-btn-ghost" : plan.accent === "warm" ? "ls-btn-warm" : "ls-btn-primary"}`}>
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ls-section" id="faq">
        <div className="ls-container ls-faq-wrap">
          <h2 className="ls-section-title">Got Questions?</h2>
          {faqs.map(([question, answer], index) => (
            <article className={`ls-faq ${openFaq === index ? "open" : ""}`} key={question}>
              <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                <span>{question}</span>
                <b aria-hidden>+</b>
              </button>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ls-final-cta">
        <div className="ls-final-panel">
          <h2>Ready to study with a system that keeps up?</h2>
          <p>Join ClimbUP and turn exam prep, skill building, and placement readiness into one focused routine.</p>
          <button className="ls-btn ls-btn-invert" onClick={() => setAuthOpen(true)}>
            Start for Free - No Card Needed
          </button>
        </div>
      </section>

      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
