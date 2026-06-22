import "@/styles/HomeSections.css";

const features = [
  {
    mark: "PYQ",
    title: "PYQ Preparation",
    copy: "Questions with better answers.",
  },
  {
    mark: "IDEA",
    title: "Student Insights",
    copy: "Save and share valuable ideas.",
  },
  {
    mark: "A+R",
    title: "Placement Prep",
    copy: "Aptitude, interviews, and practice.",
  },
];

export default function HomeSections() {
  return (
    <div className="homeSections">

      {/* WHY CLIMBUP */}
      <section className="startupSection whySection" id="why-climbup">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">WHY CLIMBUP</span>

            <h2>
              Every student creates valuable knowledge while learning.
            </h2>

            <p>
              Better explanations, memory tricks, interview insights,
              project ideas, and solutions often disappear after exams.
              ClimbUP helps students save and share them so others can learn too.
            </p>
          </div>

          <div className="problemFlow">
            <article>
              <span>01</span>
              <div>
                <h3>Study</h3>
                <p>Learn a concept or solve a question.</p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>Capture</h3>
                <p>Save useful ideas instantly.</p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>Share</h3>
                <p>Help other students learn from them.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="startupSection featureSection" id="features">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">
              Everything in One Place
            </span>

            <h2>
              Learn. Improve. Grow.
            </h2>

            <p>
              Organize learning around questions, answers,
              insights, and placement preparation.
            </p>
          </div>

          <div className="featureGrid">
            {features.map((feature) => (
              <article className="featureCard" key={feature.title}>
                <span className="featureMark">
                  {feature.mark}
                </span>

                <h3>{feature.title}</h3>

                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL VISION */}
      <section className="startupSection visionSection">
        <div className="sectionContainer">
          <div className="sectionIntro">
            <span className="sectionLabel">
              STUDENT KNOWLEDGE NETWORK
            </span>

            <h2>
              Capture Ideas.
              Share Knowledge.
              Help Students Grow.
            </h2>

            <p>
              Every insight can help someone else learn faster,
              understand better, or discover a new solution.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="homeClosingSection">
        <div className="sectionContainer closingPanel">
          <div>
            <span className="sectionLabel">
              JOIN CLIMBUP
            </span>

            <h2>
              Turn Learning Into Shared Knowledge.
            </h2>
          </div>

          <a href="#home">
            Start Sharing
            <span aria-hidden> ↑</span>
          </a>
        </div>
      </section>

    </div>
  );
}