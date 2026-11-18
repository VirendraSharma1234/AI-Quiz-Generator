const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "Quizwee AI - Project Presentation";
pres.author = "Quizwee AI Engineering";

// Brand Color Palette (matching Quizwee AI dark theme)
const BG_DARK = "07090E";          // Deep obsidian dark
const CARD_BG = "111827";          // Midnight slate card fill
const CARD_BORDER = "1F2937";      // Subtle card border
const CARD_HOVER = "1E293B";
const ACCENT_INDIGO = "6366F1";    // Brand primary
const ACCENT_PURPLE = "8B5CF6";    // Brand secondary
const ACCENT_GREEN = "10B981";     // Emerald success
const ACCENT_PINK = "EC4899";      // Accent pink
const ACCENT_AMBER = "F59E0B";     // Accent amber
const TEXT_WHITE = "F8FAFC";
const TEXT_MUTED = "94A3B8";
const TEXT_DIM = "64748B";

// Helper: Common slide header & footer
function addSlideChrome(slide, title, category, slideNum) {
  // Background
  slide.background = { color: BG_DARK };

  // Subtle Header Accent Line
  slide.addShape(pres.ShapeType.line, {
    x: 0.8,
    y: 0.35,
    w: 1.5,
    h: 0,
    line: { color: ACCENT_INDIGO, width: 2.5 }
  });

  // Category Badge
  slide.addText(category.toUpperCase(), {
    x: 0.8,
    y: 0.45,
    w: 5.0,
    h: 0.28,
    fontSize: 9.5,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_INDIGO,
    letterSpacing: 1.2
  });

  // Slide Title
  slide.addText(title, {
    x: 0.8,
    y: 0.72,
    w: 8.5,
    h: 0.55,
    fontSize: 22,
    fontFace: "Arial",
    bold: true,
    color: TEXT_WHITE
  });

  // Footer separator line
  slide.addShape(pres.ShapeType.line, {
    x: 0.8,
    y: 5.15,
    w: 8.4,
    h: 0,
    line: { color: "1E293B", width: 1 }
  });

  // Footer Brand Text
  slide.addText("Quizwee AI • Next-Generation AI Academic Assessment Platform", {
    x: 0.8,
    y: 5.2,
    w: 6.0,
    h: 0.3,
    fontSize: 9,
    fontFace: "Arial",
    color: TEXT_DIM
  });

  // Slide Number Pill
  slide.addText(`${String(slideNum).padStart(2, "0")} / 10`, {
    x: 8.2,
    y: 5.2,
    w: 1.0,
    h: 0.3,
    fontSize: 9,
    fontFace: "Arial",
    color: ACCENT_INDIGO,
    align: "right",
    bold: true
  });
}

// =============================================================
// SLIDE 1: TITLE SLIDE (Cover - Sleek & Impactful)
// =============================================================
{
  const s1 = pres.addSlide();
  s1.background = { color: BG_DARK };

  // Glowing center card container
  s1.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 0.7,
    w: 8.4,
    h: 4.25,
    fill: { color: "0B0F19" },
    line: { color: "1E293B", width: 1.5 },
    rectRadius: 0.15
  });

  // Top pill badge
  s1.addShape(pres.ShapeType.roundRect, {
    x: 3.1,
    y: 1.05,
    w: 3.8,
    h: 0.36,
    fill: { color: "1E1B4B" },
    line: { color: ACCENT_INDIGO, width: 1 },
    rectRadius: 0.18
  });
  s1.addText("✨ NEXT-GEN AI ASSESSMENT SYSTEM • v2.5", {
    x: 3.1,
    y: 1.08,
    w: 3.8,
    h: 0.3,
    fontSize: 9.5,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_INDIGO,
    align: "center"
  });

  // Main Brand Name
  s1.addText("Quizwee AI", {
    x: 1.0,
    y: 1.5,
    w: 8.0,
    h: 0.95,
    fontSize: 46,
    fontFace: "Arial",
    bold: true,
    color: TEXT_WHITE,
    align: "center"
  });

  // Tagline Subtitle
  s1.addText("Transform Any Curriculum Into Precision Examinations", {
    x: 1.0,
    y: 2.45,
    w: 8.0,
    h: 0.45,
    fontSize: 18,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_PURPLE,
    align: "center"
  });

  // Mission statement
  s1.addText("An intelligent full-stack assessment platform that converts unstructured syllabi, text notes, and PDF textbooks into university-grade practice quizzes with real-time anti-cheat proctoring and 24/7 Socratic AI tutoring.", {
    x: 1.5,
    y: 2.95,
    w: 7.0,
    h: 0.65,
    fontSize: 11,
    fontFace: "Arial",
    color: TEXT_MUTED,
    align: "center"
  });

  // 3 Feature Summary Badges
  const badges = [
    { title: "Multimodal AI Parser", desc: "Topic • Raw Text • PDF.js", color: ACCENT_INDIGO },
    { title: "Proctored Exam Simulator", desc: "Fullscreen & Tab Blur Detection", color: ACCENT_PINK },
    { title: "MongoDB Atlas Cloud", desc: "Persistent User & Quiz History", color: ACCENT_GREEN }
  ];

  badges.forEach((b, i) => {
    const xPos = 1.2 + i * 2.65;
    s1.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 3.75,
      w: 2.4,
      h: 0.9,
      fill: { color: "111827" },
      line: { color: "232E48", width: 1 },
      rectRadius: 0.1
    });

    s1.addText(b.title, {
      x: xPos,
      y: 3.88,
      w: 2.4,
      h: 0.3,
      fontSize: 10,
      fontFace: "Arial",
      bold: true,
      color: b.color,
      align: "center"
    });

    s1.addText(b.desc, {
      x: xPos,
      y: 4.18,
      w: 2.4,
      h: 0.3,
      fontSize: 8.5,
      fontFace: "Arial",
      color: TEXT_MUTED,
      align: "center"
    });
  });
}

// =============================================================
// SLIDE 2: PROBLEM STATEMENT VS THE QUIZWEE AI PARADIGM
// =============================================================
{
  const s2 = pres.addSlide();
  addSlideChrome(s2, "The Academic Dilemma & Our Technological Solution", "Executive Problem Statement", 2);

  // Left: The Challenge Card
  s2.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 1.45,
    w: 4.05,
    h: 3.45,
    fill: { color: "130D1B" },
    line: { color: "3B1832", width: 1.5 },
    rectRadius: 0.12
  });

  // Card Header Badge
  s2.addShape(pres.ShapeType.roundRect, {
    x: 1.05,
    y: 1.65,
    w: 2.2,
    h: 0.32,
    fill: { color: "2A1224" },
    line: { color: ACCENT_PINK, width: 1 },
    rectRadius: 0.16
  });
  s2.addText("⚠️ TRADITIONAL BOTTLENECKS", {
    x: 1.05,
    y: 1.68,
    w: 2.2,
    h: 0.25,
    fontSize: 8.5,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_PINK,
    align: "center"
  });

  s2.addText([
    { text: "1. Manual Quiz Authoring is Exhausting\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10.5 } },
    { text: "Teachers and learners spend 4–8 hours manually writing multiple-choice questions from dense textbooks.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "2. Passive, Low-Retention Study Habits\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10.5 } },
    { text: "Re-reading static notes creates an illusion of competence without timed, active recall testing.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "3. Unmonitored Self-Assessments\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10.5 } },
    { text: "Standard online quizzes have zero integrity controls to simulate real examination pressure or prevent tab-switching.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 1.05, y: 2.1, w: 3.55, h: 2.65, fontFace: "Arial" });

  // Right: The Solution Card
  s2.addShape(pres.ShapeType.roundRect, {
    x: 5.15,
    y: 1.45,
    w: 4.05,
    h: 3.45,
    fill: { color: "0B1C1D" },
    line: { color: "11403E", width: 1.5 },
    rectRadius: 0.12
  });

  // Card Header Badge
  s2.addShape(pres.ShapeType.roundRect, {
    x: 5.4,
    y: 1.65,
    w: 2.2,
    h: 0.32,
    fill: { color: "0E2B2A" },
    line: { color: ACCENT_GREEN, width: 1 },
    rectRadius: 0.16
  });
  s2.addText("✨ THE QUIZWEE AI SOLUTION", {
    x: 5.4,
    y: 1.68,
    w: 2.2,
    h: 0.25,
    fontSize: 8.5,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_GREEN,
    align: "center"
  });

  s2.addText([
    { text: "1. Instant Multimodal Generation\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10.5 } },
    { text: "Extracts concepts from syllabus topics, notes, or uploaded PDFs and builds a tailored test in seconds.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "2. Anti-Cheat Proctoring Simulator\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10.5 } },
    { text: "Enforces fullscreen and monitors tab-focus switching with automated warning strikes & timeout locking.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "3. 24/7 Contextual Socratic AI Tutor\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10.5 } },
    { text: "Provides in-exam conceptual hints without leaking direct answers, turning mistakes into learning milestones.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 5.4, y: 2.1, w: 3.55, h: 2.65, fontFace: "Arial" });
}

// =============================================================
// SLIDE 3: END-TO-END USER JOURNEY (4-Step Horizontal Pipeline)
// =============================================================
{
  const s3 = pres.addSlide();
  addSlideChrome(s3, "Seamless End-to-End User Experience", "User Journey & Workflow", 3);

  const steps = [
    {
      num: "01",
      title: "Content Ingestion",
      tag: "STEP 1",
      color: ACCENT_INDIGO,
      desc: "Candidate inputs syllabus topic, pastes lecture notes, or uploads a multi-page PDF document for client-side extraction."
    },
    {
      num: "02",
      title: "Exam Configuration",
      tag: "STEP 2",
      color: ACCENT_PURPLE,
      desc: "Customize question volume (1–100), difficulty tier (Easy, Medium, Hard), and countdown timers (1–180 minutes)."
    },
    {
      num: "03",
      title: "Proctored Exam",
      tag: "STEP 3",
      color: ACCENT_PINK,
      desc: "Fullscreen test environment active with tab-switch tracking, countdown timers, and interactive AI tutor support."
    },
    {
      num: "04",
      title: "Atlas Cloud Sync",
      tag: "STEP 4",
      color: ACCENT_GREEN,
      desc: "Immediate diagnostic score calculation, color-coded answer review, and automated sync to MongoDB Atlas."
    }
  ];

  steps.forEach((st, i) => {
    const xPos = 0.8 + i * 2.15;

    // Card background
    s3.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 1.5,
      w: 2.02,
      h: 3.35,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1.5 },
      rectRadius: 0.12
    });

    // Step Number Giant
    s3.addText(st.num, {
      x: xPos + 0.15,
      y: 1.65,
      w: 1.7,
      h: 0.65,
      fontSize: 28,
      fontFace: "Arial",
      bold: true,
      color: st.color
    });

    // Step Tag
    s3.addText(st.tag, {
      x: xPos + 0.15,
      y: 2.35,
      w: 1.7,
      h: 0.22,
      fontSize: 8.5,
      fontFace: "Arial",
      bold: true,
      color: TEXT_MUTED
    });

    // Step Title
    s3.addText(st.title, {
      x: xPos + 0.15,
      y: 2.6,
      w: 1.7,
      h: 0.55,
      fontSize: 13,
      fontFace: "Arial",
      bold: true,
      color: TEXT_WHITE
    });

    // Step Description
    s3.addText(st.desc, {
      x: xPos + 0.15,
      y: 3.25,
      w: 1.7,
      h: 1.45,
      fontSize: 9.5,
      fontFace: "Arial",
      color: TEXT_MUTED,
      lineSpacing: 14
    });
  });
}

// =============================================================
// SLIDE 4: MULTIMODAL ASSESSMENT ENGINE (WITH GENERATOR SNAPSHOT)
// =============================================================
{
  const s4 = pres.addSlide();
  addSlideChrome(s4, "Multimodal Parsing & Assessment Engine", "Core Intelligence", 4);

  // Left Content Card
  s4.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 1.45,
    w: 3.8,
    h: 3.45,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1.5 },
    rectRadius: 0.12
  });

  s4.addText("📚 Content Ingestion Flexibility", {
    x: 1.05,
    y: 1.65,
    w: 3.3,
    h: 0.35,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_PURPLE
  });

  s4.addText([
    { text: "• Topic / Syllabus Prompt Mode:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Direct prompt-based generation covering academic concepts, university subjects, or specific syllabus outlines.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Raw Notes & Text Summaries:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Directly parses pasted lecture notes, textbook chapters, or research papers without formatting requirements.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Native On-Device PDF Processing:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Uses client-side pdf.js to tokenize PDFs in the browser, guaranteeing 100% user privacy and zero server upload latency.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Granular Control:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Customizable 1–100 questions, difficulty levels (Easy/Medium/Hard), and countdown timers (1–180 minutes).", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 1.05, y: 2.05, w: 3.3, h: 2.75, fontFace: "Arial" });

  // Right: Real Screenshot of the Assessment Generator
  const genImg = path.join(__dirname, "assets/presentation/slide_generator.png");
  if (fs.existsSync(genImg)) {
    s4.addShape(pres.ShapeType.roundRect, {
      x: 4.8,
      y: 1.45,
      w: 4.4,
      h: 3.45,
      fill: { color: "000000" },
      line: { color: ACCENT_INDIGO, width: 1 },
      rectRadius: 0.12
    });
    s4.addImage({
      path: genImg,
      x: 4.85,
      y: 1.5,
      w: 4.3,
      h: 3.35,
      sizing: { type: "contain" }
    });
  }
}

// =============================================================
// SLIDE 5: INTEGRITY PROCTOR & AI TUTOR (NO SCREENSHOT - RICH CARDS)
// =============================================================
{
  const s5 = pres.addSlide();
  addSlideChrome(s5, "Anti-Cheat Proctoring & 24/7 Socratic AI Tutor", "Exam Integrity & Learning", 5);

  // Left Card: Anti-Cheat Proctor
  s5.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 1.45,
    w: 4.05,
    h: 3.45,
    fill: { color: CARD_BG },
    line: { color: "372045", width: 1.5 },
    rectRadius: 0.12
  });

  s5.addText("🛡️ Anti-Cheat Proctoring Protocols", {
    x: 1.05,
    y: 1.65,
    w: 3.55,
    h: 0.35,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_PINK
  });

  s5.addText([
    { text: "• Fullscreen Lockdown Mode:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Enforces an immersive test viewport. Attempting to exit fullscreen immediately triggers visual warning modals.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Tab-Switch & Blur Detection:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Utilizes the HTML5 Page Visibility API to detect when a student switches tabs or opens outside search applications.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Automated 3-Strike Penalty System:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Candidates receive up to 3 warnings. Repeated infractions automatically lock answers and auto-submit the exam.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Audit Submission Flagging:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Flags like 'Proctor Flagged' vs 'Normal Submit' are recorded permanently in MongoDB for administrative review.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 1.05, y: 2.1, w: 3.55, h: 2.7, fontFace: "Arial" });

  // Right Card: 24/7 Socratic AI Tutor
  s5.addShape(pres.ShapeType.roundRect, {
    x: 5.15,
    y: 1.45,
    w: 4.05,
    h: 3.45,
    fill: { color: CARD_BG },
    line: { color: "183637", width: 1.5 },
    rectRadius: 0.12
  });

  s5.addText("💬 24/7 Socratic Conceptual AI Tutor", {
    x: 5.4,
    y: 1.65,
    w: 3.55,
    h: 0.35,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_GREEN
  });

  s5.addText([
    { text: "• Zero Direct Answer Leakage:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Engineered with strict guardrails to never output direct answers or option letters, preserving exam validity.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Step-by-Step Thought Guidance:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Explains theoretical foundations, relevant mathematical formulas, and option elimination strategies.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• In-Quiz Real-Time Dialogue:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Students can ask follow-up questions during practice mode without breaking assessment flow or getting discouraged.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Active Recall Reinforcement:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Encourages the student to reason through difficult concepts instead of passively guessing.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 5.4, y: 2.1, w: 3.55, h: 2.7, fontFace: "Arial" });
}

// =============================================================
// SLIDE 6: ENTERPRISE 3-TIER ARCHITECTURE (NO SCREENSHOT - 3 COLS)
// =============================================================
{
  const s6 = pres.addSlide();
  addSlideChrome(s6, "Enterprise Full-Stack Architecture & Security", "Engineering & System Design", 6);

  const tiers = [
    {
      name: "1. Client Tier (Frontend)",
      badge: "PRESENTATION LAYER",
      color: ACCENT_INDIGO,
      bullets: [
        "Single-Page Application (SPA) with semantic HTML5 and Bootstrap 5.3.",
        "Custom glassmorphism UI with smooth dark/light theme switching.",
        "On-device PDF extraction via pdf.js ensuring zero bandwidth bloat.",
        "Form autofill suppression traps (decoy fields & dynamic readonly).",
        "HTML5 Page Visibility hooks for instant proctoring alerts."
      ]
    },
    {
      name: "2. Server Tier (API Layer)",
      badge: "BUSINESS LOGIC LAYER",
      color: ACCENT_PURPLE,
      bullets: [
        "Node.js & Express.js RESTful API architecture.",
        "Stateless JWT session tokens (7-day validity with secure verification).",
        "Sliding-window IP rate limiter (brute-force credential protection).",
        "Bcrypt salted password encryption (cost factor 10).",
        "Production security headers (nosniff, SAMEORIGIN, XSS-Protection)."
      ]
    },
    {
      name: "3. Database Tier (Persistence)",
      badge: "DATA PERSISTENCE LAYER",
      color: ACCENT_GREEN,
      bullets: [
        "MongoDB Atlas cloud cluster (Cluster0) via Mongoose 8 ODM.",
        "Relational schemas for users and quizhistories collections.",
        "DNS SRV resolution with fallback server-side resolvers.",
        "Zero-downtime automatic in-memory fallback if cloud connection drops.",
        "Vercel Serverless Function rewrites (/api/* to api/index.js)."
      ]
    }
  ];

  tiers.forEach((t, i) => {
    const xPos = 0.8 + i * 2.85;

    s6.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 1.45,
      w: 2.7,
      h: 3.45,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1.5 },
      rectRadius: 0.12
    });

    s6.addText(t.badge, {
      x: xPos + 0.15,
      y: 1.6,
      w: 2.4,
      h: 0.22,
      fontSize: 8,
      fontFace: "Arial",
      bold: true,
      color: t.color
    });

    s6.addText(t.name, {
      x: xPos + 0.15,
      y: 1.85,
      w: 2.4,
      h: 0.45,
      fontSize: 12.5,
      fontFace: "Arial",
      bold: true,
      color: TEXT_WHITE
    });

    const bulletItems = t.bullets.map(b => ({
      text: `• ${b}\n\n`,
      options: { color: TEXT_MUTED, fontSize: 9 }
    }));

    s6.addText(bulletItems, {
      x: xPos + 0.15,
      y: 2.4,
      w: 2.4,
      h: 2.4,
      fontFace: "Arial"
    });
  });
}

// =============================================================
// SLIDE 7: MONGODB ATLAS INTEGRATION (WITH ATLAS SCREENSHOT)
// =============================================================
{
  const s7 = pres.addSlide();
  addSlideChrome(s7, "Cloud Database Architecture & MongoDB Atlas Sync", "Data Infrastructure", 7);

  // Left Content Card
  s7.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 1.45,
    w: 3.8,
    h: 3.45,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1.5 },
    rectRadius: 0.12
  });

  s7.addText("🗄️ Relational Cloud Collections", {
    x: 1.05,
    y: 1.65,
    w: 3.3,
    h: 0.35,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_GREEN
  });

  s7.addText([
    { text: "• Live MongoDB Atlas Cluster0:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Connected via encrypted URI with custom user credentials and DNS SRV routing.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• users Collection Schema:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Stores name, unique email, bcrypt-hashed credentials, role (student, educator, admin), and quizzes taken counter.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• quizhistories Collection Schema:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Stores relational quiz attempts, score accuracy %, correct/incorrect counts, time taken, and proctoring status.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Native Tabular View:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Accessible directly in the MongoDB Atlas Data Explorer via the Table View toggle.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 1.05, y: 2.05, w: 3.3, h: 2.75, fontFace: "Arial" });

  // Right: Real Screenshot of MongoDB Atlas Data Explorer
  const atlasImg = path.join(__dirname, "assets/presentation/slide_mongodb_atlas.png");
  if (fs.existsSync(atlasImg)) {
    s7.addShape(pres.ShapeType.roundRect, {
      x: 4.8,
      y: 1.45,
      w: 4.4,
      h: 3.45,
      fill: { color: "000000" },
      line: { color: ACCENT_GREEN, width: 1 },
      rectRadius: 0.12
    });
    s7.addImage({
      path: atlasImg,
      x: 4.85,
      y: 1.5,
      w: 4.3,
      h: 3.35,
      sizing: { type: "contain" }
    });
  }
}

// =============================================================
// SLIDE 8: ADMINISTRATOR CONTROL CONSOLE (WITH ADMIN SCREENSHOT)
// =============================================================
{
  const s8 = pres.addSlide();
  addSlideChrome(s8, "Administrator Management Console", "System Governance & Audit", 8);

  // Left Content Card
  s8.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 1.45,
    w: 3.8,
    h: 3.45,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1.5 },
    rectRadius: 0.12
  });

  s8.addText("⚡ Comprehensive Admin Governance", {
    x: 1.05,
    y: 1.65,
    w: 3.3,
    h: 0.35,
    fontSize: 13,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_INDIGO
  });

  s8.addText([
    { text: "• Live System Telemetry:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Real-time counters for registered users, quizzes attempted, and live MongoDB Atlas (Online) connection status.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Tabular User Directory:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Searchable directory of all candidates with role badges, joined dates, total tests taken, and one-click account deletion.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Exam Audit & Violation Logs:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Review global assessment attempts, score distributions, and inspect candidates flagged by the anti-cheat proctor.\n\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Role-Protected Access:\n", options: { bold: true, color: TEXT_WHITE, fontSize: 10 } },
    { text: "Guarded on both server and client side by strict requireAdmin middleware tokens.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 1.05, y: 2.05, w: 3.3, h: 2.75, fontFace: "Arial" });

  // Right: Real Screenshot of the Admin Dashboard Console Table
  const adminImg = path.join(__dirname, "assets/presentation/slide_admin_console.png");
  if (fs.existsSync(adminImg)) {
    s8.addShape(pres.ShapeType.roundRect, {
      x: 4.8,
      y: 1.45,
      w: 4.4,
      h: 3.45,
      fill: { color: "000000" },
      line: { color: ACCENT_INDIGO, width: 1 },
      rectRadius: 0.12
    });
    s8.addImage({
      path: adminImg,
      x: 4.85,
      y: 1.5,
      w: 4.3,
      h: 3.35,
      sizing: { type: "contain" }
    });
  }
}

// =============================================================
// SLIDE 9: SECURITY & ENGINEERING HIGHLIGHTS (NO SCREENSHOT - 4 QUADRANTS)
// =============================================================
{
  const s9 = pres.addSlide();
  addSlideChrome(s9, "Security, Privacy & Fault-Tolerance Engineering", "Engineering Highlights", 9);

  const quadrants = [
    {
      title: "Client-Side Privacy (PDF.js)",
      badge: "ZERO SERVER OVERHEAD",
      color: ACCENT_GREEN,
      desc: "Uploaded PDF textbooks are parsed and tokenized on-device in the browser via pdf.js. Heavy files are never uploaded to servers, guaranteeing candidate privacy and minimizing network bandwidth."
    },
    {
      title: "Brute-Force & Rate Limiting",
      badge: "NETWORK DEFENSE",
      color: ACCENT_PINK,
      desc: "In-memory sliding window rate limiter caps authentication requests at 15 attempts/minute per IP, returning HTTP 429 Too Many Requests to prevent automated dictionary attacks."
    },
    {
      title: "Decoy Autofill Elimination",
      badge: "CREDENTIAL PROTECTION",
      color: ACCENT_INDIGO,
      desc: "Combines invisible decoy input traps with dynamic 'readonly onfocus' attributes to completely suppress browser password managers from auto-injecting credentials on fresh visits."
    },
    {
      title: "Zero-Downtime Fallback",
      badge: "HIGH AVAILABILITY",
      color: ACCENT_AMBER,
      desc: "If cloud internet connectivity fluctuates, the system automatically engages an in-memory database store, allowing testing and generation to continue seamlessly without crashing."
    }
  ];

  quadrants.forEach((q, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const xPos = 0.8 + col * 4.3;
    const yPos = 1.45 + row * 1.8;

    s9.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: yPos,
      w: 4.1,
      h: 1.65,
      fill: { color: CARD_BG },
      line: { color: CARD_BORDER, width: 1.5 },
      rectRadius: 0.1
    });

    s9.addText(q.badge, {
      x: xPos + 0.15,
      y: yPos + 0.12,
      w: 3.8,
      h: 0.2,
      fontSize: 8,
      fontFace: "Arial",
      bold: true,
      color: q.color
    });

    s9.addText(q.title, {
      x: xPos + 0.15,
      y: yPos + 0.32,
      w: 3.8,
      h: 0.35,
      fontSize: 12,
      fontFace: "Arial",
      bold: true,
      color: TEXT_WHITE
    });

    s9.addText(q.desc, {
      x: xPos + 0.15,
      y: yPos + 0.68,
      w: 3.8,
      h: 0.85,
      fontSize: 8.8,
      fontFace: "Arial",
      color: TEXT_MUTED,
      lineSpacing: 13
    });
  });
}

// =============================================================
// SLIDE 10: CONCLUSION, IMPACT & FUTURE ROADMAP (DEDICATED CONCLUSION)
// =============================================================
{
  const s10 = pres.addSlide();
  addSlideChrome(s10, "Project Conclusion & Future Roadmap", "Project Summary & Vision", 10);

  // Top Impact Banner
  s10.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 1.45,
    w: 8.4,
    h: 1.25,
    fill: { color: CARD_BG },
    line: { color: ACCENT_INDIGO, width: 1.5 },
    rectRadius: 0.12
  });

  s10.addText("🏆 Key Project Achievements & Impact", {
    x: 1.05,
    y: 1.58,
    w: 7.9,
    h: 0.3,
    fontSize: 12.5,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_INDIGO
  });

  s10.addText([
    { text: "• 90% Time Reduction: ", options: { bold: true, color: TEXT_WHITE, fontSize: 9.5 } },
    { text: "Automates multi-hour manual assessment authoring into a sub-minute AI workflow.\n", options: { color: TEXT_MUTED, fontSize: 9.5 } },
    { text: "• Active Pedagogical Learning: ", options: { bold: true, color: TEXT_WHITE, fontSize: 9.5 } },
    { text: "Transforms passive note reading into proctored, active recall practice with real-time Socratic hints.\n", options: { color: TEXT_MUTED, fontSize: 9.5 } },
    { text: "• Production Cloud Architecture: ", options: { bold: true, color: TEXT_WHITE, fontSize: 9.5 } },
    { text: "Production-ready deployment on Vercel paired with live persistence on MongoDB Atlas.", options: { color: TEXT_MUTED, fontSize: 9.5 } }
  ], { x: 1.05, y: 1.9, w: 7.9, h: 0.72, fontFace: "Arial" });

  // Bottom Left: Roadmap
  s10.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 2.85,
    w: 4.85,
    h: 2.05,
    fill: { color: CARD_BG },
    line: { color: CARD_BORDER, width: 1.5 },
    rectRadius: 0.12
  });

  s10.addText("🚀 Future Engineering Roadmap", {
    x: 1.05,
    y: 2.98,
    w: 4.4,
    h: 0.3,
    fontSize: 12,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_PURPLE
  });

  s10.addText([
    { text: "• AI Voice Viva Testing: ", options: { bold: true, color: TEXT_WHITE, fontSize: 9.5 } },
    { text: "Speech-to-text oral examination evaluations with AI grading.\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• LMS Ecosystem Integration: ", options: { bold: true, color: TEXT_WHITE, fontSize: 9.5 } },
    { text: "One-click export to Google Classroom, Canvas, and Moodle.\n", options: { color: TEXT_MUTED, fontSize: 9 } },
    { text: "• Live Multiplayer Quiz Battles: ", options: { bold: true, color: TEXT_WHITE, fontSize: 9.5 } },
    { text: "Real-time WebSocket classroom quiz tournaments with live leaderboards.", options: { color: TEXT_MUTED, fontSize: 9 } }
  ], { x: 1.05, y: 3.32, w: 4.4, h: 1.45, fontFace: "Arial" });

  // Bottom Right: Verdict & Thank You Card
  s10.addShape(pres.ShapeType.roundRect, {
    x: 5.85,
    y: 2.85,
    w: 3.35,
    h: 2.05,
    fill: { color: "111827" },
    line: { color: "10B981", width: 1.5 },
    rectRadius: 0.12
  });

  s10.addText("🎉 Final Evaluation", {
    x: 6.05,
    y: 2.98,
    w: 2.95,
    h: 0.3,
    fontSize: 12,
    fontFace: "Arial",
    bold: true,
    color: ACCENT_GREEN
  });

  s10.addText("Thank You!\nQuestions & Discussion", {
    x: 6.05,
    y: 3.3,
    w: 2.95,
    h: 0.55,
    fontSize: 14,
    fontFace: "Arial",
    bold: true,
    color: TEXT_WHITE
  });

  s10.addText("• Live Demo: quizweeai.vercel.app\n• GitHub: AI-Quiz-Generator\n• Database: MongoDB Atlas (Cluster0)", {
    x: 6.05,
    y: 3.9,
    w: 2.95,
    h: 0.85,
    fontSize: 8.5,
    fontFace: "Arial",
    color: TEXT_MUTED
  });
}

// Save Presentation
const preferredPath = path.join(__dirname, "Quizwee_AI_Project_Presentation.pptx");
const defaultPath = path.join(__dirname, "Quizwee_AI_Presentation.pptx");

pres.writeFile({ fileName: preferredPath })
  .then(() => {
    console.log(`\nSUCCESS: PPTX Presentation created at ${preferredPath}`);
    // Also try to update defaultPath if not locked
    return pres.writeFile({ fileName: defaultPath }).catch(() => {
      console.log(`Note: ${defaultPath} is currently locked by a viewer. Master copy written to ${preferredPath}`);
    });
  })
  .catch(err => {
    console.error("PPTX Error:", err);
    process.exit(1);
  });

