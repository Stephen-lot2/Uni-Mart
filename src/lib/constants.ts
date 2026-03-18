export const CATEGORIES = [
  { value: 'electronics', label: 'Electronics', icon: '💻', description: 'Phones, laptops, gadgets' },
  { value: 'books', label: 'Books', icon: '📚', description: 'Textbooks, novels, notes' },
  { value: 'fashion', label: 'Fashion', icon: '👕', description: 'Clothes, shoes, accessories' },
  { value: 'hostel_items', label: 'Hostel Items', icon: '🏠', description: 'Bedding, cookware, decor' },
  { value: 'school_supplies', label: 'School Supplies', icon: '✏️', description: 'Stationery, tools, bags' },
  { value: 'services', label: 'Services', icon: '🔧', description: 'Tutoring, repairs, errands' },
] as const;

export const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'fairly_used', label: 'Fairly Used' },
] as const;

export const LEVELS = [100, 200, 300, 400, 500] as const;

export const DEPARTMENTS = [
  'Agricultural Economics',
  'Agricultural Extension',
  'Animal Breeding & Genetics',
  'Animal Nutrition',
  'Animal Production & Health',
  'Aquaculture & Fisheries Management',
  'Biological Sciences',
  'Chemistry',
  'Civil Engineering',
  'Communication & General Studies',
  'Computer Science',
  'Crop Protection',
  'Economics',
  'Electrical & Electronics Engineering',
  'Environmental Management & Toxicology',
  'Food Science & Technology',
  'Forestry & Wildlife Management',
  'Horticulture',
  'Mathematics',
  'Mechanical Engineering',
  'Physics',
  'Plant Breeding & Seed Technology',
  'Plant Physiology & Crop Production',
  'Soil Science & Land Management',
  'Statistics',
  'Veterinary Medicine',
  'Water Resources Management',
] as const;
