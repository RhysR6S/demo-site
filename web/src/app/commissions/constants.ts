// src/app/commissions/constants.ts

export interface PoseWeightCategory {
  name: string
  description: string
  tags: {
    key: string
    label: string
    description: string
    defaultWeight: number
  }[]
}

// REMOVED "Participants & Scene Type" category to avoid confusion with Image Distribution
export const SMART_TAG_CATEGORIES: PoseWeightCategory[] = [
  {
    name: "Sexual Acts",
    description: "Types of sexual activities in scenes",
    tags: [
      {
        key: "[VAGINAL_SEX]",
        label: "Vaginal Sex",
        description: "Vaginal penetration scenes",
        defaultWeight: 100
      },
      {
        key: "[ANAL_SEX]",
        label: "Anal Sex",
        description: "Anal penetration scenes",
        defaultWeight: 100
      },
      {
        key: "[ORAL_GIVE]",
        label: "Oral (Giving)",
        description: "Performing oral sex",
        defaultWeight: 100
      },
      {
        key: "[ORAL_RECEIVE]",
        label: "Oral (Receiving)",
        description: "Receiving oral sex",
        defaultWeight: 100
      },
      {
        key: "[HANDJOB]",
        label: "Handjob",
        description: "Manual stimulation scenes",
        defaultWeight: 100
      },
      {
        key: "[TITJOB]",
        label: "Titjob",
        description: "Breast stimulation scenes",
        defaultWeight: 100
      },
      {
        key: "[FOOTJOB]",
        label: "Footjob",
        description: "Foot stimulation scenes",
        defaultWeight: 100
      },
      {
        key: "[ASSJOB]",
        label: "Assjob",
        description: "Buttocks stimulation scenes",
        defaultWeight: 100
      },
      {
        key: "[MASTURBATION]",
        label: "Masturbation",
        description: "Self-pleasure scenes",
        defaultWeight: 100
      },
      {
        key: "[FINGERING]",
        label: "Fingering",
        description: "Digital penetration scenes",
        defaultWeight: 100
      },
      {
        key: "[RIMMING]",
        label: "Rimming",
        description: "Analingus scenes",
        defaultWeight: 100
      },
      {
        key: "[TRIBADISM]",
        label: "Tribadism",
        description: "Female/female grinding scenes",
        defaultWeight: 100
      },
      {
        key: "[NIPPLE_PENETRATION]",
        label: "Nipple Penetration",
        description: "Nipple insertion content",
        defaultWeight: 100
      },
      {
        key: "[BREASTFEEDING]",
        label: "Breastfeeding",
        description: "Nursing/suckling scenes",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Body Part Display",
    description: "Control visibility of specific body parts",
    tags: [
      {
        key: "[SHOW_ANUS]",
        label: "Show Anus",
        description: "Visible anus in scenes",
        defaultWeight: 100
      },
      {
        key: "[SHOW_PUSSY]",
        label: "Show Pussy",
        description: "Visible vagina in scenes",
        defaultWeight: 100
      },
      {
        key: "[SHOW_BREASTS]",
        label: "Show Breasts",
        description: "Visible breasts in scenes",
        defaultWeight: 100
      },
      {
        key: "[SHOW_FEET]",
        label: "Show Feet",
        description: "Focus on feet in scenes",
        defaultWeight: 100
      },
      {
        key: "[SHOW_ASS]",
        label: "Show Ass",
        description: "Focus on buttocks in scenes",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Special Content",
    description: "Additional content preferences",
    tags: [
      {
        key: "[GAPING]",
        label: "Gaping",
        description: "Gaping/stretched openings",
        defaultWeight: 100
      },
      {
        key: "[LACTATION]",
        label: "Lactation",
        description: "Milk/lactation content",
        defaultWeight: 100
      },
      {
        key: "[SQUIRTING]",
        label: "Squirting",
        description: "Female ejaculation scenes",
        defaultWeight: 100
      },
      {
        key: "[TOY_USE]",
        label: "Toy Use",
        description: "Sex toy usage in scenes",
        defaultWeight: 100
      },
      {
        key: "[OBJECT_INSERT]",
        label: "Object Insertion",
        description: "Non-toy object insertion",
        defaultWeight: 100
      },
      {
        key: "[FOOD_PLAY]",
        label: "Food Play",
        description: "Food-related sexual content",
        defaultWeight: 100
      },
      {
        key: "[ASS_SMOTHER]",
        label: "Ass Smothering",
        description: "Face sitting/ass worship",
        defaultWeight: 100
      },
      {
        key: "[BREAST_SMOTHER]",
        label: "Breast Smothering",
        description: "Face in breasts scenes",
        defaultWeight: 100
      },
      {
        key: "[PUSSY_SMOTHER]",
        label: "Pussy Smothering",
        description: "Face sitting/pussy worship",
        defaultWeight: 100
      },
      {
        key: "[AFTER_SEX]",
        label: "After Sex",
        description: "Post-coital scenes",
        defaultWeight: 100
      },
      {
        key: "[CUM_FOCUS]",
        label: "Cum Focus",
        description: "Focus on ejaculation/cum",
        defaultWeight: 100
      }
    ]
  }
]

// Preset configurations - Updated to remove participant tags
export const PRESET_CONFIGS = {
  vanilla: {
    name: "Vanilla",
    description: "Basic content only",
    weights: {
      "[LACTATION]": 0,
      "[BREASTFEEDING]": 0,
      "[NIPPLE_PENETRATION]": 0,
      "[SQUIRTING]": 0,
      "[TOY_USE]": 0,
      "[OBJECT_INSERT]": 0,
      "[FOOD_PLAY]": 0,
      "[FOOTJOB]": 0,
      "[RIMMING]": 0,
      "[GAPING]": 0,
      "[ASS_SMOTHER]": 0,
      "[BREAST_SMOTHER]": 0,
      "[PUSSY_SMOTHER]": 0
    }
  },
  everything: {
    name: "Everything",
    description: "All content enabled equally",
    weights: Object.fromEntries(
      SMART_TAG_CATEGORIES.flatMap(cat => 
        cat.tags.map(tag => [tag.key, 100])
      )
    )
  },
  focused: {
    name: "Focused",
    description: "Prioritize main acts",
    weights: {
      "[VAGINAL_SEX]": 200,
      "[ORAL_GIVE]": 150,
      "[ORAL_RECEIVE]": 150,
      "[HANDJOB]": 150,
      "[TITJOB]": 150,
      "[MASTURBATION]": 200,
      "[FINGERING]": 150
    }
  },
  noSpecialContent: {
    name: "No Special Content",
    description: "Disable all special/fetish content",
    weights: {
      "[GAPING]": 0,
      "[LACTATION]": 0,
      "[SQUIRTING]": 0,
      "[TOY_USE]": 0,
      "[OBJECT_INSERT]": 0,
      "[FOOD_PLAY]": 0,
      "[ASS_SMOTHER]": 0,
      "[BREAST_SMOTHER]": 0,
      "[PUSSY_SMOTHER]": 0,
      "[NIPPLE_PENETRATION]": 0,
      "[BREASTFEEDING]": 0,
      "[CUM_FOCUS]": 50,
      "[AFTER_SEX]": 50
    }
  }
}

export function getWeightColor(weight: number): string {
  if (weight === 0) return 'text-red-500'
  if (weight < 100) return 'text-orange-500'
  if (weight === 100) return 'text-gray-400'
  if (weight <= 200) return 'text-green-500'
  return 'text-cyan-500'
}

export function getWeightBgColor(weight: number): string {
  if (weight === 0) return 'bg-red-500/10'
  if (weight < 100) return 'bg-orange-500/10'
  if (weight === 100) return 'bg-gray-500/10'
  if (weight <= 200) return 'bg-green-500/10'
  return 'bg-cyan-500/10'
}

export function simpleToPoseWeights(simplePrefs: any): Record<string, number> {
  const weights: Record<string, number> = {}
  
  // Initialize all weights to 100
  SMART_TAG_CATEGORIES.forEach(cat => {
    cat.tags.forEach(tag => {
      weights[tag.key] = 100
    })
  })
  
  // Map simple preferences to pose weights
  if (simplePrefs.vaginal !== undefined) {
    weights["[VAGINAL_SEX]"] = simplePrefs.vaginal * 2
  }
  if (simplePrefs.anal !== undefined) {
    weights["[ANAL_SEX]"] = simplePrefs.anal * 2
  }
  if (simplePrefs.oral !== undefined) {
    weights["[ORAL_GIVE]"] = simplePrefs.oral * 2
    weights["[ORAL_RECEIVE]"] = simplePrefs.oral * 2
  }
  if (simplePrefs.handjobTitjob !== undefined) {
    weights["[HANDJOB]"] = simplePrefs.handjobTitjob * 2
    weights["[TITJOB]"] = simplePrefs.handjobTitjob * 2
  }
  if (simplePrefs.masturbation !== undefined) {
    weights["[MASTURBATION]"] = simplePrefs.masturbation * 2
    weights["[FINGERING]"] = simplePrefs.masturbation * 2
  }
  if (simplePrefs.rimming !== undefined) {
    weights["[RIMMING]"] = simplePrefs.rimming * 2
  }
  if (simplePrefs.worshippingSmothering !== undefined) {
    weights["[ASS_SMOTHER]"] = simplePrefs.worshippingSmothering * 2
    weights["[BREAST_SMOTHER]"] = simplePrefs.worshippingSmothering * 2
    weights["[PUSSY_SMOTHER]"] = simplePrefs.worshippingSmothering * 2
  }
  
  return weights
}

// Helper function to get tag category
export function getTagCategory(tagKey: string): string | null {
  for (const category of SMART_TAG_CATEGORIES) {
    if (category.tags.some(tag => tag.key === tagKey)) {
      return category.name
    }
  }
  return null
}

// Helper function to check if a tag exists
export function isValidTag(tagKey: string): boolean {
  return SMART_TAG_CATEGORIES.some(cat => 
    cat.tags.some(tag => tag.key === tagKey)
  )
}
