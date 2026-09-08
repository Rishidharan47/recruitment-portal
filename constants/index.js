// Current Date
import {
  ManageAccounts,
  Trophy,
  Campaign,
  ConnectWithoutContact,
  DesignServices,
  Palette,
  Language,
  Mobile2,
  SportsEsports,
  Analytics,
  Hub,
  Link,
  Cloud,
} from "@material-symbols-svg/react/outlined";

export const curDay = new Date().getDay();
export const curYear = new Date().getFullYear();
export const curDate = new Date().getDate();
export const curMonth = new Date().getMonth();
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Applications close at this instant. Single source of truth shared by the
// countdown on the landing page and the server-side check in
// app/api/submit-form/route.js, which used to hardcode the date separately.
export const SUBMISSION_DEADLINE =
  process.env.NEXT_PUBLIC_SUBMISSION_DEADLINE || "2026-08-23T23:59:59+05:30";

// Asked once for every applicant, outside the per-department question sets.
export const GENERIC_MOTIVATION_QUESTION =
  "Why do you want to join Organization Name?";

// Shared by the form's <select>s and by the server-side validation, so the
// options a user can pick and the values the API accepts stay in step.
export const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
export const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// Upper bounds for stored text. Generous enough not to truncate a real
// applicant, tight enough that the endpoint can't be used to write arbitrarily
// large documents.
export const FIELD_LIMITS = {
  name: 100,
  phone: 15,
  answer: 5000,
  questionKey: 400,
  questionCount: 30,
};

// Contact Links
export const LINKS = {
  instagram: "#",
  discord: "#",
  gmail: "#",
  linkedin: "#",
  x: "#",
};

// Department Details
export const reviews = [
  {
      id: "c21ca066-ab4d-40a3-943c-f170d6312bdc",
      icon: ManageAccounts,
      tone: "#8ab4f8",
      name: "Human Resources",
      description: "Build a positive community through people, culture and team support.",
    },
    {
      id: "4499a966-2740-4c36-88dd-8916a909fc77",
      icon: Campaign,
      tone: "#FF7A6B",
      name: "Content & Media",
      description: "Tell our story through content, visuals, video and social media.",
    },
    {
      id: "3936d5a2-acd9-4a98-ac97-42c2c92f5c02",
      icon: ConnectWithoutContact,
      tone: "#FFD45E",
      name: "Events & Outreach",
      description: "Plan events, workshops and collaborations with the community.",
    },
    {
      id: "e2ed9c2c-c36c-457f-a8bb-cf2e8bc7c2e1",
      icon: DesignServices,
      tone: "#FF7A6B",
      name: "Product Management",
      description: "Bridge ideas and execution to ship impactful products.",
    },
    {
      id: "d3beefc1-f8b0-4202-b26c-36e9804b6636",
      icon: Palette,
      tone: "#FFD45E",
      name: "Design",
      description: "Create intuitive experiences through UI/UX, graphics and brand design.",
    },
    {
      id: "8143de1d-db17-42fa-958d-13b10804f894",
      icon: Language,
      tone: "#8AB4F8",
      name: "Software Development",
      description: "Build products, solve real problems and work on web, mobile and backend.",
    },
    {
      id: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
      icon: Mobile2,
      tone: "#6EE7A0",
      name: "Technical Writing",
      description: "Simplify complex ideas through clear and engaging documentation.",
    },
    {
      id: "9055864f-c7dc-44cd-91d5-8759d32a496a",
      icon: SportsEsports,
      tone: "#FF7A6B",
      name: "Gaming & Esports",
      description: "Organise tournaments, manage teams and grow the campus gaming scene.",
    },
    {
      id: "c0f3b1d1-ce05-45f6-9e34-ac9443fc5fcb",
      icon: Analytics,
      tone: "#8AB4F8",
      name: "Data Science",
      description: "Turn data into insights through analytics, ML and AI.",
    },
    {
      id: "a1d920df-9eb9-49eb-b3a4-e4a3d1245ede",
      icon: Cloud,
      tone: "#FFD45E",
      name: "Hardware & IoT",
      description: "Work with electronics, embedded systems and real-world prototypes.",
    },
    {
      id: "6a89c4e2-7b19-4f32-821e-9821a41b5201",
      icon: Hub,
      tone: "#FF7A6B",
      name: "Research & Development",
      description: "Explore emerging technologies and work on experimental projects.",
    },
    {
      id: "3e9ac635-01d4-495e-aa87-a7335a2403c2",
      icon: Trophy,
      tone: "#6EE7A0",
      name: "Cybersecurity",
      description: "Build, break and secure systems through hands-on security work.",
    },
];

// The set of departments an application may be submitted for. Derived from the
// catalogue above so the two can never drift apart, and used by the server to
// reject applications for departments that do not exist.
export const DEPARTMENT_NAMES = reviews.map((department) => department.name);

export const isValidDepartment = (name) =>
  typeof name === "string" && DEPARTMENT_NAMES.includes(name);

// Questionnaire Data
export const QuestionnaireData = [
  {
    department: "Technical Writing",
    questions: [
      {
        name: "What kind of technical content do you enjoy writing or reading most?",
        type: "generic",
        placeholder: "e.g. tutorials, API docs, blog posts, explainers"
      },
      {
        name: "Share a link to something you've written, or describe a piece of writing you're proud of and why it worked.",
        type: "long-text",
        placeholder: "A blog post, README, report, or documentation you wrote"
      },
      {
        name: "How do you usually simplify a complex technical topic for a non-expert reader?",
        type: "generic",
        placeholder: "e.g. analogies, diagrams, step-by-step breakdowns"
      },
      {
        name: "Which tools have you used for writing or publishing content?",
        type: "generic",
        placeholder: "e.g. Markdown, Notion, Google Docs, static site generators"
      },
      {
        name: "Describe a time you had to explain something technical to someone with a very different background from yours. What did you do differently?",
        type: "long-text",
        placeholder: "The topic, the audience, and what you changed in your explanation"
      }
    ],
  },
  {
    department: "Research & Development",
    questions: [
      {
        name: "What's an emerging technology or research area you've been following, and what interests you about it?",
        type: "long-text",
        placeholder: "A technology, paper, or field you've read up on recently"
      },
      {
        name: "Describe an experimental project or side project you built just to explore an idea, even if it didn't fully work.",
        type: "long-text",
        placeholder: "What you tried, what you learned, what broke"
      },
      {
        name: "Preferred area of research",
        type: "short-text",
        placeholder: "e.g. AI/ML, robotics, blockchain, HCI"
      },
      {
        name: "How comfortable are you reading and applying ideas from academic papers or technical documentation? Give an example.",
        type: "long-text",
        placeholder: "A paper or spec you read and what you took from it"
      }
    ],
  },
  {
    department: "Hardware & IoT",
    questions: [
      {
        name: "Years of experience with electronics or embedded systems",
        type: "short-text",
        placeholder: "e.g. 1 year, self-taught, none yet"
      },
      {
        name: "Which hardware platforms or tools have you worked with?",
        type: "generic",
        placeholder: "e.g. Arduino, Raspberry Pi, ESP32, soldering, PCB design"
      },
      {
        name: "Describe a hardware or IoT project you've built or want to build, including any prototypes or circuits involved.",
        type: "long-text",
        placeholder: "What it does, the components used, what stage it's at"
      },
      {
        name: "What's a hardware problem you've debugged (or would want to learn to debug) - a circuit that didn't work, a sensor giving bad readings, anything like that?",
        type: "long-text",
        placeholder: "The symptom, what you suspected, how you'd approach it"
      }
    ],
  },
  {
    department: "Cybersecurity",
    questions: [
      {
        name: "Have you used any security tools before?",
        type: "short-text",
        placeholder: "e.g. Burp Suite, Wireshark, nmap, or none yet"
      },
      {
        name: "Any CTFs or security challenges you've attempted?",
        type: "short-text",
        placeholder: "e.g. picoCTF, HackTheBox, or none yet"
      },
      {
        name: "Which area of security interests you most?",
        type: "short-text",
        placeholder: "e.g. web security, network security, cryptography"
      },
      {
        name: "Comfort level with Linux and the command line",
        type: "short-text",
        placeholder: "e.g. beginner, comfortable, advanced"
      },
      {
        name: "What draws you to cybersecurity specifically?",
        type: "generic",
        placeholder: "e.g. problem-solving, ethical hacking, protecting systems"
      },
      {
        name: "Describe a time you found or thought about a security flaw in something you used, even informally - an app, a website, a login flow.",
        type: "long-text",
        placeholder: "What you noticed and why it seemed like a weakness"
      }
    ],
  },
  {
    department: "Data Science",
    questions: [
      {
        name: "What got you interested in data science?",
        type: "generic",
        placeholder: "e.g. a course, a project, an internship, curiosity"
      },
      {
        name: "Which languages or libraries have you used for data work?",
        type: "generic",
        placeholder: "e.g. Python, pandas, NumPy, scikit-learn, R"
      },
      {
        name: "Have you worked with machine learning models before?",
        type: "generic",
        placeholder: "e.g. classification, regression, a Kaggle competition"
      },
      {
        name: "Familiarity with SQL",
        type: "short-text",
        placeholder: "e.g. beginner, comfortable, advanced"
      },
      {
        name: "Describe a data project you've worked on, from the dataset to the insight or model you produced.",
        type: "long-text",
        placeholder: "The dataset, your approach, and what you found"
      },
      {
        name: "A dataset or domain you'd love to explore",
        type: "short-text",
        placeholder: "e.g. sports stats, climate data, campus data"
      },
      {
        name: "How would you explain a technical result from your work to someone without a data background?",
        type: "long-text",
        placeholder: "Pick a real or hypothetical result and explain it simply"
      }
    ],
  },
  {
    department: "Design",
    questions: [
      {
        name: "What kind of design work do you enjoy most - UI, branding, illustration, motion, something else?",
        type: "long-text",
        placeholder: "Your favourite kind of design work and why"
      },
      {
        name: "Tools you design with",
        type: "short-text",
        placeholder: "e.g. Figma, Adobe XD, Illustrator, Photoshop"
      },
      {
        name: "Link to your portfolio or design work",
        type: "short-text",
        placeholder: "A Behance, Dribbble, Drive folder, or Instagram link"
      },
      {
        name: "How do you usually start a new design - research, sketching, moodboards?",
        type: "generic",
        placeholder: "Walk through your typical process"
      },
      {
        name: "Describe a design decision you made that you had to defend or explain to someone else.",
        type: "generic",
        placeholder: "The decision, the pushback, and how you responded"
      },
      {
        name: "What's a piece of design (not necessarily your own) that you think is done really well, and why?",
        type: "generic",
        placeholder: "An app, poster, website, or product you admire"
      }
    ],
  },
  {
    department: "Gaming & Esports",
    questions: [
      {
        name: "Games or genres you're most into",
        type: "short-text",
        placeholder: "e.g. Valorant, FIFA, strategy games, all of the above"
      },
      {
        name: "Have you organised, managed, or competed in any gaming events or tournaments before?",
        type: "generic",
        placeholder: "What the event was and your role in it"
      },
      {
        name: "What would you do differently to grow the campus gaming and esports scene?",
        type: "long-text",
        placeholder: "An idea for events, community building, or outreach"
      },
      {
        name: "Describe a time you had to coordinate a team or event under time pressure.",
        type: "long-text",
        placeholder: "What happened and how you kept things on track"
      },
      {
        name: "What's a gaming community (online or in-person) that you think does a great job engaging its members? What do they do well?",
        type: "long-text",
        placeholder: "A Discord server, club, or community and what stands out"
      },
      {
        name: "If you were running a campus gaming event with a limited budget, how would you prioritise spending it?",
        type: "long-text",
        placeholder: "Venue, prizes, promotion, equipment - your call"
      },
      {
        name: "Which role interests you more: playing competitively, or organising and managing events?",
        type: "generic",
        placeholder: "e.g. player, organiser, both, streaming/content"
      }
    ],
  },
  {
    department: "Human Resources",
    questions: [
      {
        name: "Why do you want to be part of the team that builds this club's culture?",
        type: "generic",
        placeholder: "2-4 sentences"
      },
      {
        name: "Describe a time you helped resolve a disagreement or conflict within a group you were part of.",
        type: "generic",
        placeholder: "What happened and what you did"
      },
      {
        name: "How would you go about making new members feel welcome and included?",
        type: "generic",
        placeholder: "A concrete idea, not just \"be friendly\""
      },
      {
        name: "Tell us about a team or community (a club, sports team, workplace, volunteer group) you were part of that had a strong culture. What made it work, and what was your role in it?",
        type: "long-text",
        placeholder: "The group, what made its culture strong, and your part in it"
      },
      {
        name: "If a member of the club came to you with a complaint about another member, how would you handle the conversation? What would you want to make sure you did right?",
        type: "long-text",
        placeholder: "Walk through how you'd approach it, step by step"
      }
    ],
  },
  {
    department: "Events & Outreach",
    questions: [
      {
        name: "How many events have you helped plan or run before, in any context?",
        type: "generic",
        placeholder: "e.g. college fests, school events, volunteering"
      },
      {
        name: "What's an event you attended that was really well organised? What made it work?",
        type: "generic",
        placeholder: "The event and what stood out about how it was run"
      },
      {
        name: "Describe your role in organising an event, including anything that went wrong and how it was handled.",
        type: "long-text",
        placeholder: "What the event was, your responsibilities, and what you'd do differently"
      },
      {
        name: "How would you approach getting a company or organisation to sponsor or collaborate with the club on an event?",
        type: "long-text",
        placeholder: "Your pitch, who you'd reach out to, what you'd offer them"
      },
      {
        name: "What's an event or collaboration you'd love to bring to the club if you had the resources?",
        type: "generic",
        placeholder: "A workshop, hackathon, meetup, or partnership idea"
      }
    ],
  },
  {
    department: "Content & Media",
    questions: [
      {
        name: "What kind of content do you most enjoy creating - writing, video, graphics, photography, something else?",
        type: "generic",
        placeholder: "Pick your strongest area and say why"
      },
      {
        name: "Link to something you've created",
        type: "short-text",
        placeholder: "An Instagram post, video, article, or design"
      },
      {
        name: "How would you describe our social media presence right now, and what would you improve?",
        type: "generic",
        placeholder: "Be specific - tone, frequency, format, platforms"
      }
    ],
  },
  {
    department: "Product Management",
    questions: [
      {
        name: "Describe a product (an app, website, or physical product) you use often and would redesign if you could. What would you change and why?",
        type: "long-text",
        placeholder: "The product, the problem with it, your proposed fix"
      },
      {
        name: "Walk us through how you'd go from an idea to a shipped feature - what steps would you take and who would you involve?",
        type: "long-text",
        placeholder: "Your process, from idea to launch"
      },
      {
        name: "Any prior product, project management, or leadership experience?",
        type: "short-text",
        placeholder: "e.g. led a project, managed a small team, none yet"
      },
      {
        name: "How do you decide what to prioritise when there's more to build than time allows?",
        type: "generic",
        placeholder: "e.g. impact vs effort, user feedback, deadlines"
      },
      {
        name: "Tools you've used for planning or tracking work",
        type: "short-text",
        placeholder: "e.g. Notion, Trello, Jira, spreadsheets"
      },
      {
        name: "Describe a time you had to say no to a feature or idea someone else wanted. How did you handle it?",
        type: "generic",
        placeholder: "The idea, why you pushed back, how it landed"
      },
      {
        name: "What does a good working relationship between a PM and a design/engineering team look like to you?",
        type: "generic",
        placeholder: "Be specific about what \"good\" looks like day to day"
      },
      {
        name: "A product you admire and why",
        type: "short-text",
        placeholder: "Any app or product, one or two lines on why"
      },
      {
        name: "How do you usually gather feedback from users?",
        type: "short-text",
        placeholder: "e.g. surveys, interviews, usage data, informal chats"
      },
      {
        name: "If you joined this department, what's the first thing you'd want to work on or improve?",
        type: "long-text",
        placeholder: "Be specific - a feature, a process, anything"
      }
    ],
  },
  {
    department: "Software Development",
    questions: [
      {
        name: "What languages, frameworks or tools are you most comfortable with (e.g. JavaScript, Python, React, Node)? Tell us how you've used them.",
        type: "long-text",
        placeholder: "List your stack and a project where you used it"
      },
      {
        name: "Why is \"it works on my machine\" a red flag in team development, and what concrete habits or setup choices do you use to ensure your code works on everyone else's environment too?",
        type: "generic",
        placeholder: "e.g. version control, environment files, containers, CI"
      },
      {
        name: "Describe a bug that took you a long time to track down. What was it, how did you eventually find it, and what did you change about how you debug afterward?",
        type: "long-text",
        placeholder: "The symptom, your debugging process, and the fix"
      },
      {
        name: "Tell us about a project - solo or with a team - you're proud of. What was your specific contribution, and what was the hardest technical decision you made (architecture, tooling, trade-offs)?",
        type: "long-text",
        placeholder: "The project, your role, and the decision you're proud of"
      },
      {
        name: "Link to your GitHub or a project you've built",
        type: "short-text",
        placeholder: "A GitHub profile, repo link, or deployed project"
      },
      {
        name: "How do you approach learning a new technology or framework you've never used before?",
        type: "generic",
        placeholder: "e.g. docs first, build something small, follow a course"
      },
      {
        name: "What does good code review feedback look like to you, on either side of it?",
        type: "generic",
        placeholder: "As the reviewer, or as the person receiving it"
      },
      {
        name: "Comfort with version control (Git)",
        type: "short-text",
        placeholder: "e.g. beginner, comfortable, advanced"
      }
    ],
  },
];

// Sample Admin Data
export const sampleAdminHeader = [
  {
    Header: "SrNo",
    accessor: "srno",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Email",
    accessor: "email",
  },
  {
    Header: "Department",
    accessor: "department",
  },
];

// Headers for CSV exports
export const CSV_Header = [
  {
    label: "Name",
    key: "Name",
  },
  {
    label: "Email",
    key: "Email",
  },
  {
    label: "Registration Number",
    key: "RegistrationNumber",
  },
  {
    label: "Phone",
    key: "Phone",
  },
  {
    label: "Department",
    key: "Department",
  },

  {
    label: "Preference",
    key: "Pref",
  },
  {
    label: "Shortlisted",
    key: "shortlisted",
  },
  {
    label: "Questions",
    key: "Questions",
  },
];

// Mailing Templates
export const mailingTemplate = {
  Interview:
    "<p>Edit content</p><br><p>Thank you for applying to Organization Name. We are excited to let you know that you have been shortlisted for joining the #dept Department!</p><p>We look forward to your active participation!</p>",
};
