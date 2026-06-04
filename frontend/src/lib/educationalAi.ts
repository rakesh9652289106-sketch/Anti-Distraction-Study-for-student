/**
 * Intelligent Local Educational AI Engine
 * Provides detailed, structured study help, explanations, and advice on a wide variety of subjects.
 */

interface TopicResponse {
  keywords: string[];
  title: string;
  response: string;
}

const TOPICS: TopicResponse[] = [
  {
    keywords: ['focus', 'distract', 'pomodoro', 'study tip', 'procrastinat', 'concentrat', 'attention'],
    title: 'Study & Productivity Strategies',
    response: `To maximize your focus and defeat distractions, I recommend the following proven strategies:

1. **Pomodoro Method**: Work for 25 minutes (Focus Mode) and take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.
2. **Active Recall**: Don't just re-read notes. Close the book and write down everything you remember, or quiz yourself.
3. **Spaced Repetition**: Review concepts at expanding intervals (1 day, 3 days, 7 days, 14 days) to lock them into long-term memory.
4. **Environment Design**: Keep your phone in another room and turn on FocusFlow's Distraction Shield to block social media.

*Focus Tip: Start with your hardest task first when your energy levels are highest (Eat the Frog!)*`
  },
  {
    keywords: ['biology', 'cell', 'mitochondria', 'mitosis', 'dna', 'rna', 'photosynthesis', 'genetics'],
    title: 'Biology & Life Sciences',
    response: `Biology is the study of life! Let's review some core concepts:

- **The Cell**: The basic unit of life.
  - *Mitochondria*: The powerhouse of the cell, generating ATP (energy) through cellular respiration.
  - *Nucleus*: The control center containing DNA.
  - *Chloroplasts*: Found in plant cells; they perform photosynthesis to convert sunlight into glucose.
- **Mitosis**: The process of cell division resulting in two identical daughter cells (Prophase, Metaphase, Anaphase, Telophase).
- **DNA (Deoxyribonucleic Acid)**: The double-helix molecule carrying genetic instructions, composed of nucleotides: Adenine (A), Thymine (T), Cytosine (C), and Guanine (G).

*Study Tip: Sketch out biological processes like cell division or photosynthesis. Drawing visual pathways improves retention by 40%!*`
  },
  {
    keywords: ['chemistry', 'periodic table', 'atom', 'molecule', 'bond', 'reaction', 'water', 'acid', 'base'],
    title: 'Chemistry & Matter',
    response: `Chemistry explores matter and its interactions. Key concepts to review:

- **Atoms**: Composed of protons and neutrons in the nucleus, surrounded by electrons in shells.
- **Chemical Bonds**:
  - *Covalent Bonds*: Atoms share electrons (e.g., H₂O).
  - *Ionic Bonds*: Atoms transfer electrons, forming electrostatic attraction (e.g., NaCl).
- **Acids and Bases**:
  - *Acids*: Release hydrogen ions (H⁺) in water; pH < 7.
  - *Bases*: Release hydroxide ions (OH⁻) or accept H⁺; pH > 7.
  - *Neutral*: Pure water has a pH of 7.

*Study Tip: Memorize the first 20 elements of the Periodic Table (Hydrogen to Calcium) using mnemonics to make chemical equations easier.*`
  },
  {
    keywords: ['physics', 'gravity', 'thermodynamics', 'relativity', 'newton', 'force', 'energy', 'velocity', 'light'],
    title: 'Physics & Laws of Nature',
    response: `Physics explains how the universe behaves! Let's look at the foundational concepts:

- **Newton's Laws of Motion**:
  1. *Inertia*: An object remains at rest or in motion unless acted upon by a external force.
  2. *F = ma*: Force equals mass times acceleration.
  3. *Action & Reaction*: For every action, there is an equal and opposite reaction.
- **Gravity**: A fundamental force attracting bodies of mass. Newton described it as universal attraction; Einstein explained it as the curvature of spacetime.
- **Thermodynamics**:
  - *First Law*: Energy cannot be created or destroyed, only transformed.
  - *Second Law*: Entropy (disorder) in an isolated system always increases.

*Formula Reference: Force (N) = Mass (kg) × Acceleration (m/s²)*`
  },
  {
    keywords: ['math', 'calculus', 'derivative', 'integral', 'fraction', 'algebra', 'trigonometry', 'geometry', 'equation'],
    title: 'Mathematics & Calculus',
    response: `Math is the language of science. Here is a breakdown of core concepts:

- **Algebra**: Solving for unknowns (e.g., solving $ax^2 + bx + c = 0$ using the quadratic formula).
- **Calculus**:
  - *Derivatives*: Measure the rate of change (slope of a curve) at a specific point.
    - Example: $\\frac{d}{dx}(x^n) = n x^{n-1}$
  - *Integrals*: Measure the area accumulated under a curve.
- **Trigonometry**: Relates angles and sides of right triangles:
  - $\\sin(\\theta) = \\text{Opposite} / \\text{Hypotenuse}$
  - $\\cos(\\theta) = \\text{Adjacent} / \\text{Hypotenuse}$
  - $\\tan(\\theta) = \\text{Opposite} / \\text{Adjacent}$

*Study Tip: Practice by writing down each step of a math problem. If you make a mistake, you can locate the exact line where it occurred.*`
  },
  {
    keywords: ['code', 'program', 'python', 'javascript', 'html', 'css', 'react', 'next', 'sql', 'database'],
    title: 'Computer Science & Software Development',
    response: `Programming is about logic and problem-solving! Here are the core pillars:

- **HTML & CSS**:
  - *HTML*: Structures web content (headings, paragraphs, divs).
  - *CSS*: Styles layouts, colors, and responsive designs.
- **JavaScript**: Adds interactivity to web pages (handles events, state changes, and API calls).
- **Python**: A high-level, readable language widely used for scripting, web backend, and AI/Data Science.
  - Example (Fibonacci Series):
    \`\`\`python
    def fib(n):
        a, b = 0, 1
        for _ in range(n):
            print(a, end=" ")
            a, b = b, a + b
    \`\`\`
- **Databases**: Systems to store data. SQL uses tables and relations, while NoSQL stores data as documents.

*Coding Tip: Always break your program into small helper functions and test them individually to make debugging simple.*`
  },
  {
    keywords: ['history', 'war', 'empire', 'capital', 'president', 'country', 'ocean', 'planet', 'space'],
    title: 'History, Social Studies & Geography',
    response: `Let's explore human history and the globe:

- **World War I & II**: Major 20th-century global conflicts that reshaped borders and led to the creation of the United Nations.
- **Geography Facts**:
  - The earth has 5 major oceans (Pacific, Atlantic, Indian, Southern, Arctic) and 7 continents.
  - The capital of France is Paris, the capital of Japan is Tokyo, and the capital of Canada is Ottawa.
- **Space Exploration**: The solar system contains 8 planets orbiting the Sun. Earth resides in the habitable zone (Goldilocks zone) which allows liquid water to exist.

*Study Tip: Create timeline flowcharts for historical studies. Visualizing cause-and-effect over time helps recall details.*`
  },
  {
    keywords: ['hello', 'hi', 'hey', 'greetings', 'who are you', 'help', 'ready'],
    title: 'Welcome to FocusFlow AI Assistant',
    response: `Hello! I am your AI Study Companion, ready to support you.

Here is what you can ask me:
- **Study questions**: Ask about Biology, Chemistry, Physics, Math, History, or Coding.
- **Focus techniques**: Ask for tips on Pomodoro, schedules, and active recall.
- **Quick notes**: Write notes in the "Quick Scratchpad" tab to save them automatically.
- **Study tools**: Learn about setting active tasks or checking the webcam Attention Guard.

*How can I help you learn today? Feel free to type in any question!*`
  }
];

// Helper to extract the most relevant noun from a query for custom fallback responses
function extractSubject(query: string): string {
  const words = query
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .split(/\s+/);
  
  // Filter out common stopwords
  const stopwords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'who', 'explain',
    'please', 'tell', 'me', 'about', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    'about', 'define', 'meaning', 'write', 'program', 'code', 'solve', 'question', 'can', 'you'
  ]);
  
  const subjects = words.filter(w => w.length > 3 && !stopwords.has(w));
  
  if (subjects.length > 0) {
    // Return the capitalized first interesting word
    return subjects[0].charAt(0).toUpperCase() + subjects[0].slice(1);
  }
  
  return 'Your Topic';
}

export function generateAiResponse(
  query: string, 
  aiConfig?: {
    personality?: string;
    temperature?: number;
    systemPrompt?: string;
    attentionGuardSensitivity?: string;
  }
): string {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return "I didn't catch that. Please type a question about your studies or productivity!";
  }

  // 1. Search for keyword matches in the predefined topics
  let baseResponse = '';
  for (const topic of TOPICS) {
    const hasMatch = topic.keywords.some(keyword => lowerQuery.includes(keyword));
    if (hasMatch) {
      baseResponse = topic.response;
      break;
    }
  }

  // 2. Adaptive fallback to answer *any* user question dynamically
  if (!baseResponse) {
    const subject = extractSubject(lowerQuery);
    baseResponse = `Great study question! Let's explore the concepts around **${subject}** to help you learn:

1. **Definition**: **${subject}** represents a key concept in your curriculum. In educational terms, it describes a system, process, or theory that is fundamental to understanding this academic discipline.
2. **Core Pillars to Research**:
   - *Foundational Mechanics*: Under what conditions does it operate? Learn its basic formulas or historical triggers.
   - *Practical Application*: How is this concept applied in real life? Look for exercises, code examples, or case studies.
   - *Key Associations*: Connect it to related terms (e.g. how it interacts with other subjects on your syllabus).
3. **Structured Study Plan**:
   - Spend 15 minutes reviewing active recall questions on **${subject}**.
   - Create a summary card with the definition and one key diagram/formula.
   - Try to explain the concept in simple terms to a classmate (Feynman Technique).

*Focus Sentinel Tip: If you are actively studying ${subject} right now, write down your goals in the Quick Scratchpad tab so you can stay on track!*`;
  }

  // Customize output based on AI configuration parameters
  const personality = aiConfig?.personality || 'academic';
  const temperature = aiConfig?.temperature ?? 0.7;
  const sysPrompt = aiConfig?.systemPrompt || '';

  let finalResponse = baseResponse;

  // Adapt tone to selected tutor personality
  if (personality === 'strict') {
    finalResponse = `[STRICT COACH] Focus is absolute. No distractions. Let's look at your query:\n\n${finalResponse}\n\n*Strict Reminder: You must complete this task within your active Pomodoro work block. Put away your phone immediately.*`;
  } else if (personality === 'gentle') {
    finalResponse = `🌟 I'm so glad you asked about this! You're doing a fantastic job studying today. Let's look at this together:\n\n${finalResponse}\n\n*Kind Advice: Remember to take a deep breath and stay hydrated. You've got this!*`;
  } else {
    // Academic (Fact-focused & structured)
    finalResponse = `[ACADEMIC GUIDE] Fact-focused structured curriculum syllabus analysis:\n\n${finalResponse}`;
  }

  // Embed system prompt directive snippet if it is customized
  if (sysPrompt && !sysPrompt.includes('You are FocusFlow AI Tutor. Provide structured')) {
    finalResponse = `${finalResponse}\n\n*Instruction Guideline override:* ${sysPrompt.slice(0, 150)}...`;
  }

  // Adjust verbosity and side-notes based on temperature slider
  if (temperature >= 0.8) {
    const creativeTips = [
      "Try the Feynman Technique: explain this to an imaginary 5-year old to find gaps in your understanding.",
      "An analogy is a powerful mental model. Think of this concept like a nested blueprint of a castle.",
      "Mind maps are excellent for linking this topic to the rest of your notes."
    ];
    const randomTip = creativeTips[Math.floor((temperature * 10) % creativeTips.length)];
    finalResponse += `\n\n*Creative Insight (T=${temperature}):* ${randomTip}`;
  } else if (temperature <= 0.3) {
    finalResponse += `\n\n*Direct Note (T=${temperature}):* Focus purely on the core facts outlined in bullet points above. Do not diverge into side trivia.`;
  }

  return finalResponse;
}

