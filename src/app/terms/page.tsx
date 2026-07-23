import Navbar from "@/components/Navbar";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#020617", color: "#f8fafc", fontFamily: "sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "100px 20px 60px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "30px", fontWeight: 800 }}>Terms of Service</h1>
        
        <p style={{ color: "#94a3b8", lineHeight: 1.7, marginBottom: "30px" }}>
          Welcome to ClimbUP AI. By using our platform, you agree to these simple and transparent terms.
        </p>

        <h3 style={{ color: "#10b981", fontSize: "1.3rem", marginTop: "30px" }}>1. Fair Usage Policy</h3>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          To ensure lightning-fast AI responses for everyone, we employ smart rate-limiting and character limits on our chat. Spamming the AI or uploading malicious files is strictly prohibited and will result in account suspension. Let's keep the platform clean and focused on learning.
        </p>

        <h3 style={{ color: "#10b981", fontSize: "1.3rem", marginTop: "30px" }}>2. Content Guidelines</h3>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          You must only upload academic materials (like syllabuses, class notes, or assignments) that you have the right to use. Uploading explicit, illegal, or copyrighted content belonging to others is prohibited.
        </p>

        <h3 style={{ color: "#10b981", fontSize: "1.3rem", marginTop: "30px" }}>3. Academic Integrity</h3>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          Our AI Study Assistant is designed to help you learn faster and smarter. It is not intended to do your homework for you or help you cheat on exams. Use ClimbUP responsibly to boost your actual knowledge.
        </p>

      </div>
    </div>
  );
}
