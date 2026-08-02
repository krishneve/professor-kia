import { SyllabusData, ExaminerPersona } from '../types';

export const EXAMINER_PERSONAS: ExaminerPersona[] = [
  {
    id: 'rigorous',
    name: 'Prof. Vance Sterling',
    title: 'Department Chair & Chief Examiner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    voiceName: 'Charon',
    description: 'Challenging & thorough. Probes edge cases, demands precise formal terminology, and tests theoretical bounds.',
    style: 'Demands formal mathematical definitions, handles edge cases, zero tolerance for superficial buzzwords.',
    accentColor: 'indigo'
  },
  {
    id: 'socratic',
    name: 'Dr. Maya Lin',
    title: 'Socratic Scholar & Associate Professor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    voiceName: 'Kore',
    description: 'Guides candidates through conceptual dilemmas using counter-questions and thought experiments.',
    style: 'Uses "What if...", counter-examples, and guided reasoning to help candidate uncover their own errors.',
    accentColor: 'teal'
  },
  {
    id: 'industry',
    name: 'Leo Thorne',
    title: 'Principal Systems Architect (Industry Specialist)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    voiceName: 'Puck',
    description: 'Pragmatic & engineering-focused. Evaluates trade-offs, real-world failure scenarios, and scalability bounds.',
    style: 'Focuses on production failure modes, architectural trade-offs, latency vs throughput, and system reliability.',
    accentColor: 'amber'
  },
  {
    id: 'supportive',
    name: 'Prof. Aris Thorne',
    title: 'Pedagogical Mentor & Research Director',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    voiceName: 'Zephyr',
    description: 'Encouraging & structured. Provides constructive scaffolding when candidates encounter difficulty.',
    style: 'Constructive feedback, offers helpful hints when candidate is stuck, tests incremental mastery.',
    accentColor: 'emerald'
  }
];

export const DEMO_SYLLABI: SyllabusData[] = [
  {
    id: 'dist-sys-raft',
    title: 'Distributed Systems & Raft Consensus Protocol',
    code: 'CS-702',
    domain: 'Computer Science / Distributed Computing',
    description: 'Leader election, log replication, safety invariants, network partitioning, and split-brain resolution in state machine replication.',
    rawText: `
Course: CS-702 Distributed Systems
Topic: Consensus Algorithms & Raft Protocol

1. Leader Election:
- Term numbers, Randomized election timeouts, Heartbeat RPCs (AppendEntries).
- Split-vote prevention, majority quorum rule (N/2 + 1).

2. Log Replication & Safety Invariants:
- Uncommitted vs committed entries, Leader Completeness Property.
- Log Matching Property: if two logs contain an entry with same index and term, they are identical in all entries up through the given index.
- Election restriction: candidate must have log at least as up-to-date as receiver's log.

3. Network Partitions & Edge Cases:
- Split-brain scenarios, stale leaders, term monotonicity.
- Read index optimization and lease read semantics.
`,
    cognitiveDistribution: {
      remembering: 15,
      understanding: 25,
      applying: 30,
      analyzing: 20,
      evaluating: 10
    },
    concepts: [
      {
        id: 'c1',
        title: 'Randomized Election Timeouts',
        category: 'Leader Election',
        taxonomyLevel: 'Applying',
        importance: 'Core',
        description: 'Prevents split votes by staggering candidate candidacy transitions across nodes.'
      },
      {
        id: 'c2',
        title: 'Leader Completeness Invariant',
        category: 'Safety',
        taxonomyLevel: 'Analyzing',
        importance: 'Core',
        description: 'If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.'
      },
      {
        id: 'c3',
        title: 'Log Matching Property',
        category: 'Log Replication',
        taxonomyLevel: 'Understanding',
        importance: 'Core',
        description: 'Guarantees state machine consistency across all follower nodes.'
      },
      {
        id: 'c4',
        title: 'Split-Brain & Minority Partition Handling',
        category: 'Fault Tolerance',
        taxonomyLevel: 'Evaluating',
        importance: 'Advanced',
        description: 'Minority partitions accept client writes but cannot commit them due to lack of quorum.'
      }
    ],
    misconceptions: [
      {
        id: 'm1',
        concept: 'Log Commitment',
        flawedBelief: 'A leader can commit a log entry from a previous term directly by counting replicas.',
        correctUnderstanding: 'Raft leaders never commit log entries from previous terms by counting replicas; they only commit entries from their current term by counting replicas.',
        probingQuestion: 'Why does Raft prohibit a leader from committing an entry from an earlier term based on replica count alone?'
      },
      {
        id: 'm2',
        concept: 'Network Partitioning',
        flawedBelief: 'When a network partition occurs, both sides elect a new leader and diverge state.',
        correctUnderstanding: 'Only the partition containing a majority quorum (N/2 + 1) can elect a valid leader and commit entries.',
        probingQuestion: 'Suppose a 5-node cluster is partitioned into 2 nodes and 3 nodes. What happens to write client requests sent to the 2-node side?'
      }
    ],
    suggestedQuestions: [
      'Explain how Raft ensures state machine safety when a leader crashes mid-way through replicating an entry.',
      'What specifically happens if two candidates initiate election at the exact same millisecond?',
      'How does Raft guarantee that a newly elected leader contains all previously committed log entries?'
    ]
  },
  {
    id: 'deep-learning-transformers',
    title: 'Deep Learning & Transformer Architectures',
    code: 'AI-810',
    domain: 'Artificial Intelligence & Machine Learning',
    description: 'Scaled Dot-Product Self-Attention, Multi-Head Attention, Positional Encodings, Residual Connections, Layer Normalization, and KV-Caching.',
    rawText: `
Course: AI-810 Advanced Deep Learning
Topic: Transformer Architectures & Self-Attention Mechanics

1. Self-Attention Formulation:
- Query (Q), Key (K), Value (V) projections.
- Softmax((QK^T) / sqrt(d_k)) * V scaling factor rationale (vanishing gradient prevention).

2. Multi-Head Attention & Positional Encoding:
- Parallel representation subspaces.
- Sinusoidal vs Rotary Positional Embeddings (RoPE).

3. Computational Complexity & Optimizations:
- O(N^2) time and memory bottleneck.
- FlashAttention (tiling & IO-awareness), KV-Cache for autoregressive generation.
`,
    cognitiveDistribution: {
      remembering: 10,
      understanding: 20,
      applying: 35,
      analyzing: 25,
      evaluating: 10
    },
    concepts: [
      {
        id: 'c1',
        title: 'Scaled Dot-Product Attention Rationale',
        category: 'Attention Mechanism',
        taxonomyLevel: 'Analyzing',
        importance: 'Core',
        description: 'Scaling by sqrt(d_k) prevents dot products from growing excessively large, avoiding extreme softmax gradients.'
      },
      {
        id: 'c2',
        title: 'KV-Cache Mechanism',
        category: 'Inference Acceleration',
        taxonomyLevel: 'Applying',
        importance: 'Advanced',
        description: 'Stores previously computed Key and Value vectors during autoregressive generation to avoid recalculating past tokens.'
      },
      {
        id: 'c3',
        title: 'Rotary Position Embeddings (RoPE)',
        category: 'Position Encoding',
        taxonomyLevel: 'Analyzing',
        importance: 'Core',
        description: 'Encodes relative positional information by rotating Query and Key vectors in complex space.'
      }
    ],
    misconceptions: [
      {
        id: 'm1',
        concept: 'Self-Attention Scaling',
        flawedBelief: 'Division by sqrt(d_k) in attention is purely for normalization of token lengths.',
        correctUnderstanding: 'It scales down vector dot products so variance remains 1, preventing softmax from pushing gradients into near-zero derivative regions.',
        probingQuestion: 'What happens mathematically to the gradients of the attention weights as the dimension d_k approaches 1024 if we remove the sqrt(d_k) factor?'
      }
    ],
    suggestedQuestions: [
      'Walk me through the Query, Key, Value matrix multiplication steps for a single self-attention layer.',
      'Why does standard self-attention have quadratic complexity O(N^2) with respect to sequence length N?',
      'How does KV caching alter memory bandwidth requirements during token generation?'
    ]
  },
  {
    id: 'clinical-pathology-hematology',
    title: 'Clinical Pathology: Hematologic Disorders',
    code: 'MED-504',
    domain: 'Medicine & Health Sciences',
    description: 'Differential diagnosis of anemia, microcytic vs macrocytic etiologies, iron metabolism, reticulocyte response, and peripheral blood smear analysis.',
    rawText: `
Course: MED-504 Clinical Hematology & Pathology
Topic: Microcytic Anemia & Iron Metabolism Diagnostics

1. Morphologic Classification:
- MCV < 80 fL (Microcytic), MCV 80-100 fL (Normocytic), MCV > 100 fL (Macrocytic).
- Differential for Microcytic: Iron Deficiency Anemia (IDA), Thalassemia Trait, Anemia of Chronic Disease (ACD), Sideroblastic Anemia.

2. Laboratory Biomarkers:
- Serum Ferritin, Total Iron Binding Capacity (TIBC), Transferrin Saturation, Hemoglobin Electrophoresis.
- Reticulocyte Index calculation for bone marrow responsiveness.

3. Pathophysiology:
- Hepcidin regulation during systemic inflammation vs systemic iron deficit.
`,
    cognitiveDistribution: {
      remembering: 20,
      understanding: 30,
      applying: 30,
      analyzing: 15,
      evaluating: 5
    },
    concepts: [
      {
        id: 'c1',
        title: 'Hepcidin Pathophysiology',
        category: 'Pathophysiology',
        taxonomyLevel: 'Analyzing',
        importance: 'Core',
        description: 'Master iron regulatory hormone elevated during inflammatory states, degrading ferroportin.'
      },
      {
        id: 'c2',
        title: 'Ferritin vs TIBC Interpretation',
        category: 'Diagnostics',
        taxonomyLevel: 'Applying',
        importance: 'Core',
        description: 'Differentiating iron deficiency (low ferritin, high TIBC) from anemia of chronic disease (normal/high ferritin, low TIBC).'
      }
    ],
    misconceptions: [
      {
        id: 'm1',
        concept: 'Anemia Biomarkers',
        flawedBelief: 'Normal or high serum ferritin strictly rules out iron deficiency in an inflammatory state.',
        correctUnderstanding: 'Ferritin is an acute-phase reactant; in chronic inflammation, ferritin can be falsely normal/elevated despite true cellular iron deficiency.',
        probingQuestion: 'A patient with rheumatoid arthritis presents with MCV of 74 fL and ferritin of 150 ng/mL. How do you determine if co-existing iron deficiency is present?'
      }
    ],
    suggestedQuestions: [
      'How do you clinically differentiate Iron Deficiency Anemia from Beta-Thalassemia Trait on a CBC and lab panel?',
      'Explain the mechanism by which Hepcidin leads to functional iron deficiency in systemic inflammation.',
      'What is the diagnostic significance of a high reticulocyte count in the context of acute microcytic anemia?'
    ]
  }
];
