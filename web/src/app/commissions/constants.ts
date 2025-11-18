// src/app/commissions/constants.ts

export interface PhotoRequestCategory {
  name: string
  description: string
  tags: {
    key: string
    label: string
    description: string
    defaultWeight: number
  }[]
}

export const PHOTO_REQUEST_CATEGORIES: PhotoRequestCategory[] = [
  {
    name: "Photography Styles",
    description: "Types of photography styles and techniques",
    tags: [
      {
        key: "[PORTRAIT]",
        label: "Portrait",
        description: "Focus on people and faces",
        defaultWeight: 100
      },
      {
        key: "[LANDSCAPE]",
        label: "Landscape",
        description: "Wide scenic views and natural vistas",
        defaultWeight: 100
      },
      {
        key: "[PRODUCT]",
        label: "Product",
        description: "Product photography and showcase",
        defaultWeight: 100
      },
      {
        key: "[ARCHITECTURAL]",
        label: "Architectural",
        description: "Buildings and structures",
        defaultWeight: 100
      },
      {
        key: "[FOOD]",
        label: "Food",
        description: "Culinary and food photography",
        defaultWeight: 100
      },
      {
        key: "[ABSTRACT]",
        label: "Abstract",
        description: "Creative and conceptual imagery",
        defaultWeight: 100
      },
      {
        key: "[DOCUMENTARY]",
        label: "Documentary",
        description: "Candid and storytelling photography",
        defaultWeight: 100
      },
      {
        key: "[FASHION]",
        label: "Fashion",
        description: "Fashion and style photography",
        defaultWeight: 100
      },
      {
        key: "[WILDLIFE]",
        label: "Wildlife",
        description: "Animals in natural habitats",
        defaultWeight: 100
      },
      {
        key: "[SPORTS]",
        label: "Sports",
        description: "Action and athletic photography",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Subjects",
    description: "Main subjects and themes for photos",
    tags: [
      {
        key: "[PEOPLE]",
        label: "People",
        description: "Individuals or groups of people",
        defaultWeight: 100
      },
      {
        key: "[NATURE]",
        label: "Nature",
        description: "Natural environments and elements",
        defaultWeight: 100
      },
      {
        key: "[URBAN]",
        label: "Urban/Cityscape",
        description: "City scenes and urban environments",
        defaultWeight: 100
      },
      {
        key: "[FOOD_DRINK]",
        label: "Food & Drink",
        description: "Culinary subjects and beverages",
        defaultWeight: 100
      },
      {
        key: "[TECHNOLOGY]",
        label: "Technology",
        description: "Tech devices and digital themes",
        defaultWeight: 100
      },
      {
        key: "[BUSINESS]",
        label: "Business",
        description: "Corporate and professional themes",
        defaultWeight: 100
      },
      {
        key: "[TRAVEL]",
        label: "Travel",
        description: "Destinations and tourism",
        defaultWeight: 100
      },
      {
        key: "[ANIMALS]",
        label: "Animals",
        description: "Domestic and wild animals",
        defaultWeight: 100
      },
      {
        key: "[INTERIOR]",
        label: "Interior",
        description: "Indoor spaces and design",
        defaultWeight: 100
      },
      {
        key: "[PRODUCTS]",
        label: "Products",
        description: "Commercial products and items",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Mood & Tone",
    description: "Emotional atmosphere and visual tone",
    tags: [
      {
        key: "[BRIGHT_CHEERFUL]",
        label: "Bright & Cheerful",
        description: "Uplifting and positive atmosphere",
        defaultWeight: 100
      },
      {
        key: "[MOODY_DRAMATIC]",
        label: "Moody & Dramatic",
        description: "Dark and intense atmosphere",
        defaultWeight: 100
      },
      {
        key: "[MINIMALIST]",
        label: "Minimalist & Clean",
        description: "Simple and uncluttered aesthetic",
        defaultWeight: 100
      },
      {
        key: "[VINTAGE]",
        label: "Vintage & Retro",
        description: "Classic and nostalgic feel",
        defaultWeight: 100
      },
      {
        key: "[PROFESSIONAL]",
        label: "Professional & Corporate",
        description: "Business-appropriate and polished",
        defaultWeight: 100
      },
      {
        key: "[WARM_COZY]",
        label: "Warm & Cozy",
        description: "Comfortable and inviting atmosphere",
        defaultWeight: 100
      },
      {
        key: "[COOL_MODERN]",
        label: "Cool & Modern",
        description: "Contemporary and sleek aesthetic",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Settings & Environments",
    description: "Location and environment preferences",
    tags: [
      {
        key: "[INDOOR_STUDIO]",
        label: "Indoor Studio",
        description: "Controlled studio environment",
        defaultWeight: 100
      },
      {
        key: "[OUTDOOR_NATURAL]",
        label: "Outdoor Natural",
        description: "Natural outdoor settings",
        defaultWeight: 100
      },
      {
        key: "[URBAN_SETTING]",
        label: "Urban Setting",
        description: "City and street environments",
        defaultWeight: 100
      },
      {
        key: "[HOME_INTERIOR]",
        label: "Home Interior",
        description: "Residential indoor spaces",
        defaultWeight: 100
      },
      {
        key: "[OFFICE_WORKPLACE]",
        label: "Office/Workplace",
        description: "Professional work environments",
        defaultWeight: 100
      },
      {
        key: "[NATURE_WILDERNESS]",
        label: "Nature/Wilderness",
        description: "Remote natural environments",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Image Specifications",
    description: "Technical and visual specifications",
    tags: [
      {
        key: "[ORIENTATION_LANDSCAPE]",
        label: "Landscape Orientation",
        description: "Horizontal/wide format",
        defaultWeight: 100
      },
      {
        key: "[ORIENTATION_PORTRAIT]",
        label: "Portrait Orientation",
        description: "Vertical/tall format",
        defaultWeight: 100
      },
      {
        key: "[ORIENTATION_SQUARE]",
        label: "Square Orientation",
        description: "1:1 aspect ratio",
        defaultWeight: 100
      },
      {
        key: "[COLOR_VIBRANT]",
        label: "Vibrant Colors",
        description: "Bold and saturated colors",
        defaultWeight: 100
      },
      {
        key: "[COLOR_MUTED]",
        label: "Muted Colors",
        description: "Soft and subdued palette",
        defaultWeight: 100
      },
      {
        key: "[COLOR_MONOCHROME]",
        label: "Monochrome",
        description: "Black and white or single color",
        defaultWeight: 100
      },
      {
        key: "[COLOR_WARM]",
        label: "Warm Tones",
        description: "Warm color temperature",
        defaultWeight: 100
      },
      {
        key: "[COLOR_COOL]",
        label: "Cool Tones",
        description: "Cool color temperature",
        defaultWeight: 100
      },
      {
        key: "[COLOR_NATURAL]",
        label: "Natural Colors",
        description: "Realistic color representation",
        defaultWeight: 100
      },
      {
        key: "[RESOLUTION_WEB]",
        label: "Web Resolution",
        description: "Optimized for digital display",
        defaultWeight: 100
      },
      {
        key: "[RESOLUTION_PRINT]",
        label: "Print Resolution",
        description: "High resolution for printing",
        defaultWeight: 100
      },
      {
        key: "[RESOLUTION_LARGE]",
        label: "Large Format",
        description: "Extra high resolution for large prints",
        defaultWeight: 100
      }
    ]
  },
  {
    name: "Usage Type",
    description: "Intended use and licensing needs",
    tags: [
      {
        key: "[PERSONAL_USE]",
        label: "Personal Use",
        description: "Non-commercial personal projects",
        defaultWeight: 100
      },
      {
        key: "[COMMERCIAL_USE]",
        label: "Commercial Use",
        description: "Business and advertising purposes",
        defaultWeight: 100
      },
      {
        key: "[EDITORIAL_USE]",
        label: "Editorial Use",
        description: "News and editorial content",
        defaultWeight: 100
      },
      {
        key: "[SOCIAL_MEDIA]",
        label: "Social Media",
        description: "Social media platforms",
        defaultWeight: 100
      },
      {
        key: "[MARKETING]",
        label: "Marketing Materials",
        description: "Marketing and promotional content",
        defaultWeight: 100
      }
    ]
  }
]

// Preset configurations for quick setup
export const PRESET_CONFIGS = {
  general: {
    name: "General Purpose",
    description: "Balanced mix for versatile use",
    weights: Object.fromEntries(
      PHOTO_REQUEST_CATEGORIES.flatMap(cat =>
        cat.tags.map(tag => [tag.key, 100])
      )
    )
  },
  corporate: {
    name: "Corporate & Business",
    description: "Professional business-focused imagery",
    weights: {
      "[BUSINESS]": 200,
      "[PEOPLE]": 150,
      "[OFFICE_WORKPLACE]": 200,
      "[PROFESSIONAL]": 200,
      "[PORTRAIT]": 150,
      "[INDOOR_STUDIO]": 150,
      "[COLOR_NATURAL]": 150,
      "[COMMERCIAL_USE]": 200
    }
  },
  lifestyle: {
    name: "Lifestyle & People",
    description: "Focus on people and everyday life",
    weights: {
      "[PEOPLE]": 200,
      "[PORTRAIT]": 200,
      "[DOCUMENTARY]": 150,
      "[WARM_COZY]": 150,
      "[HOME_INTERIOR]": 150,
      "[OUTDOOR_NATURAL]": 150,
      "[BRIGHT_CHEERFUL]": 150
    }
  },
  nature: {
    name: "Nature & Landscape",
    description: "Natural environments and scenery",
    weights: {
      "[NATURE]": 200,
      "[LANDSCAPE]": 200,
      "[WILDLIFE]": 150,
      "[OUTDOOR_NATURAL]": 200,
      "[NATURE_WILDERNESS]": 200,
      "[COLOR_NATURAL]": 150,
      "[ORIENTATION_LANDSCAPE]": 150
    }
  },
  creative: {
    name: "Creative & Artistic",
    description: "Artistic and experimental imagery",
    weights: {
      "[ABSTRACT]": 200,
      "[FASHION]": 150,
      "[MOODY_DRAMATIC]": 150,
      "[VINTAGE]": 150,
      "[COLOR_VIBRANT]": 150,
      "[COOL_MODERN]": 150
    }
  },
  socialMedia: {
    name: "Social Media Optimized",
    description: "Perfect for social platforms",
    weights: {
      "[SOCIAL_MEDIA]": 200,
      "[BRIGHT_CHEERFUL]": 150,
      "[COLOR_VIBRANT]": 150,
      "[ORIENTATION_SQUARE]": 200,
      "[ORIENTATION_PORTRAIT]": 150,
      "[RESOLUTION_WEB]": 200
    }
  }
}

export function getWeightColor(weight: number): string {
  if (weight === 0) return 'text-cyan-500'
  if (weight < 100) return 'text-orange-500'
  if (weight === 100) return 'text-gray-400'
  if (weight <= 200) return 'text-green-500'
  return 'text-cyan-500'
}

export function getWeightBgColor(weight: number): string {
  if (weight === 0) return 'bg-cyan-500/10'
  if (weight < 100) return 'bg-orange-500/10'
  if (weight === 100) return 'bg-gray-500/10'
  if (weight <= 200) return 'bg-green-500/10'
  return 'bg-cyan-500/10'
}

export function simpleToPoseWeights(simplePrefs: any): Record<string, number> {
  const weights: Record<string, number> = {}

  // Initialize all weights to 100
  PHOTO_REQUEST_CATEGORIES.forEach(cat => {
    cat.tags.forEach(tag => {
      weights[tag.key] = 100
    })
  })

  // Map simple preferences to photo weights
  if (simplePrefs.portrait !== undefined) {
    weights["[PORTRAIT]"] = simplePrefs.portrait * 2
    weights["[PEOPLE]"] = simplePrefs.portrait * 2
  }
  if (simplePrefs.landscape !== undefined) {
    weights["[LANDSCAPE]"] = simplePrefs.landscape * 2
    weights["[NATURE]"] = simplePrefs.landscape * 2
  }
  if (simplePrefs.product !== undefined) {
    weights["[PRODUCT]"] = simplePrefs.product * 2
    weights["[PRODUCTS]"] = simplePrefs.product * 2
  }
  if (simplePrefs.lifestyle !== undefined) {
    weights["[DOCUMENTARY]"] = simplePrefs.lifestyle * 2
    weights["[PEOPLE]"] = simplePrefs.lifestyle * 2
  }
  if (simplePrefs.creative !== undefined) {
    weights["[ABSTRACT]"] = simplePrefs.creative * 2
    weights["[FASHION]"] = simplePrefs.creative * 2
  }

  return weights
}

// Helper function to get tag category
export function getTagCategory(tagKey: string): string | null {
  for (const category of PHOTO_REQUEST_CATEGORIES) {
    if (category.tags.some(tag => tag.key === tagKey)) {
      return category.name
    }
  }
  return null
}

// Helper function to check if a tag exists
export function isValidTag(tagKey: string): boolean {
  return PHOTO_REQUEST_CATEGORIES.some(cat =>
    cat.tags.some(tag => tag.key === tagKey)
  )
}
