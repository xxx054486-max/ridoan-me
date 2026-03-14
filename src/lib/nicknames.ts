/**
 * Generate a deterministic unique nickname from a userId.
 * Uses a combination of adjectives and animals in Bengali.
 */
const adjectives = [
  "সাহসী", "চতুর", "নির্ভীক", "সৎ", "দক্ষ", "সচেতন", "বুদ্ধিমান", "সজাগ",
  "অকুতোভয়", "দৃঢ়", "সংকল্পী", "বিচক্ষণ", "অদম্য", "প্রত্যয়ী", "সাবধানী",
  "তীক্ষ্ণ", "জাগ্রত", "সক্রিয়", "নিষ্ঠাবান", "অবিচল",
];

const animals = [
  "বাঘ", "ঈগল", "সিংহ", "ময়ূর", "হরিণ", "ঘোড়া", "ডলফিন", "শকুন",
  "পেঁচা", "বাজপাখি", "চিতা", "হাতি", "নকুল", "শালিক", "কোকিল",
  "তোতা", "মাছরাঙা", "রাজহাঁস", "চিল", "বক",
];

/** Returns a deterministic Bengali nickname for a userId */
export function getNickname(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const adjIndex = Math.abs(hash) % adjectives.length;
  const animalIndex = Math.abs(hash >> 8) % animals.length;
  return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
}
