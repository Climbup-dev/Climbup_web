import Navbar from "@/components/Navbar";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f8fc", color: "#0f172a", fontFamily: "sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "100px 20px 60px" }}>
        <div style={{ 
          background: "#ffffff",
          border: "1px solid #bfdbfe",
          boxShadow: "0 4px 20px rgba(37, 99, 235, 0.08)",
          padding: "24px", 
          borderRadius: "16px", 
          marginBottom: "40px" 
        }}>
          <h2 style={{ color: "#1d4ed8", marginTop: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
            💡 The Short Version
          </h2>
          <p style={{ margin: 0, lineHeight: 1.6, color: "#334155" }}>
            We don&apos;t sell your data. We don&apos;t train public AI on your notes. Your uploads are secure. We only collect what&apos;s needed to help you score better grades.
          </p>
        </div>

        <h1 style={{ fontSize: "2.5rem", marginBottom: "30px", fontWeight: 800, color: "#0f172a" }}>Privacy Policy</h1>
        
        <h3 style={{ color: "#1d4ed8", fontSize: "1.3rem", marginTop: "40px", fontWeight: 700 }}>1. The &quot;Your Data is Yours&quot; Promise (Data Ownership)</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          You retain full ownership of any PDFs, assignments, or study materials you upload. PractiQ only processes these documents to generate your personalized study sessions. We do not sell your academic materials to third parties.
        </p>

        <h3 style={{ color: "#1d4ed8", fontSize: "1.3rem", marginTop: "30px", fontWeight: 700 }}>2. AI &amp; Privacy (No Public Training)</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Our AI Study Assistant reads your documents strictly to answer your doubts. Your private chats and uploaded PDFs are <strong>never</strong> used to train public AI models (like ChatGPT or Gemini) for other users. Your academic data stays within your secure classroom environment.
        </p>

        <h3 style={{ color: "#1d4ed8", fontSize: "1.3rem", marginTop: "30px", fontWeight: 700 }}>3. Strict Security Standards</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          We use enterprise-grade security. All data, including your passwords and study materials, is heavily encrypted. We use secure WebSockets and world-class cloud infrastructure to ensure your study sessions are safe from hackers and unauthorized access.
        </p>

        <h3 style={{ color: "#1d4ed8", fontSize: "1.3rem", marginTop: "30px", fontWeight: 700 }}>4. Secure Registration &amp; Private Saves</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          When you register on PractiQ, your account credentials and personal details are safely encrypted. Any study materials, PDFs, or assignments you save privately remain visible <strong>only to you</strong>. We strictly enforce private boundaries so your personal workspace stays completely confidential.
        </p>

        <h3 style={{ color: "#1d4ed8", fontSize: "1.3rem", marginTop: "30px", fontWeight: 700 }}>5. Transparent Data Collection</h3>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          We only collect data necessary to give you a great experience: your name, University, Branch, and Semester. This is exclusively used to match you with the right syllabus and let you seamlessly share resources with your actual classmates.
        </p>

      </div>
    </div>
  );
}
