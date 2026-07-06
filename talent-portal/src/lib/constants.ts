// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const SUB_DIMENSIONS = {
  ability: [
    {
      id: "1.1",
      title: "Agility",
      description:
        "Quickly grasps new concepts, applies them to unfamiliar situations and adapts quickly in rapidly changing and ambiguous situations.",
    },
    {
      id: "1.2",
      title: "Digital Mindset",
      description:
        "Proactively leverages technology tools, AI, or data analytics to enhance productivity and to improve business processes.",
    },
    {
      id: "1.3",
      title: "Strategic Thinking",
      description:
        "Looks beyond day-to-day tasks to understand broader business impacts and solve complex or systemic problems.",
    },
    {
      id: "1.4",
      title: "Emotional Intelligence",
      description:
        "Demonstrates deep self-awareness, manages stress effectively, and navigates interpersonal dynamics with empathy.",
    },
  ],
  aspiration: [
    {
      id: "2.1",
      title: "Drive for Growth",
      description:
        "Actively seeks stretch assignments, extra responsibilities, and constructive feedback to accelerate development.",
    },
    {
      id: "2.2",
      title: "Ambition with Flexibility",
      description:
        "Expresses a clear desire to advance into leadership or high-influence roles and the willingness to make the necessary investment (e.g. relocation, job rotation etc., if required)",
    },
    {
      id: "2.3",
      title: "Resilience & Grit",
      description:
        "Maintains high motivation and energy when facing significant obstacles, setbacks, or high-pressure organizational shifts.",
    },
    {
      id: "2.4",
      title: "Organizational Alignment",
      description:
        "Career goals align with the future direction of the company; shows long-term commitment to growing with the organization.",
    },
  ],
  leadership: [
    {
      id: "3.1",
      title: "Discretionary Effort",
      description:
        "Consistently brings energy to the team and goes beyond the baseline job description to champion new initiatives.",
    },
    {
      id: "3.2",
      title: "Leading Without Authority",
      description:
        "Successfully influences, coaches, and persuades peers, stakeholders, or cross-functional teams without formal power.",
    },
    {
      id: "3.3",
      title: "Organizational Advocacy",
      description:
        "Role models the Core Values and acts as a representative of the company's vision, direction & brand, actively building trust and alignment.",
    },
    {
      id: "3.4",
      title: "Talent Developer",
      description:
        "Supports the growth of others, shares knowledge generously, and is someone others want to work with.",
    },
  ],
} as const;

export const DEPARTMENT_TO_FUNCTION: Record<string, string> = {
  "Engineering & R&D": "Technology",
  "Design Studio": "Technology",
  "Product Management": "Product",
  "Sales & Commercial": "Commercial",
  "Business Enablement": "Operations",
};

export const DEPARTMENTS = [
  "Engineering & R&D",
  "Design Studio",
  "Product Management",
  "Sales & Commercial",
  "Business Enablement",
] as const;

export const FUNCTIONS = ["Technology", "Product", "Commercial", "Operations"] as const;

export const IMPACT_LEVELS = ["Critical", "High", "Medium", "Low"] as const;

export const ASSESSMENT_CYCLE = "FY2026";

export const SESSION_MAX_AGE = 12 * 60 * 60; // 12 hours in seconds

export const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export const MIN_EVIDENCE_CHARS = 100;
export const MIN_COMMENTS_CHARS = 100;
export const MAX_COMMENTS_CHARS = 1000;

// ── Contact Person (hardcoded per requirements) ────────────────────────────
export const CONTACT_PERSON = {
  name: "Shaik Mohammed Siddiq",
  designation: "Lead - Talent Management",
  email: "Siddiq.Shaik@adventz.com",
  mobile: "9573254626",
} as const;

// ── Bulk Upload Column Schema (order matters) ──────────────────────────────
export const EMPLOYEE_BULK_COLUMNS = [
  { key: "id",           label: "Emp ID",           required: true  },
  { key: "name",         label: "Employee Name",     required: true  },
  { key: "email",        label: "Employee Email",    required: false },
  { key: "designation",  label: "Designation",       required: true  },
  { key: "impactLevel",  label: "Impact Level",      required: false },
  { key: "entity",       label: "Employee Entity",   required: false },
  { key: "managerId",    label: "Manager ID",        required: true  },
  { key: "managerEmail", label: "Manager Email",     required: false },
  { key: "location",     label: "Location",          required: false },
  { key: "department",   label: "Department",        required: false },
] as const;

export const USER_BULK_COLUMNS = [
  { key: "name",        label: "Full Name",      required: true  },
  { key: "email",       label: "Email",          required: true  },
  { key: "role",        label: "Role",           required: true  }, // ADMIN | HR | MANAGER
  { key: "designation", label: "Designation",    required: false },
  { key: "department",  label: "Department",     required: false },
  { key: "location",    label: "Location",       required: false },
] as const;

// ── Rating Scale Labels ────────────────────────────────────────────────────
export const RATING_LABELS: Record<number, string> = {
  1: "Rarely or never displays the behaviour",
  2: "Demonstrates the behaviour sometimes",
  3: "Demonstrates the behaviour most of the time",
  4: "Demonstrates the behaviour consistently / role models the behaviour",
};

export const RATING_SHORT_LABELS: Record<number, string> = {
  1: "Rarely/Never",
  2: "Sometimes",
  3: "Most of the time",
  4: "Consistently / Role Model",
};
