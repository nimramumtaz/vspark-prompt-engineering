/**
 * Single source of truth for the VSPARK Prompt Engineering competition.
 *
 * This portal is dedicated to ONE competition — Prompt Engineering — which
 * runs four prompt categories: video, website, image generation and image
 * editing. The public site, the registration form, the status page and the
 * admin portal all read this file (directly or through /api/config) so the
 * fee, category names and durations can never drift apart.
 *
 * To change the fee, date or a category, edit it here once and restart.
 */

export const EVENT = {
  name: 'VSPARK',
  competitionName: 'Prompt Engineering',
  tagline: 'AI Prompt Engineering Competition — VSPARK 2026',
  edition: 'VSPARK 2026',
  date: 'December 10, 2026',
  dateISO: '2026-12-10T09:00:00+05:00',
  registrationCloses: 'December 5, 2026',
  venue: 'COMSATS University Islamabad, Vehari Campus',
  city: 'Vehari, Punjab, Pakistan',
  email: 'hodes@cuivehari.edu.pk',
  phone: '(067) 3602803',
  website: 'www.comsats.edu.pk/cs-vhr'
};

export const COMPETITION = {
  slug: 'prompt-engineering',
  name: 'Prompt Engineering',
  fullName: 'AI Prompt Engineering Competition',
  short: 'Video, website, image generation and image editing — driven by prompts.',
  fee: 1000,
  maxMembers: 2,
  minMembers: 1,
  duration: '120 minutes',
  teamLabel: 'Solo or team of 2',
  description:
    'One competition, four prompt categories. Receive the scenario, reference material and instructions at the start of the challenge, then engineer the prompts, generate, refine and submit your best work before the clock stops.',
  highlights: [
    'Exactly 120 minutes — generation, refinement and submission',
    'Free, Pro and Premium AI tools allowed (Runway, Kling, Sora, Midjourney, Figma AI and similar)',
    'AI assistants such as ChatGPT, Gemini and Claude may be used to build and refine prompts',
    'Prompts are part of the judging — submit your prompt log with the final output'
  ],
  judging: [
    { label: 'Prompt craft', weight: 30, note: 'Structure, specificity, iteration and control of the model' },
    { label: 'Scenario accuracy', weight: 30, note: 'How faithfully the brief and required elements are followed' },
    { label: 'Visual quality', weight: 25, note: 'Polish, consistency, continuity and finish of the output' },
    { label: 'Creativity', weight: 15, note: 'Original ideas that still respect the brief' }
  ]
};

/**
 * The four prompt categories students choose between when registering.
 * `slug` is stored on the registration record and used by every filter.
 */
export const CATEGORIES = [
  {
    slug: 'video-generation',
    name: 'Video Generation',
    short: 'Prompt a complete AI video from a written scenario.',
    tagline: 'Flagship challenge',
    icon: 'video',
    duration: '120 minutes',
    description:
      'Receive a scenario and reference images, then generate an original AI video that follows the story, keeps continuity between shots and lands the required visual elements.',
    deliverable: 'Playable MP4 with a prompt log',
    focus: [
      'Multi-shot continuity and camera movement',
      'Structured prompts for motion and style',
      'Editing, audio and subtitles allowed'
    ]
  },
  {
    slug: 'website-generation',
    name: 'Website Generation',
    short: 'Build a working, responsive website using prompts alone.',
    tagline: 'Build track',
    icon: 'browser',
    duration: '120 minutes',
    description:
      'Turn a product brief into a functional, responsive website. Prompt an AI builder or code assistant, iterate on layout and copy, and ship a live preview with the prompts that got you there.',
    deliverable: 'Live preview link + prompt log',
    focus: [
      'Prompt-driven UI, copy and layout',
      'Responsive behaviour and accessibility',
      'Iteration log that shows how the build evolved'
    ]
  },
  {
    slug: 'image-generation',
    name: 'Image Generation',
    short: 'Create original key art from a detailed prompt brief.',
    tagline: 'Visual track',
    icon: 'image',
    duration: '90 minutes',
    description:
      'Generate a set of original images that answer a creative brief — a poster series, key art or concept sheet. Composition, lighting and consistency all count, and every prompt is submitted.',
    deliverable: 'Final images + prompt log',
    focus: [
      'Composition, lighting and colour control',
      'Consistent style across a set of images',
      'Prompt refinement over multiple passes'
    ]
  },
  {
    slug: 'image-editing',
    name: 'Image Editing',
    short: 'Transform supplied photographs with precise edit prompts.',
    tagline: 'Precision track',
    icon: 'wand',
    duration: '90 minutes',
    description:
      'Start from supplied photographs and use prompt-based editing tools to relight, restyle, clean up and recompose them — without breaking the original subject or scene.',
    deliverable: 'Before/after set + prompt log',
    focus: [
      'Local edits, masking and clean results',
      'Relighting and background replacement',
      'Preserving subject identity and detail'
    ]
  }
];

/** Human-friendly category name, safe for unknown / legacy values. */
export function categoryName(slug) {
  return CATEGORIES.find((c) => c.slug === slug)?.name || 'Not specified';
}

export function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

export const STATUSES = ['pending', 'approved', 'rejected'];
export const PAYMENT_STATUSES = ['unpaid', 'paid'];
