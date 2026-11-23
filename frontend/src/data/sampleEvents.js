/**
 * Realistic sample event records for the EventEase platform.
 * Used for Module 1 demonstration and UI verification.
 */
export const sampleEvents = [
  {
    id: 'evt-2026-001',
    title: 'TechNova Annual Hackathon 2026',
    department: 'Department of Computer Science & Engineering',
    category: 'Technical',
    date: 'March 28-29, 2026',
    time: '09:00 AM - 05:00 PM',
    venue: 'Campus Innovation Center, Hall A',
    shortDescription:
      'A 36-hour flagship hackathon challenging students to build impactful software solutions in artificial intelligence, cloud computing, and cybersecurity.',
    totalSpots: 200,
    registeredCount: 168,
    status: 'Open',
    featured: true,
    tags: ['Hackathon', 'AI / ML', 'Team Event']
  },
  {
    id: 'evt-2026-002',
    title: 'National Robotics & Automation Challenge',
    department: 'Department of Mechatronics & Mechanical Engineering',
    category: 'Competition',
    date: 'April 04, 2026',
    time: '10:00 AM - 04:30 PM',
    venue: 'Robotics Research Arena, Tech Block B',
    shortDescription:
      'Inter-college autonomous rover and robotic combat tournament featuring precision obstacle navigation and industrial automation problem statements.',
    totalSpots: 120,
    registeredCount: 112,
    status: 'Closing Soon',
    featured: true,
    tags: ['Robotics', 'Hardware', 'Inter-College']
  },
  {
    id: 'evt-2026-003',
    title: 'Aura Cultural Fest 2026: Symphony of Arts',
    department: 'Student Cultural Affairs & Arts Council',
    category: 'Cultural',
    date: 'April 11-12, 2026',
    time: '11:00 AM - 08:30 PM',
    venue: 'University Central Open Air Theatre',
    shortDescription:
      'The premier college cultural extravaganza featuring classical music, contemporary dance ensembles, theatrical showcases, and live battle of the bands.',
    totalSpots: 1500,
    registeredCount: 1280,
    status: 'Open',
    featured: true,
    tags: ['Cultural', 'Music & Dance', 'Campus Wide']
  },
  {
    id: 'evt-2026-004',
    title: 'Quantum Computing & AI Summit',
    department: 'IEEE Student Branch & Research Cell',
    category: 'Seminar',
    date: 'April 18, 2026',
    time: '02:00 PM - 06:00 PM',
    venue: 'Main Auditorium, Sir C.V. Raman Block',
    shortDescription:
      'Distinguished keynote addresses by industry leaders on quantum algorithm design, post-quantum cryptography, and the future of enterprise machine learning.',
    totalSpots: 350,
    registeredCount: 310,
    status: 'Open',
    featured: true,
    tags: ['Keynote', 'Research', 'Certificate Provided']
  },
  {
    id: 'evt-2026-005',
    title: 'CodeSprint: Algorithmic Contest',
    department: 'ACM Student Chapter',
    category: 'Technical',
    date: 'April 22, 2026',
    time: '04:00 PM - 07:00 PM',
    venue: 'Advanced Computing Lab 3',
    shortDescription:
      'High-speed competitive programming sprint testing data structures, dynamic programming, and algorithmic efficiency with live leaderboard tracking.',
    totalSpots: 150,
    registeredCount: 142,
    status: 'Closing Soon',
    featured: true,
    tags: ['Coding', 'Algorithms', 'Live Ranking']
  },
  {
    id: 'evt-2026-006',
    title: 'Campus Venture Pitch & Entrepreneurship Conclave',
    department: 'Innovation & Incubation Center',
    category: 'Workshop',
    date: 'April 29, 2026',
    time: '09:30 AM - 03:30 PM',
    venue: 'Management Studies Auditorium',
    shortDescription:
      'Student founders pitch startup concepts before venture investors and faculty mentors. Includes seed-funding guidance and business model canvas clinics.',
    totalSpots: 180,
    registeredCount: 95,
    status: 'Open',
    featured: true,
    tags: ['Startups', 'Pitch Fest', 'Mentorship']
  }
];

export const platformStats = [
  { value: '45+', label: 'Annual Campus Events' },
  { value: '12,500+', label: 'Registered Students' },
  { value: '100%', label: 'QR Verified Attendance' },
  { value: '24', label: 'Student Clubs & Depts' }
];

export const howItWorksSteps = [
  {
    step: '01',
    title: 'Discover Events',
    description:
      'Browse through all upcoming academic symposiums, technical hackathons, workshops, and cultural fests categorized by college departments and student societies.'
  },
  {
    step: '02',
    title: 'One-Click Registration',
    description:
      'Enroll in events instantly with your authenticated college profile. View real-time seat availability, prerequisites, and event schedules with zero friction.'
  },
  {
    step: '03',
    title: 'Receive Digital QR Pass',
    description:
      'Upon confirmation, an individual cryptographically linked digital QR pass is generated and stored securely in your EventEase account for offline access.'
  },
  {
    step: '04',
    title: 'Fast Venue Check-In',
    description:
      'Present your QR code to event administrators at venue gates for lightning-fast scanning, automated participation logging, and verified attendance records.'
  }
];

