export type ViewerTestimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  hasBadge?: boolean;
  width?: string;
};

export const viewerTestimonials: ViewerTestimonial[] = [
  {
    id: "viewer-01",
    quote: "MOVIEAI has been pure rocket fuel for our weekend film nights, instantly propelling us from endless scrolling in stock libraries to stellar realms of beautiful, cinematic storytelling.",
    author: "Arjun Billing",
    role: "Creative Director, Fold7",
    hasBadge: true,
    width: "w-[440px] md:w-[480px]",
  },
  {
    id: "viewer-02",
    quote: "I use MOVIEAI every day as a discovery tool. It has become an essential reference source. I like how intuitive the site is and the high quality of the recommendations.",
    author: "Riya Grizas",
    role: "Film Director, Primo Content",
    width: "w-[420px] md:w-[460px]",
  },
  {
    id: "viewer-03",
    quote: "I found MOVIEAI's recommendations incredibly accurate when we were curating several festival lists. It's a very useful platform for us and I would highly recommend it.",
    author: "Danielle Fox",
    role: "Creative Executive Assistant, BBH",
    width: "w-[440px] md:w-[480px]",
  },
  {
    id: "viewer-04",
    quote: "The mood filter is unreal. Instead of spending half an hour arguing over what to watch, MOVIEAI picked a slow-burn thriller that hit the spot perfectly.",
    author: "Karan Mehta",
    role: "Film Lover & Writer",
    width: "w-[420px] md:w-[450px]",
  },
  {
    id: "viewer-05",
    quote: "Because You Watched... is exactly how I find hidden gems from the 90s without getting buried under repetitive algorithms. It completely changed movie nights.",
    author: "Neha Kapoor",
    role: "Cinephile & Producer",
    hasBadge: true,
    width: "w-[440px] md:w-[470px]",
  },
  {
    id: "viewer-06",
    quote: "I don't want another endless list of popular movies. I want to find the one story I'll actually remember forever, and MOVIEAI delivers every time.",
    author: "Aditya Roy",
    role: "Independent Filmmaker",
    width: "w-[430px] md:w-[460px]",
  },
  {
    id: "viewer-07",
    quote: "It felt like having a friend who genuinely knows cinema curate a private double feature for me. The visual layout and editorial feel are unmatched.",
    author: "Maya Verma",
    role: "Indie Film Curator",
    width: "w-[440px] md:w-[480px]",
  },
  {
    id: "viewer-08",
    quote: "No clutter, no fake 5-star ratings. Just atmospheric cinema matched to my exact mood whenever I log on.",
    author: "Priya Nair",
    role: "Cinematography Admirer",
    width: "w-[410px] md:w-[450px]",
  },
];
