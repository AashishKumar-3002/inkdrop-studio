import { SECTION_IDS, SectionId } from "./types";

export type QuestionType = "single" | "multi" | "text";

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  section: SectionId;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: QuestionOption[];
  customPlaceholder?: string;
  /** Only shown in the deep-dive / advanced bank, not onboarding. */
  advanced?: boolean;
}

export const SECTION_META: Record<
  SectionId,
  { label: string; blurb: string }
> = {
  feel: {
    label: "Feel & Tone",
    blurb: "What should reading this novel feel like?",
  },
  philosophy: {
    label: "Philosophy",
    blurb: "How much should the story think out loud?",
  },
  protagonist: {
    label: "Protagonist",
    blurb: "Who is this person before the plot changes him?",
  },
  relationships: {
    label: "Relationships",
    blurb: "What connections carry the emotional core?",
  },
  plot: {
    label: "Plot Experience",
    blurb: "What keeps a reader turning the page?",
  },
  pacing: {
    label: "Pacing",
    blurb: "How fast does the story move?",
  },
  world: {
    label: "World & Genre",
    blurb: "Where and what kind of story is this?",
  },
  voice: {
    label: "Prose & Voice",
    blurb: "How should the narration actually sound?",
  },
  restraint: {
    label: "Emotional Restraint",
    blurb: "How should big feelings be handled on the page?",
  },
  structure: {
    label: "Structure & Ending",
    blurb: "How is this all supposed to add up?",
  },
};

/**
 * ESSENTIAL questions — asked during onboarding. Kept deliberately short:
 * every question is a visual pick with an "Other" custom field, so most
 * users can finish in a couple of minutes.
 */
export const ONBOARDING_QUESTIONS: Question[] = [
  // --- Feel & Tone ---
  {
    id: "feel.target_emotions",
    section: "feel",
    type: "multi",
    prompt: "When someone finishes a chapter, what should they feel?",
    options: [
      { id: "curious", label: "Curious" },
      { id: "uneasy", label: "Uneasy" },
      { id: "sad", label: "Sad" },
      { id: "excited", label: "Excited" },
      { id: "warm", label: "Warm" },
      { id: "angry", label: "Angry" },
      { id: "hopeful", label: "Hopeful" },
      { id: "empty", label: "Empty / hollow" },
    ],
    customPlaceholder: "Something else...",
  },
  {
    id: "feel.overall_tone",
    section: "feel",
    type: "single",
    prompt: "Overall, the novel should feel:",
    options: [
      { id: "dark_oppressive", label: "Dark and oppressive" },
      { id: "melancholic_beautiful", label: "Melancholic but beautiful" },
      { id: "hopeful_under_dark", label: "Hopeful underneath the darkness" },
      { id: "adventurous", label: "Mostly adventurous, with serious moments" },
      { id: "tragic", label: "Tragic" },
    ],
    customPlaceholder: "Describe the tone in your own words...",
  },
  {
    id: "feel.heaviness",
    section: "feel",
    type: "single",
    prompt: "How emotionally heavy should the average chapter be?",
    options: [
      { id: "heavy_constant", label: "Heavy almost constantly" },
      { id: "normal_with_devastating", label: "Mostly normal, occasional devastating scenes" },
      { id: "balanced", label: "Balanced" },
      { id: "lighter_rare_heavy", label: "Generally lighter, rare heavy moments" },
    ],
  },
  {
    id: "feel.sadness_type",
    section: "feel",
    type: "multi",
    prompt: "If you want readers to cry, what kind of sadness hits hardest?",
    helper: "Skip this if making people cry isn't a specific goal.",
    options: [
      { id: "death", label: "Death" },
      { id: "regret", label: "Regret" },
      { id: "separation", label: "Separation" },
      { id: "sacrifice", label: "Sacrifice" },
      { id: "loneliness", label: "Loneliness" },
      { id: "unspoken_affection", label: "Unspoken affection" },
      { id: "helplessness", label: "Helplessness" },
      { id: "betrayal", label: "Betrayal" },
    ],
    customPlaceholder: "Something else, or 'not a goal'...",
  },

  // --- Philosophy ---
  {
    id: "philosophy.centrality",
    section: "philosophy",
    type: "single",
    prompt: "How philosophical should the story be?",
    options: [
      { id: "central", label: "One of the central attractions" },
      { id: "important_secondary", label: "Important, but always secondary to story" },
      { id: "major_moments", label: "Appears only at major moments" },
      { id: "implicit", label: "Mostly implicit" },
    ],
  },
  {
    id: "philosophy.subjects",
    section: "philosophy",
    type: "multi",
    prompt: "Which subjects do you want the story to explore?",
    options: [
      { id: "mortality", label: "Mortality" },
      { id: "regret", label: "Regret" },
      { id: "meaning", label: "Meaning / purpose" },
      { id: "family", label: "Family" },
      { id: "love", label: "Love" },
      { id: "ambition", label: "Ambition" },
      { id: "fate_vs_choice", label: "Fate vs. choice" },
      { id: "identity", label: "Identity" },
      { id: "loneliness", label: "Loneliness" },
      { id: "sacrifice", label: "Sacrifice" },
      { id: "morality", label: "Morality" },
      { id: "power", label: "Power" },
      { id: "memory", label: "Memory" },
      { id: "what_makes_human", label: "What makes someone human" },
    ],
    customPlaceholder: "Other subjects...",
  },
  {
    id: "philosophy.avoid",
    section: "philosophy",
    type: "multi",
    prompt: "Any philosophical attitudes you don't want?",
    options: [
      { id: "fake_deep", label: "Fake-deep aphorisms" },
      { id: "nihilism", label: "Nihilism for its own sake" },
      { id: "wise_characters", label: "Characters constantly sounding wise" },
      { id: "meaning_speeches", label: "Speeches about the meaning of life" },
    ],
    customPlaceholder: "Anything else to avoid...",
  },

  // --- Protagonist ---
  {
    id: "protagonist.core_self",
    section: "protagonist",
    type: "text",
    prompt:
      "Before the plot changes him, what kind of person is your protagonist? Describe the man himself, not his powers or circumstances.",
    customPlaceholder: "He is someone who...",
  },
  {
    id: "protagonist.flaws_and_good",
    section: "protagonist",
    type: "text",
    prompt: "What are his biggest flaws, and what is genuinely good about him?",
    customPlaceholder: "Flaws... / What's good about him...",
  },
  {
    id: "protagonist.want_vs_need",
    section: "protagonist",
    type: "text",
    prompt:
      "What does he think he wants from life — and what does he actually need, even if he doesn't know it yet?",
    customPlaceholder: "He thinks he wants... but really needs...",
  },
  {
    id: "protagonist.likability",
    section: "protagonist",
    type: "single",
    prompt: "How should readers feel about him at first?",
    options: [
      { id: "immediate_like", label: "Immediately like him" },
      { id: "slow_attach", label: "Slowly grow attached" },
      { id: "sometimes_dislike", label: "Sometimes dislike him" },
      { id: "uncertain", label: "Remain uncertain about him" },
    ],
  },
  {
    id: "protagonist.competence",
    section: "protagonist",
    type: "single",
    prompt: "How competent should he be?",
    options: [
      { id: "ordinary", label: "Ordinary person" },
      { id: "intelligent_inexperienced", label: "Intelligent but inexperienced" },
      { id: "highly_competent", label: "Highly competent" },
      { id: "exceptional", label: "Exceptionally talented" },
      { id: "capable_flawed", label: "Dangerous/capable but psychologically flawed" },
    ],
  },
  {
    id: "protagonist.change",
    section: "protagonist",
    type: "single",
    prompt: "How much should he change over the novel?",
    options: [
      { id: "dramatic", label: "Dramatic transformation" },
      { id: "gradual", label: "Gradual evolution, recognizably the same person" },
    ],
  },

  // --- Relationships ---
  {
    id: "relationships.emotional_core",
    section: "relationships",
    type: "multi",
    prompt: "What relationships should carry the emotional core?",
    options: [
      { id: "family", label: "Family" },
      { id: "friendship", label: "Friendship" },
      { id: "romance", label: "Romance" },
      { id: "mentor_student", label: "Mentor / student" },
      { id: "siblings", label: "Siblings" },
      { id: "found_family", label: "Found family" },
      { id: "rivals", label: "Rivals" },
      { id: "enemies", label: "Enemies" },
    ],
    customPlaceholder: "Other relationships...",
  },
  {
    id: "relationships.romance_importance",
    section: "relationships",
    type: "single",
    prompt: "How important is romance?",
    options: [
      { id: "central", label: "Central" },
      { id: "major_subplot", label: "Major subplot" },
      { id: "slow_burn_background", label: "Slow-burn background element" },
      { id: "minor", label: "Minor" },
      { id: "none", label: "None" },
    ],
    customPlaceholder: "What kind of romance you enjoy, if any...",
  },
  {
    id: "relationships.affection_style",
    section: "relationships",
    type: "single",
    prompt: "Do characters say what they feel, or show it through actions?",
    options: [
      { id: "openly_stated", label: "Openly say what they feel" },
      { id: "shown_through_actions", label: "Mostly shown through actions" },
      { id: "mixed", label: "Mix, depending on the character" },
    ],
  },
  {
    id: "relationships.kill_willingness",
    section: "relationships",
    type: "single",
    prompt: "How willing are you to permanently kill important characters?",
    options: [
      { id: "rarely", label: "Rarely / almost never" },
      { id: "when_it_matters", label: "When the story truly needs it" },
      { id: "freely", label: "Freely, if it serves the story" },
    ],
  },

  // --- Plot Experience ---
  {
    id: "plot.hook_drivers",
    section: "plot",
    type: "multi",
    prompt: "What should primarily make a reader click 'Next Chapter'?",
    options: [
      { id: "mysteries", label: "Mysteries" },
      { id: "character_attachment", label: "Character attachment" },
      { id: "cliffhangers", label: "Cliffhangers" },
      { id: "revelations", label: "Revelations" },
      { id: "danger", label: "Danger" },
      { id: "emotional_tension", label: "Emotional tension" },
      { id: "world_discovery", label: "World discovery" },
      { id: "political_intrigue", label: "Political intrigue" },
      { id: "power_growth", label: "Progression / power growth" },
      { id: "romance", label: "Romance" },
    ],
    customPlaceholder: "Other hooks...",
  },
  {
    id: "plot.hidden_from_reader",
    section: "plot",
    type: "single",
    prompt: "How much should be hidden from the reader?",
    options: [
      { id: "reader_knows", label: "Reader usually knows roughly what's happening" },
      { id: "discover_together", label: "Reader and protagonist discover things together" },
      { id: "reader_misunderstands", label: "Reader frequently misunderstands until later" },
      { id: "hidden_long", label: "Major truths can stay hidden a long time" },
    ],
  },
  {
    id: "plot.twist_frequency",
    section: "plot",
    type: "single",
    prompt: "How often do you want major twists?",
    options: [
      { id: "rare_enormous", label: "Rare but enormous" },
      { id: "regular_revelations", label: "Regular revelations" },
      { id: "frequent_unpredictable", label: "Frequent, unpredictable turns" },
    ],
  },

  // --- Pacing ---
  {
    id: "pacing.speed",
    section: "pacing",
    type: "single",
    prompt: "What pace are you imagining?",
    options: [
      { id: "slow_burn", label: "Slow-burn" },
      { id: "moderate", label: "Moderate" },
      { id: "fast_webnovel", label: "Fast webnovel pacing" },
      { id: "varies_by_arc", label: "Varies heavily by arc" },
    ],
  },
  {
    id: "pacing.chapter_endings",
    section: "pacing",
    type: "single",
    prompt: "Should chapters usually end with hooks?",
    options: [
      { id: "hooks", label: "Yes, usually a hook" },
      { id: "emotional_beat_ok", label: "A strong emotional/thematic beat is fine too" },
      { id: "mixed", label: "Mix of both" },
    ],
  },
  {
    id: "pacing.chapter_length",
    section: "pacing",
    type: "single",
    prompt: "About how long should a normal chapter be?",
    options: [
      { id: "short", label: "Short (~800–1,500 words)" },
      { id: "medium", label: "Medium (~1,500–2,800 words)" },
      { id: "long", label: "Long (~2,800–4,500 words)" },
      { id: "very_long", label: "Very long (4,500+ words)" },
    ],
  },

  // --- World & Genre ---
  {
    id: "world.genre",
    section: "world",
    type: "text",
    prompt: "What genre or genre mixture are you aiming for?",
    customPlaceholder: "e.g. grimdark fantasy with political intrigue...",
  },
  {
    id: "world.setting_type",
    section: "world",
    type: "single",
    prompt: "Is the world:",
    options: [
      { id: "real_world", label: "Our real world" },
      { id: "alt_modern_earth", label: "Alternate modern Earth" },
      { id: "fantasy", label: "Fantasy world" },
      { id: "modern_fantasy", label: "Modern fantasy" },
      { id: "futuristic", label: "Futuristic" },
      { id: "multiple_worlds", label: "Multiple worlds" },
    ],
    customPlaceholder: "Something else...",
  },
  {
    id: "world.system_style",
    section: "world",
    type: "single",
    prompt: "Do you want hard systems with clear rules, or mysterious powers?",
    options: [
      { id: "hard_system", label: "Hard system, clearly explained rules" },
      { id: "mysterious_gradual", label: "Mysterious, rules discovered gradually" },
      { id: "mixed", label: "A mix" },
      { id: "not_applicable", label: "Not really applicable" },
    ],
  },

  // --- Prose & Voice ---
  {
    id: "voice.pov",
    section: "voice",
    type: "single",
    prompt: "First person or third person?",
    options: [
      { id: "first", label: "First person" },
      { id: "third_limited", label: "Third person limited" },
      { id: "third_omniscient", label: "Third person omniscient" },
    ],
  },
  {
    id: "voice.tense",
    section: "voice",
    type: "single",
    prompt: "Past tense or present tense?",
    options: [
      { id: "past", label: "Past tense" },
      { id: "present", label: "Present tense" },
    ],
  },
  {
    id: "voice.narration_feel",
    section: "voice",
    type: "multi",
    prompt: "The narration should feel:",
    options: [
      { id: "literary", label: "Literary" },
      { id: "straightforward", label: "Straightforward" },
      { id: "intimate", label: "Intimate" },
      { id: "atmospheric", label: "Atmospheric" },
      { id: "conversational", label: "Conversational" },
      { id: "elegant", label: "Elegant" },
      { id: "gritty", label: "Gritty" },
    ],
    customPlaceholder: "Other qualities...",
  },
  {
    id: "voice.descriptiveness",
    section: "voice",
    type: "single",
    prompt: "How descriptive should the prose be?",
    options: [
      { id: "sparse", label: "Sparse" },
      { id: "moderate", label: "Moderate" },
      { id: "rich", label: "Rich" },
      { id: "rich_when_deserved", label: "Rich only when the scene deserves it" },
    ],
  },
  {
    id: "voice.ai_tells_to_avoid",
    section: "voice",
    type: "multi",
    prompt: "What are the biggest signs of \"AI writing\" you want forbidden?",
    options: [
      { id: "purple_prose", label: "Purple, over-adjectived prose" },
      { id: "on_the_nose_summaries", label: "On-the-nose emotional summaries" },
      { id: "repetitive_sentence_rhythm", label: "Repetitive sentence rhythm" },
      { id: "generic_metaphors", label: "Generic/clichéd metaphors" },
      { id: "everyone_sounds_same", label: "Every character sounding the same" },
      { id: "tidy_resolutions", label: "Everything resolving too neatly" },
      { id: "excessive_hedging", label: "Excessive internal hedging/overthinking" },
    ],
    customPlaceholder: "Other AI tells to forbid...",
  },

  // --- Emotional Restraint ---
  {
    id: "restraint.show_dont_tell",
    section: "restraint",
    type: "single",
    prompt:
      "When a character grieves, should narration say it directly (\"he regretted it\") or show it through behavior?",
    options: [
      { id: "always_show", label: "Almost always show, never state directly" },
      { id: "mostly_show", label: "Mostly show, occasional direct statement" },
      { id: "mixed", label: "Whatever fits the scene" },
    ],
  },
  {
    id: "restraint.melodrama_tolerance",
    section: "restraint",
    type: "single",
    prompt: "How much crying/screaming/trembling is acceptable before it feels melodramatic?",
    options: [
      { id: "very_little", label: "Very little — keep it restrained" },
      { id: "some", label: "Some, at true high points" },
      { id: "comfortable_with_big_reactions", label: "Comfortable with big reactions" },
    ],
  },
  {
    id: "restraint.scene_lingering",
    section: "restraint",
    type: "single",
    prompt: "Should major emotional moments linger, or hit hard and move on?",
    options: [
      { id: "linger", label: "Linger for a while" },
      { id: "hit_and_move_on", label: "Hit hard, then move on" },
      { id: "depends", label: "Depends on the moment" },
    ],
  },

  // --- Structure & Ending ---
  {
    id: "structure.ending_known",
    section: "structure",
    type: "text",
    prompt: "Do you already know the ending? If so, describe it (even roughly).",
    customPlaceholder: "Not yet / Here's what I'm imagining...",
  },
  {
    id: "structure.planning_style",
    section: "structure",
    type: "single",
    prompt: "How tightly should the story be planned?",
    options: [
      { id: "tightly_planned", label: "Tightly planned start to end" },
      { id: "planned_by_arcs", label: "Broadly planned by arcs" },
      { id: "evolve_while_writing", label: "Allowed to evolve significantly" },
    ],
  },
  {
    id: "structure.length",
    section: "structure",
    type: "single",
    prompt: "Roughly how long do you imagine the whole novel?",
    options: [
      { id: "under_50", label: "Under 50 chapters" },
      { id: "50_100", label: "50–100 chapters" },
      { id: "100_250", label: "100–250 chapters" },
      { id: "250_plus", label: "250+ chapters" },
      { id: "no_idea", label: "No idea yet" },
    ],
  },
  {
    id: "structure.reader_takeaway",
    section: "structure",
    type: "text",
    prompt:
      "Most important: when this novel is finished, what do you want a reader to say about it?",
    helper: "e.g. \"I came for ___, but stayed because ___.\"",
    customPlaceholder: "I came for... but stayed because...",
  },
];

/**
 * DEEP-DIVE questions — everything else from the original long-form
 * questionnaire. Not shown during onboarding; surfaced later in the
 * Story Bible editor for users who want to go further on a given section.
 */
export const DEEP_DIVE_QUESTIONS: Question[] = [
  {
    id: "feel.scene_intensity_style",
    section: "feel",
    type: "single",
    advanced: true,
    prompt: "When emotional scenes happen, should they usually be:",
    options: [
      { id: "restrained_subtle", label: "Restrained and subtle" },
      { id: "openly_emotional", label: "Openly emotional" },
      { id: "psychologically_intense", label: "Psychologically intense" },
      { id: "devastating_quiet", label: "Devastating but quiet" },
      { id: "varies", label: "Different depending on the scene" },
    ],
  },
  {
    id: "philosophy.delivery",
    section: "philosophy",
    type: "multi",
    advanced: true,
    prompt: "Should philosophical ideas normally be:",
    options: [
      { id: "spoken", label: "Spoken by characters" },
      { id: "internal", label: "Thought internally" },
      { id: "demonstrated", label: "Demonstrated through events and choices" },
      { id: "debated", label: "Debated between characters" },
    ],
  },
  {
    id: "philosophy.answers_or_questions",
    section: "philosophy",
    type: "single",
    advanced: true,
    prompt: "Should the novel make statements about life, or mostly raise questions?",
    options: [
      { id: "make_statements", label: "Eventually make statements" },
      { id: "raise_questions", label: "Mostly raise questions, no claimed answers" },
      { id: "both", label: "A bit of both" },
    ],
  },
  {
    id: "protagonist.self_regard",
    section: "protagonist",
    type: "single",
    advanced: true,
    prompt: "Does he like himself at the beginning?",
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
      { id: "complicated", label: "It's complicated" },
    ],
  },
  {
    id: "relationships.independent_lives",
    section: "relationships",
    type: "single",
    advanced: true,
    prompt: "Should supporting characters have independent lives when the protagonist isn't around?",
    options: [
      { id: "yes_strongly", label: "Yes, strongly" },
      { id: "somewhat", label: "Somewhat" },
      { id: "protagonist_focused", label: "Keep the focus on the protagonist" },
    ],
  },
  {
    id: "plot.mystery_duration",
    section: "plot",
    type: "single",
    advanced: true,
    prompt: "Do you prefer mysteries that last dozens of chapters, or quicker answers?",
    options: [
      { id: "long_mysteries", label: "Long-running mysteries" },
      { id: "quick_answers", label: "Relatively quick answers, new questions replace them" },
      { id: "mixed", label: "A mix of both" },
    ],
  },
  {
    id: "plot.recontextualization",
    section: "plot",
    type: "single",
    advanced: true,
    prompt: "Do you enjoy recontextualization — early scenes that mean something different later?",
    options: [
      { id: "love_it", label: "Love it, use it often" },
      { id: "occasionally", label: "Occasionally is great" },
      { id: "not_a_priority", label: "Not a priority" },
    ],
  },
  {
    id: "pacing.quiet_chapter_comfort",
    section: "pacing",
    type: "single",
    advanced: true,
    prompt: "Comfortable spending a whole chapter on a quiet event (conversation, travel, dinner)?",
    options: [
      { id: "yes", label: "Yes, if it develops characters" },
      { id: "sometimes", label: "Sometimes" },
      { id: "rarely", label: "Rarely — keep things moving" },
    ],
  },
  {
    id: "pacing.boredom_threshold",
    section: "pacing",
    type: "text",
    advanced: true,
    prompt: "How long can the story go without a major plot development before it drags?",
    customPlaceholder: "e.g. a chapter or two is fine, but not more...",
  },
  {
    id: "world.importance_vs_character",
    section: "world",
    type: "single",
    advanced: true,
    prompt: "How important is worldbuilding compared with character and plot?",
    options: [
      { id: "world_first", label: "Worldbuilding comes first" },
      { id: "balanced", label: "Balanced with character and plot" },
      { id: "character_first", label: "Character and plot come first" },
    ],
  },
  {
    id: "world.atmosphere",
    section: "world",
    type: "multi",
    advanced: true,
    prompt: "Should the world itself feel:",
    options: [
      { id: "dangerous", label: "Dangerous" },
      { id: "wondrous", label: "Wondrous" },
      { id: "beautiful", label: "Beautiful" },
      { id: "bleak", label: "Bleak" },
      { id: "politically_complex", label: "Politically complex" },
      { id: "lived_in", label: "Lived-in" },
    ],
  },
  {
    id: "voice.internal_monologue",
    section: "voice",
    type: "single",
    advanced: true,
    prompt: "How much internal monologue do you want?",
    options: [
      { id: "minimal", label: "Minimal" },
      { id: "moderate", label: "Moderate" },
      { id: "heavy", label: "Heavy — deep interiority" },
    ],
  },
  {
    id: "voice.paragraph_rhythm",
    section: "voice",
    type: "text",
    advanced: true,
    prompt: "How long should paragraphs generally be? Describe the balance you prefer.",
    customPlaceholder: "e.g. mostly medium paragraphs, short ones only for punches...",
  },
  {
    id: "voice.style_dials",
    section: "voice",
    type: "multi",
    advanced: true,
    prompt:
      "Rate your tolerance (pick all that should be 'frequent' — treat unpicked as 'normal', and use the custom field to mark any as 'avoid' or 'rare'):",
    options: [
      { id: "sentence_fragments", label: "Sentence fragments" },
      { id: "one_line_paragraphs", label: "One-line paragraphs" },
      { id: "em_dashes", label: "Em dashes" },
      { id: "rhetorical_questions", label: "Rhetorical questions" },
      { id: "italics_for_thoughts", label: "Italics for thoughts" },
      { id: "poetic_metaphors", label: "Poetic metaphors" },
    ],
    customPlaceholder: "Note any you want to AVOID or keep RARE...",
  },
  {
    id: "voice.distinct_character_voices",
    section: "voice",
    type: "single",
    advanced: true,
    prompt: "Should characters have noticeably different speaking styles and rhythms?",
    options: [
      { id: "yes_strongly", label: "Yes, strongly distinct" },
      { id: "somewhat", label: "Somewhat" },
      { id: "not_important", label: "Not important" },
    ],
  },
  {
    id: "restraint.character_self_understanding",
    section: "restraint",
    type: "single",
    advanced: true,
    prompt: "Do you like scenes where the character doesn't fully understand why something hurts?",
    options: [
      { id: "yes", label: "Yes, often" },
      { id: "sometimes", label: "Sometimes" },
      { id: "prefer_clarity", label: "Prefer they understand their own feelings" },
    ],
  },
  {
    id: "structure.distinct_arcs",
    section: "structure",
    type: "single",
    advanced: true,
    prompt: "Do you want distinct arcs, each with its own conflict and climax?",
    options: [
      { id: "yes", label: "Yes" },
      { id: "loosely", label: "Loosely" },
      { id: "no", label: "No, more continuous" },
    ],
  },
  {
    id: "structure.escalation",
    section: "structure",
    type: "single",
    advanced: true,
    prompt: "Should conflicts continuously escalate, or can later ones turn smaller and personal again?",
    options: [
      { id: "continuous_escalation", label: "Continuously escalate in scale" },
      { id: "can_go_personal", label: "Can become smaller and personal again" },
      { id: "mixed", label: "A mix, by arc" },
    ],
  },
];

export function findQuestion(id: string): Question | undefined {
  return (
    ONBOARDING_QUESTIONS.find((q) => q.id === id) ??
    DEEP_DIVE_QUESTIONS.find((q) => q.id === id)
  );
}

export const ONBOARDING_STEPS: { section: SectionId; questions: Question[] }[] =
  SECTION_IDS.map((section) => ({
    section,
    questions: ONBOARDING_QUESTIONS.filter((q) => q.section === section),
  }));
