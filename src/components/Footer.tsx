"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="ls-footer" id="placement">
      <div className="ls-container ls-footer-grid">
        <div>
          <Link className="ls-wordmark" href="/">
            <span />
            ClimbUP
          </Link>
          <p>
            Engineering prep that connects papers, courses, mentors, and placement practice.
          </p>
          <div className="ls-socials" aria-label="Social links">
            {["X", "in", "YT", "IG"].map((item) => (
              <a key={item} href="#">
                {item}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3>Courses</h3>
          {["DSA", "GATE", "Web Dev", "VLSI", "Placement Prep"].map((item) => (
            <a key={item} href="#courses">
              {item}
            </a>
          ))}
        </div>
        <div>
          <h3>Company</h3>
          {["About", "Careers", "Blog", "Contact"].map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
        </div>
        <div>
          <h3>Connect</h3>
          <form className="ls-subscribe" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email address" aria-label="Email address" />
            <button className="ls-btn ls-btn-primary" type="submit">
              Subscribe
            </button>
          </form>
        </div>
      </div>
      <div className="ls-footer-bottom">
        Copyright 2026 ClimbUP / Privacy Policy / Terms of Service
      </div>
    </footer>
  );
}
