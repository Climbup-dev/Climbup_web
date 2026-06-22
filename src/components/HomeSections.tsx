import "@/styles/HomeSections.css";

const features = [
  {
    mark: "PYQ",
    title: "PYQ Preparation",
    copy: "Work through previous university questions with clearer context and model answers designed for revision.",
  },
  {
    mark: "Aa",
    title: "Answer Improvement",
    copy: "Create, edit, and refine your own answers so you learn how to explain—not only what to memorize.",
  },
  {
    mark: "IDEA",
    title: "Student Insights",
    copy: "Share memory tricks, useful explanations, interview tips, and real-world examples under relevant questions.",
  },
  {
    mark: "A+R",
    title: "Aptitude Practice",
    copy: "Build consistency across aptitude, reasoning, and verbal ability for placement assessments.",
  },
  {
    mark: "DC",
    title: "Dream Company Preparation",
    copy: "Organize preparation around the skills, technical topics, and interview patterns that matter for your target roles.",
  },
  {
    mark: "TEST",
    title: "Mock Tests",
    copy: "Practice under test-like conditions and use each attempt to identify what needs more focused preparation.",
  },
];

const insights = [
  ["Memory tricks", "Capture the shortcuts and associations that make difficult concepts easier to recall."],
  ["Interview tips", "Attach practical interview observations to the technical questions they relate to."],
  ["Project ideas", "Turn classroom concepts into starting points for projects, experiments, and portfolios."],
  ["Real-world examples", "Connect theory with applications so an answer becomes easier to understand and explain."],
];

const placementAreas = [
  "Aptitude",
  "Reasoning",
  "Verbal Ability",
  "Technical MCQs",
  "Interview Questions",
  "Mock Tests",
  "Company Preparation",
];

export default function HomeSections() {
  return (
    <div className="homeSections">
      <section className="startupSection featureSection" id="features">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">One connected workflow</span>
            <h2>From university exams to placement preparation</h2>
            <p>
              ClimbUP is being built to help students move from finding a question
              to understanding it, writing a better answer, and sharing what they learn.
            </p>
          </div>

          <div className="featureGrid">
            {features.map((feature) => (
              <article className="featureCard" key={feature.title}>
                <span className="featureMark" aria-hidden>{feature.mark}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="startupSection whySection" id="why-climbup">
        <div className="sectionContainer whyGrid">
          <div className="sectionIntro sectionIntroLeft">
            <span className="sectionLabel">Why ClimbUP?</span>
            <h2>Useful student knowledge should not disappear after an exam.</h2>
            <p>
              A strong explanation, a memorable trick, or a better way to structure
              an answer often stays in one notebook or one conversation. ClimbUP is
              designed to preserve that value and help the next student improve it.
            </p>
          </div>

          <div className="problemFlow" aria-label="How ClimbUP preserves student knowledge">
            <article>
              <span>01</span>
              <div><h3>Knowledge gets created</h3><p>Students discover better explanations while studying, solving, and discussing.</p></div>
            </article>
            <article>
              <span>02</span>
              <div><h3>Most of it gets lost</h3><p>Once an exam or interview ends, useful insights are rarely organized for others.</p></div>
            </article>
            <article>
              <span>03</span>
              <div><h3>ClimbUP keeps it useful</h3><p>Answers and insights can be improved, kept private, or shared publicly for collaborative learning.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="startupSection insightsSection" id="insights">
        <div className="sectionContainer insightsGrid">
          <div className="insightVisual" aria-hidden>
            <span className="insightBadge">Question</span>
            <div className="insightQuestion">How would you explain this concept in an exam or interview?</div>
            <div className="insightNote"><b>Student insight</b><span>Add a clearer explanation, useful connection, or practical example.</span></div>
            <div className="insightPrivacy"><span>Private draft</span><span>Public insight</span></div>
          </div>

          <div className="sectionIntro sectionIntroLeft">
            <span className="sectionLabel">Student Insights</span>
            <h2>Study for yourself. Leave something useful for others.</h2>
            <p>
              Students can publish ideas while they study and place them where they
              are most useful—alongside the question or concept being discussed.
            </p>
            <div className="insightList">
              {insights.map(([title, copy]) => (
                <article key={title}><span aria-hidden>✓</span><div><h3>{title}</h3><p>{copy}</p></div></article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="startupSection placementSection" id="placements">
        <div className="sectionContainer placementGrid">
          <div className="sectionIntro sectionIntroLeft">
            <span className="sectionLabel">Prepare for placements</span>
            <h2>Build readiness one skill area at a time.</h2>
            <p>
              Placement preparation is broader than one test. ClimbUP brings the
              major practice areas into a clearer path so students can prepare with intent.
            </p>
            <div className="placementPills">
              {placementAreas.map((area) => <span key={area}>{area}</span>)}
            </div>
          </div>

          <div className="placementPanel">
            <span className="panelEyebrow">A practical preparation loop</span>
            <ol>
              <li><b>Choose a goal</b><span>Start with an assessment, role, or company you want to prepare for.</span></li>
              <li><b>Practice deliberately</b><span>Work across aptitude, technical questions, and interview preparation.</span></li>
              <li><b>Review weak areas</b><span>Use mock attempts to decide what deserves the next study session.</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="startupSection aboutSection" id="about">
        <div className="sectionContainer aboutGrid">
          <div className="sectionIntro sectionIntroLeft">
            <span className="sectionLabel">About ClimbUP</span>
            <h2>Built close to the problems it is trying to solve.</h2>
          </div>
          <div className="aboutCopy">
            <p>
              ClimbUP is being built by engineering students to solve learning
              problems students experience directly—from scattered PYQs and weak
              answer practice to knowledge that disappears after an exam.
            </p>
            <p>
              The platform is focused on collaboration, useful knowledge sharing,
              and steady growth. It starts with engineering education, with a future
              vision of supporting students across educational backgrounds.
            </p>
          </div>
        </div>
      </section>

      <section className="startupSection trustSection" id="trust">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">Trust &amp; Security</span>
            <h2>Your learning space should feel safe and under your control.</h2>
            <p>ClimbUP is designed with clear account protection and content privacy choices.</p>
          </div>
          <div className="trustGrid">
            <article><span aria-hidden>01</span><h3>Secure authentication</h3><p>Protected sign-in flows help keep account access secure.</p></article>
            <article><span aria-hidden>02</span><h3>Privacy controls</h3><p>Keep an answer private while working, or publish it when you choose.</p></article>
            <article><span aria-hidden>03</span><h3>Protected accounts</h3><p>Account sessions and profile access are handled through established authentication infrastructure.</p></article>
            <article><span aria-hidden>04</span><h3>Safe learning environment</h3><p>The product is being shaped around useful, respectful, education-focused participation.</p></article>
          </div>
        </div>
      </section>

      <section className="homeClosingSection">
        <div className="sectionContainer closingPanel">
          <div><span className="sectionLabel">ClimbUP is growing</span><h2>Help build a better way for students to learn from each other.</h2></div>
          <a href="#home">Start with ClimbUP <span aria-hidden>↑</span></a>
        </div>
      </section>
    </div>
  );
}
