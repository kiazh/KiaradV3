type Project = {
  name: string
  blurb: string
  description: string
  github: string
  year: string
}

export const projects: Project[] = [
  {
    name: 'Machina',
    blurb: 'a self-hosted multi-agent AI harness',
    description: "A self-hosted AI agent harness that runs in the terminal. The idea it's built on: a harness is a state-management system, not a prompt-engineering one. So context is a budgeted projection rebuilt per request, memory is extracted and scored to survive restarts, and every tool call binds approval to a digest of the exact action. It routes work across whatever models your accounts can reach, delegates to agents in parallel, and runs as a terminal UI, CLI, HTTP API and MCP server off your own PostgreSQL.",
    github: 'https://github.com/kiazh/Machina-Harness',
    year: '2026',
  },
  {
    name: 'MLscratch',
    blurb: 'a neural net in C, no libraries',
    description: "A neural network library in C with nothing beyond the standard library and math.h. It's a small autograd engine: you build the network as a graph, it compiles to a topological order and runs forward and backward generically, with an arena allocator underneath. Trains a 3-layer MLP with a residual skip on MNIST to ~98% test accuracy, 13k parameters, no fused ops. The README derives every gradient by hand. Still the project I'm most attached to.",
    github: 'https://github.com/kiazh/MLscratch',
    year: '2026',
  },
  {
    name: 'AES-128',
    blurb: 'AES-128 in Go, straight off the spec',
    description: "AES-128 in Go, written straight off the FIPS 197 spec with no crypto libraries. GF(2⁸) multiplication is real runtime field arithmetic via Russian-peasant double-and-add, and MixColumns is built on it. The S-box is the standard table (generating it from inverses is next); the inverse S-box is derived at startup. Passes the FIPS 197 test vector. Educational, not constant-time. C port eventually.",
    github: 'https://github.com/kiazh/AES-128',
    year: '2025',
  },
  {
    name: 'Facial Recognition',
    blurb: 'one-shot face verification with a Siamese net',
    description: "One-shot face verification with a Siamese network: it learns a similarity metric over image pairs through a shared embedding net and an L1 distance layer, so adding a new person never means retraining. A two-stage threshold tunes the false-accept/false-reject trade-off, and it verifies live off a webcam. Built a Canny-to-perspective-transform document scanner alongside it while learning TensorFlow and OpenCV.",
    github: 'https://github.com/kiazh/OpenCVProj',
    year: '2025',
  },
  {
    name: 'Esp32Network',
    blurb: 'a decision tree classifying Wi-Fi link quality on an ESP32',
    description: "An end-to-end embedded ML pipeline on an ESP32 and NRF24L01. It pulls four features off the 2.4 GHz link (packet rate, loss, inter-arrival time, burstiness) over a sliding window and runs a scikit-learn decision tree to call the link normal, weak, or interference. The tree exports to a single C header, so the ESP32 has zero runtime dependencies. Runs without any hardware too, through a Python or firmware simulator.",
    github: 'https://github.com/kiazh/Esp32Network',
    year: '2024',
  },
]

type Tab = 'anime' | 'physics' | 'games' | 'goals'

type TabContent = {
  label: string
  body: string
  items?: { title: string; note: string }[]
}

export const interests: Record<Tab, TabContent> = {
  anime: {
    label: 'Anime/Manga',
    body: "As much as people like to clown on anime and manga, it has helped me at my lowest. The best I can describe whats felt through these shows is catharsis.",
    items: [
      { title: 'Firepunch', note: "Actual masterpiece and very underrated. WAYYY better than chainsawman although not really for everyone lol." },
      { title: 'Vagabond', note: "Beautiful book 10/10 masterpeice, its a shame the author stopped writting it." },
      { title: 'Sonny Boy', note: "This anime really helped me at a time of transition and fear, not very well known but I'd consider a 10/10, would recommend" },
      { title: 'Neon Genesis Evangelion', note: "Same message, different delivery. This one was with me at my lowest and I'm never forgetting it. Would give a lot to talk to Anno" },
    ],
  },
  physics: {
    label: 'Physics',
    body: "I liked physics before I knew that was the word for it. It's the thing that makes the fiction feel reachable; concepts like time travel, aliens, and teleportation are things that physics offers hope for and lays the groundwork for mankind's next steps.",
  },
  games: {
    label: 'Games',
    body: '',
    items: [
      { title: 'Destiny 2', note: 'Peaked top 500 global in speedrank on raid.report' },
      { title: 'Elden Ring', note: 'NG+7. Best game ever made, not really up for debate' },
      { title: 'Fortnite', note: "I know. But I competed and hit Unreal, plus Champ League back when it existed" },
      { title: 'Lego Marvel Super Heroes', note: "My childhood. Played almost every Lego game and this one's still the best" },
      { title: 'Plants vs Zombies Garden Warfare 2', note: 'Played this with my childhood best friend every single time he came over' },
    ],
  },
  goals: {
    label: 'Goals',
    body: "Some of these are more realistic than others lol.",
    items: [
      { title: 'Build a time machine', note: "" },
      { title: 'Build a plane', note: 'Just want to. I love aerospace.' },
      { title: 'Actually discover something in physics', note: '' },
      { title: 'PhD in physics', note: "Roughly 10 straight years of school, we will see how it goes." },
    ],
  },
}

export const tabs: Tab[] = ['anime', 'physics', 'games', 'goals']

export const currently: { label: string; value: string; href?: string }[] = [
  {
    label: 'job',
    value: 'ML research @ UofT',
    href: 'https://cadipt.mie.utoronto.ca/'
  },
  {
    label: 'building',
    value: 'Machina',
    href: 'https://github.com/kiazh/Machina-Harness',
  },
  {
    label: 'learning',
    value: 'More abt ML',
  },
  {
    label: 'resume',
    value: 'view resume',
    href: 'https://drive.google.com/file/d/1CDJpFFRRYqZYgJDeiUFCcKTNv3SeJtHt/view?usp=sharing',
  },
]
